import { prisma } from "@/lib/prisma";
import { addYears, addMonths } from "date-fns";
import { SubscriptionService } from "./services/subscription-service";
import { InvoiceService } from "./services/invoice-service";
import { DunningService } from "./services/dunning-service";
import { TrialService } from "./services/trial-service";
import { registerProviders } from "./providers/register";
import { CronSummary, BillingInterval } from "./types";
import { transition } from "./subscription-state-machine";
import { providerRegistry } from "./providers/registry";
import { getPlanPriceDynamic, BILLING_PLANS, BILLING_PLAN_LOOKUP } from "@/lib/billing-plans";
import { logger } from "@/lib/logger";

registerProviders();

class BillingOrchestrator {
  private subscriptionService: SubscriptionService;
  private invoiceService: InvoiceService;
  private dunningService: DunningService;
  private trialService: TrialService;

  constructor() {
    this.subscriptionService = new SubscriptionService();
    this.invoiceService = new InvoiceService();
    this.dunningService = new DunningService();
    this.trialService = new TrialService();
  }

  async createCheckout(params: {
    workspaceId: string;
    planId: string;
    interval: "monthly" | "annual";
    currency: string;
    userId: string;
    userEmail: string;
    memberCount: number;
    successUrl: string;
    cancelUrl: string;
    provider?: string;
  }) {
    const plan = BILLING_PLAN_LOOKUP[params.planId];
    if (!plan) throw new Error(`Plan not found: ${params.planId}`);

    const workspace = await prisma.workspace.findUnique({
      where: { id: params.workspaceId },
      select: { providerCustomerId: true, billingProvider: true },
    });

    let provider: import("./billing-provider.interface").BillingProvider;
    if (params.provider) {
      provider = providerRegistry.get(params.provider);
    } else if (workspace?.billingProvider) {
      const existingProvider = providerRegistry.get(workspace.billingProvider);
      if (existingProvider.currencies.includes(params.currency as any)) {
        provider = existingProvider;
      } else {
        const providers = providerRegistry.getForCurrency(params.currency as any);
        if (providers.length === 0) {
          throw new Error(`No payment provider available for ${params.currency}`);
        }
        provider = providers[0];
      }
    } else {
      const providers = providerRegistry.getForCurrency(params.currency as any);
      if (providers.length === 0) {
        throw new Error(`No payment provider available for ${params.currency}`);
      }
      provider = providers[0];
    }

    const price = await getPlanPriceDynamic(
      params.planId,
      params.interval,
      params.memberCount,
      params.currency as any
    );

    let customerId = workspace?.providerCustomerId;
    if (!customerId) {
      const customer = await provider.createCustomer(params.userEmail, undefined, {
        workspaceId: params.workspaceId,
      });
      customerId = customer.id;
      await prisma.workspace.update({
        where: { id: params.workspaceId },
        data: { providerCustomerId: customerId, billingProvider: provider.id },
      });
    }

    const result = await provider.createCheckoutSession({
      customerId,
      customerEmail: params.userEmail,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      lineItems: [
        {
          amount: price,
          currency: params.currency,
          quantity: 1,
          description: `${plan.name} - ${params.interval}`,
          planKey: params.planId,
          interval: params.interval,
        },
      ],
      mode: "subscription",
      metadata: {
        workspaceId: params.workspaceId,
        planKey: params.planId,
        interval: params.interval,
      },
    });

    return { url: result.url, sessionId: result.sessionId };
  }

  async handlePaymentSucceeded(workspaceId: string, amount: number, currency: string, chargeId: string, provider: string, metadata?: Record<string, string>) {
    await this.subscriptionService.handlePaymentSuccess(workspaceId, amount, currency, chargeId, provider, metadata);
  }

  async handlePaymentFailed(workspaceId: string, provider: string, error?: any) {
    await this.subscriptionService.handlePaymentFailure(workspaceId, provider, error);
  }

  async cancelSubscription(workspaceId: string, immediate: boolean, reason?: string) {
    if (immediate) {
      await this.subscriptionService.cancelImmediately(workspaceId, reason);
    } else {
      await this.subscriptionService.cancelAtPeriodEnd(workspaceId, reason);
    }
  }

  async reactivateSubscription(workspaceId: string) {
    await this.subscriptionService.reactivate(workspaceId);
  }

  async changePlan(workspaceId: string, newPlanKey: string, newInterval?: BillingInterval) {
    await this.subscriptionService.changePlan(workspaceId, newPlanKey, newInterval);
  }

