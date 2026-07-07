import { prisma } from "@/lib/prisma";
import { addMonths, addYears } from "date-fns";
import { SubscriptionStatus, BillingInterval, ChangePlanResult } from "../types";
import { transition } from "../subscription-state-machine";
import { providerRegistry } from "../providers/registry";
import { getPlanPrice, BILLING_PLAN_LOOKUP, getPlanPriceDynamic, Currency } from "@/lib/billing-plans";
import { prorationService } from "./proration-service";
import { invoiceService } from "./invoice-service";
import { logger } from "@/lib/logger";

export class SubscriptionService {
  async activateFromTrial(
    workspaceId: string,
    provider: string,
    providerSubscriptionId: string,
    planKey: string,
    interval: BillingInterval
  ): Promise<void> {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new Error(`Workspace ${workspaceId} not found`);
    if (workspace.subscriptionStatus !== "trialing") {
      throw new Error(`Workspace ${workspaceId} is not in trialing status`);
    }

    const newStatus = transition("trialing", "payment.succeeded") as SubscriptionStatus;
    const now = new Date();
    const currentPeriodEnd = interval === "annual" ? addYears(now, 1) : addMonths(now, 1);

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        subscriptionStatus: newStatus,
        plan: planKey,
        billingInterval: interval,
        billingProvider: provider,
        providerSubscriptionId,
        currentPeriodStart: now,
        currentPeriodEnd,
        subscribedAt: now,
      },
    });

    const plan = BILLING_PLAN_LOOKUP[planKey] ?? BILLING_PLAN_LOOKUP[`${planKey}-${interval}`];
    await prisma.subscription.create({
      data: {
        workspaceId,
        planKey,
        billingInterval: interval,
        basePrice: plan?.basePriceMonthlyUSD ?? 0,
        perUserPrice: plan?.perUserPriceMonthlyUSD ?? 0,
        currency: plan?.currency ?? "USD",
        status: newStatus,
        currentPeriodStart: now,
        currentPeriodEnd,
        provider,
        providerSubscriptionId,
      },
    });

    await prisma.billingLog.create({
      data: {
        workspaceId,
        action: "subscription_activated",
        provider,
        amount: 0,
      },
    });

    logger.info(`[Subscription] Activated from trial for workspace ${workspaceId}`);
  }

  async handlePaymentSuccess(
    workspaceId: string,
    amount: number,
    currency: string,
    chargeId: string,
    provider: string,
    metadata?: Record<string, string>
  ): Promise<void> {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new Error(`Workspace ${workspaceId} not found`);

    const currentStatus = workspace.subscriptionStatus as SubscriptionStatus;
    const allowedStatuses: SubscriptionStatus[] = ["active", "past_due", "canceled", "trialing", "deactivated"];
    if (!allowedStatuses.includes(currentStatus)) {
      throw new Error(`Cannot handle payment success for workspace ${workspaceId} with status ${currentStatus}`);
    }

    let newStatus: SubscriptionStatus = "active";
    if (currentStatus === "past_due") {
      newStatus = transition("past_due", "payment.succeeded") as SubscriptionStatus;
    } else if (currentStatus === "trialing") {
      newStatus = transition("trialing", "payment.succeeded") as SubscriptionStatus;
    } else if (currentStatus === "deactivated") {
      newStatus = transition("deactivated", "payment.succeeded") as SubscriptionStatus;
    } else if (currentStatus === "canceled") {
      newStatus = transition("canceled", "payment.succeeded") as SubscriptionStatus;
    }

    const now = new Date();
    const currentPeriodEnd = workspace.billingInterval === "annual"
      ? addYears(now, 1)
      : addMonths(now, 1);

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        subscriptionStatus: newStatus,
        currentPeriodStart: now,
        currentPeriodEnd,
        retryCount: 0,
        dunningLevel: 0,
      },
    });

    await prisma.billingLog.create({
      data: {
        workspaceId,
        action: "payment_success",
        provider,
        amount,
        currency,
        metadata: metadata ? { ...metadata, chargeId } : { chargeId },
      },
    });

    logger.info(`[Subscription] Payment success for workspace ${workspaceId}: ${amount} ${currency}`);
  }

  async handlePaymentFailure(
    workspaceId: string,
    provider: string,
    error?: any
  ): Promise<void> {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new Error(`Workspace ${workspaceId} not found`);
    if (workspace.subscriptionStatus !== "active") {
      throw new Error(`Cannot handle payment failure for workspace ${workspaceId} with status ${workspace.subscriptionStatus}`);
    }

    const newStatus = transition("active", "payment.failed") as SubscriptionStatus;
    const now = new Date();

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        subscriptionStatus: newStatus,
        retryCount: 1,
        dunningLevel: 0,
        dunningStartedAt: now,
        lastRetryAt: now,
      },
    });

    await prisma.billingLog.create({
      data: {
        workspaceId,
        action: "payment_failed",
        provider,
        metadata: { error: error?.message ?? String(error) },
      },
    });

    logger.warn(`[Subscription] Payment failed for workspace ${workspaceId}: ${error?.message ?? error}`);
  }

  async cancelAtPeriodEnd(workspaceId: string, reason?: string): Promise<void> {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new Error(`Workspace ${workspaceId} not found`);
    if (workspace.subscriptionStatus !== "active") {
      throw new Error(`Cannot cancel workspace ${workspaceId} with status ${workspace.subscriptionStatus}`);
    }

    const newStatus = transition("active", "subscription.canceled") as SubscriptionStatus;
    const now = new Date();

    // Notify provider first
    if (workspace.billingProvider && workspace.providerSubscriptionId) {
      try {
        const provider = providerRegistry.get(workspace.billingProvider);
        await provider.cancelSubscription(workspace.providerSubscriptionId, { cancelAtPeriodEnd: true });
      } catch (error) {
        logger.error(`[Subscription] Provider cancel failed for workspace ${workspaceId}: ${error}`);
      }
    }

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        subscriptionStatus: newStatus,
        cancelAtPeriodEnd: true,
        canceledAt: now,
      },
    });

    await prisma.billingLog.create({
      data: {
        workspaceId,
        action: "subscription_canceled",
        provider: workspace.billingProvider ?? "unknown",
        metadata: reason ? { reason } : undefined,
      },
    });

    logger.info(`[Subscription] Canceled at period end for workspace ${workspaceId}`);
  }

  async cancelImmediately(workspaceId: string, reason?: string): Promise<void> {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new Error(`Workspace ${workspaceId} not found`);
    if (workspace.subscriptionStatus !== "active") {
      throw new Error(`Cannot cancel workspace ${workspaceId} with status ${workspace.subscriptionStatus}`);
    }

    const newStatus = transition("active", "subscription.canceled") as SubscriptionStatus;
    const now = new Date();

    // Notify provider first
    if (workspace.billingProvider && workspace.providerSubscriptionId) {
      try {
        const provider = providerRegistry.get(workspace.billingProvider);
        await provider.cancelSubscription(workspace.providerSubscriptionId, { cancelAtPeriodEnd: false });
      } catch (error) {
        logger.error(`[Subscription] Provider cancel failed for workspace ${workspaceId}: ${error}`);
      }
    }

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        subscriptionStatus: newStatus,
        cancelAtPeriodEnd: false,
        canceledAt: now,
        currentPeriodEnd: now,
      },
    });

    await prisma.billingLog.create({
      data: {
        workspaceId,
        action: "subscription_canceled_immediate",
        provider: workspace.billingProvider ?? "unknown",
        metadata: reason ? { reason } : undefined,
      },
    });

    logger.info(`[Subscription] Canceled immediately for workspace ${workspaceId}`);
  }

  async reactivate(workspaceId: string): Promise<void> {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new Error(`Workspace ${workspaceId} not found`);
    if (workspace.subscriptionStatus !== "canceled") {
      throw new Error(`Cannot reactivate workspace ${workspaceId} with status ${workspace.subscriptionStatus}`);
    }
    if (!workspace.cancelAtPeriodEnd) {
      throw new Error(`Cannot reactivate workspace ${workspaceId} - not scheduled for cancellation`);
    }

    const newStatus = transition("canceled", "subscription.reactivated") as SubscriptionStatus;

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        subscriptionStatus: newStatus,
        cancelAtPeriodEnd: false,
        canceledAt: null,
      },
    });

    await prisma.billingLog.create({
      data: {
        workspaceId,
        action: "subscription_reactivated",
        provider: workspace.billingProvider ?? "unknown",
      },
    });

    logger.info(`[Subscription] Reactivated for workspace ${workspaceId}`);
  }

  async changePlan(
    workspaceId: string,
    newPlanKey: string,
    newInterval?: BillingInterval
  ): Promise<ChangePlanResult> {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { subscription: true },
    });
    if (!workspace) throw new Error(`Workspace ${workspaceId} not found`);
    if (workspace.subscriptionStatus !== "active") {
      throw new Error(`Cannot change plan for workspace ${workspaceId} with status ${workspace.subscriptionStatus}`);
    }

    const planId = newPlanKey === "free" ? "free" : `${newPlanKey}-${newInterval ?? "monthly"}`;
    const newPlan = BILLING_PLAN_LOOKUP[planId];
    if (!newPlan) throw new Error(`Plan ${newPlanKey} not found in BILLING_PLAN_LOOKUP`);

    const memberCount = await prisma.workspaceMember.count({ where: { workspaceId } });

    const proration = prorationService.calculate(
      workspaceId,
      workspace.plan,
      newPlanKey,
      (workspace.billingInterval as BillingInterval) ?? "monthly",
      workspace.currentPeriodStart ?? new Date(),
      workspace.currentPeriodEnd ?? new Date(),
      memberCount,
      (workspace.currency as Currency) ?? "USD"
    );

    let chargeResult: any = null;
    let invoice: any = null;
    let creditNote: any = null;
    let effectiveDate: Date | null = null;

    if (proration.direction === "upgrade" && proration.chargeAmount > 0) {
      const provider = providerRegistry.get(workspace.billingProvider ?? "");
      chargeResult = await provider.chargeCustomer(
        workspace.providerCustomerId ?? "",
        proration.chargeAmount,
        workspace.currency ?? "USD",
        { description: `Plan upgrade: ${workspace.plan} → ${newPlanKey}` }
      );

      invoice = await invoiceService.createProrationInvoice(
        workspaceId,
        workspace.subscription?.id ?? "",
        workspace.plan,
        newPlanKey,
        proration.chargeAmount,
        0,
        workspace.currency ?? "USD",
        proration.prorationStart,
        proration.prorationEnd
      );

      if (chargeResult.paid && invoice) {
        await invoiceService.markPaid(invoice.id, chargeResult.id);
      }

      await prisma.workspace.update({
        where: { id: workspaceId },
        data: { plan: newPlanKey },
      });
    }

    if (proration.direction === "downgrade" && proration.creditAmount > 0) {
      effectiveDate = workspace.currentPeriodEnd ?? new Date();

      await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          scheduledPlanKey: newPlanKey,
          scheduledInterval: newInterval ?? workspace.billingInterval,
          scheduledEffectiveDate: effectiveDate,
        },
      });

      creditNote = await invoiceService.createProrationInvoice(
        workspaceId,
        workspace.subscription?.id ?? "",
        workspace.plan,
        newPlanKey,
        0,
        proration.creditAmount,
        workspace.currency ?? "USD",
        proration.prorationStart,
        proration.prorationEnd
      );
    }

    await prisma.billingLog.create({
      data: {
        workspaceId,
        action: `plan_change_${proration.direction}`,
        provider: workspace.billingProvider ?? "unknown",
        amount: proration.chargeAmount || proration.creditAmount,
        currency: workspace.currency ?? "USD",
        metadata: {
          oldPlan: workspace.plan,
          newPlan: newPlanKey,
          direction: proration.direction,
          chargeAmount: proration.chargeAmount,
          creditAmount: proration.creditAmount,
          effectiveDate: effectiveDate?.toISOString(),
        },
      },
    });

    logger.info(`[Subscription] Plan change ${proration.direction} for workspace ${workspaceId}: ${workspace.plan} → ${newPlanKey}`);

    return {
      status: "active" as SubscriptionStatus,
      direction: proration.direction,
      chargeAmount: proration.chargeAmount,
      creditAmount: proration.creditAmount,
      effectiveDate,
      invoice,
      creditNote,
    };
  }

  async getStatus(workspaceId: string): Promise<{
    status: SubscriptionStatus;
    plan: string;
    billingInterval: string | null;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    daysRemaining: number;
    cancelAtPeriodEnd: boolean;
    trialEndsAt: Date | null;
  }> {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        subscriptionStatus: true,
        plan: true,
        billingInterval: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        trialEndsAt: true,
      },
    });
    if (!workspace) throw new Error(`Workspace ${workspaceId} not found`);

    const now = new Date();
    const daysRemaining = workspace.currentPeriodEnd
      ? Math.max(0, Math.ceil((workspace.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    return {
      status: workspace.subscriptionStatus as SubscriptionStatus,
      plan: workspace.plan,
      billingInterval: workspace.billingInterval,
      currentPeriodStart: workspace.currentPeriodStart,
      currentPeriodEnd: workspace.currentPeriodEnd,
      daysRemaining,
      cancelAtPeriodEnd: workspace.cancelAtPeriodEnd,
      trialEndsAt: workspace.trialEndsAt,
    };
  }
}