  async retryPayment(workspaceId: string) {
    return this.dunningService.retryPayment(workspaceId);
  }

  async runBillingCron(): Promise<CronSummary> {
    const dunningResult = await this.dunningService.runDunningCron();
    const trialExpired = await this.trialService.expireTrials();
    const subsExpired = await this.expireCanceledSubscriptions();
    const downgradesProcessed = await this.processScheduledDowngrades();
    const dataRetentionCleaned = await this.cleanupExpiredDataRetention();

    return {
      dunning: dunningResult,
      trialExpiration: trialExpired,
      subscriptionExpiration: subsExpired + downgradesProcessed,
      dataRetentionCleaned,
    };
  }

  async expireCanceledSubscriptions(): Promise<number> {
    const now = new Date();
    const workspaces = await prisma.workspace.findMany({
      where: {
        subscriptionStatus: "canceled",
        cancelAtPeriodEnd: true,
        currentPeriodEnd: { lt: now },
      },
    });

    let count = 0;
    for (const workspace of workspaces) {
      try {
        const nextStatus = transition("canceled", "subscription.expired") as any;
        await prisma.workspace.update({
          where: { id: workspace.id },
          data: { subscriptionStatus: nextStatus, cancelAtPeriodEnd: false },
        });
        await prisma.billingLog.create({
          data: {
            workspaceId: workspace.id,
            action: "subscription.expired",
            provider: "system",
            metadata: { previousStatus: "canceled", newStatus: nextStatus },
          },
        });
        count++;
      } catch (error) {
        logger.error(`[Billing] Failed to expire subscription for workspace ${workspace.id}: ${error}`);
      }
    }

    return count;
  }

  async processScheduledDowngrades(): Promise<number> {
    const now = new Date();
    const workspaces = await prisma.workspace.findMany({
      where: {
        subscriptionStatus: "active",
        scheduledPlanKey: { not: null },
        scheduledEffectiveDate: { lte: now },
      },
    });

    let count = 0;
    for (const workspace of workspaces) {
      try {
        const newPlanKey = workspace.scheduledPlanKey!;
        const newInterval = workspace.scheduledInterval ?? workspace.billingInterval;

        await prisma.workspace.update({
          where: { id: workspace.id },
          data: {
            plan: newPlanKey,
            billingInterval: newInterval,
            scheduledPlanKey: null,
            scheduledInterval: null,
            scheduledEffectiveDate: null,
          },
        });

        await prisma.billingLog.create({
          data: {
            workspaceId: workspace.id,
            action: "plan_downgrade_scheduled",
            provider: workspace.billingProvider ?? "system",
            metadata: {
              oldPlan: workspace.plan,
              newPlan: newPlanKey,
              effectiveDate: workspace.scheduledEffectiveDate?.toISOString(),
            },
          },
        });

        count++;
        logger.info(`[Billing] Scheduled downgrade applied for workspace ${workspace.id}: ${workspace.plan} → ${newPlanKey}`);
      } catch (error) {
        logger.error(`[Billing] Failed to process scheduled downgrade for workspace ${workspace.id}: ${error}`);
      }
    }

    return count;
  }

  async cleanupExpiredDataRetention(): Promise<number> {
    const now = new Date();
    const workspaces = await prisma.workspace.findMany({
      where: {
        subscriptionStatus: "deactivated",
        dataRetentionUntil: { lte: now },
      },
    });

    let count = 0;
    for (const workspace of workspaces) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.billingLog.deleteMany({ where: { workspaceId: workspace.id } });
          await tx.invoice.deleteMany({ where: { workspaceId: workspace.id } });
          await tx.paymentMethod.deleteMany({ where: { workspaceId: workspace.id } });
          await tx.billingEvent.deleteMany({ where: { workspaceId: workspace.id } });
          await tx.creditBalance.deleteMany({ where: { workspaceId: workspace.id } });
          const sub = await tx.subscription.findFirst({ where: { workspaceId: workspace.id } });
          if (sub) {
            await tx.invoice.deleteMany({ where: { subscriptionId: sub.id } });
          }
          await tx.subscription.deleteMany({ where: { workspaceId: workspace.id } });
        });

        logger.info(`[Billing] Data retention cleanup for workspace ${workspace.id}`);
        count++;
      } catch (error) {
        logger.error(`[Billing] Failed to cleanup data retention for workspace ${workspace.id}: ${error}`);
      }
    }

    return count;
  }

  async startTrial(workspaceId: string) {
    await this.trialService.startTrial(workspaceId);
  }
}

export const billingOrchestrator = new BillingOrchestrator();
