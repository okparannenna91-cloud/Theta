import { prisma } from "@/lib/prisma";
import { addHours, differenceInHours } from "date-fns";
import { DunningLevel, RetryResult, SubscriptionStatus } from "../types";
import { transition } from "../subscription-state-machine";
import { providerRegistry } from "../providers/registry";
import { getPlanPriceDynamic } from "@/lib/billing-plans";
import { logger } from "@/lib/logger";

export class DunningService {
  static readonly DUNNING_LEVELS: DunningLevel[] = [
    { level: 0, delayHours: 72, sendEmail: true, emailTemplate: "dunning_first" },
    { level: 1, delayHours: 96, sendEmail: true, emailTemplate: "dunning_second" },
    { level: 2, delayHours: 168, sendEmail: true, emailTemplate: "dunning_final" },
  ];

  static readonly MAX_DUNNING_LEVEL = 2;

  async startDunning(workspaceId: string): Promise<void> {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new Error(`Workspace ${workspaceId} not found`);
    if (workspace.subscriptionStatus !== "past_due") {
      throw new Error(`Cannot start dunning for workspace ${workspaceId} with status ${workspace.subscriptionStatus}`);
    }

    const now = new Date();
    const firstRetryAt = addHours(now, DunningService.DUNNING_LEVELS[0].delayHours);

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        dunningLevel: 0,
        dunningStartedAt: now,
        lastRetryAt: now,
        retryCount: 1,
      },
    });

    await prisma.billingLog.create({
      data: {
        workspaceId,
        action: "dunning_started",
        provider: workspace.billingProvider ?? "unknown",
        metadata: { dunningLevel: 0, nextRetryAt: firstRetryAt.toISOString() },
      },
    });

    logger.info(`[Dunning] Started for workspace ${workspaceId}, level 0, next retry at ${firstRetryAt.toISOString()}`);
  }

  async retryPayment(workspaceId: string): Promise<RetryResult> {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) throw new Error(`Workspace ${workspaceId} not found`);

    if (workspace.subscriptionStatus !== "past_due") {
      return { attempted: false, succeeded: false, status: workspace.subscriptionStatus as SubscriptionStatus };
    }

    // Skip Ivno workspaces - they require manual payment via payment URL
    // Don't auto-retry, just notify the user
    if (workspace.billingProvider === "ivno") {
      logger.info(`[Dunning] Skipping Ivno workspace ${workspaceId} - requires manual payment`);
      return {
        attempted: false,
        succeeded: false,
        status: "past_due",
        error: "Ivno requires manual payment via payment URL. Auto-retry skipped.",
      };
    }

    try {
      const provider = providerRegistry.get(workspace.billingProvider ?? "");

      const planPrice = await getPlanPriceDynamic(
        workspace.plan,
        (workspace.billingInterval as any) ?? "monthly",
        0,
        (workspace.currency as any) ?? "USD"
      );

      const chargeResult = await provider.chargeCustomer(
        workspace.providerCustomerId ?? "",
        workspace.plan === "free" ? 0 : planPrice,
        workspace.currency ?? "USD",
        { offSession: true, description: `Dunning retry #${workspace.retryCount + 1}` }
      );

      if (chargeResult.paid) {
        const newStatus = transition("past_due", "payment.succeeded") as SubscriptionStatus;
        await prisma.workspace.update({
          where: { id: workspaceId },
          data: {
            subscriptionStatus: newStatus,
            retryCount: 0,
            dunningLevel: 0,
            dunningStartedAt: null,
            lastRetryAt: null,
          },
        });

        await prisma.billingLog.create({
          data: {
            workspaceId,
            action: "dunning_retry_success",
            provider: workspace.billingProvider ?? "unknown",
            amount: chargeResult.amount,
            currency: chargeResult.currency,
            metadata: { retryCount: workspace.retryCount + 1, chargeId: chargeResult.id },
          },
        });

        logger.info(`[Dunning] Retry succeeded for workspace ${workspaceId}`);
        return { attempted: true, succeeded: true, status: newStatus, chargeResult };
      }

      return await this.escalateDunning(workspaceId, chargeResult.failureMessage);
    } catch (error: any) {
      return await this.escalateDunning(workspaceId, error.message);
    }
  }

  private async escalateDunning(workspaceId: string, errorMessage?: string): Promise<RetryResult> {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new Error(`Workspace ${workspaceId} not found`);

    const currentLevel = workspace.dunningLevel;
    const nextLevel = currentLevel + 1;

    await prisma.billingLog.create({
      data: {
        workspaceId,
        action: "dunning_retry_failed",
        provider: workspace.billingProvider ?? "unknown",
        metadata: { dunningLevel: currentLevel, error: errorMessage, retryCount: (workspace.retryCount ?? 0) + 1 },
      },
    });

    if (nextLevel > DunningService.MAX_DUNNING_LEVEL) {
      return await this.deactivateWorkspace(workspaceId);
    }

    const now = new Date();
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        dunningLevel: nextLevel,
        lastRetryAt: now,
        retryCount: { increment: 1 },
      },
    });

    logger.info(`[Dunning] Escalated workspace ${workspaceId} to level ${nextLevel}`);
    return { attempted: true, succeeded: false, status: "past_due", error: errorMessage };
  }

  private async deactivateWorkspace(workspaceId: string): Promise<RetryResult> {
    try {
      const newStatus = transition("past_due", "dunning.exhausted") as SubscriptionStatus;
      const now = new Date();
      const graceEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          subscriptionStatus: newStatus,
          dunningLevel: 0,
          dunningStartedAt: null,
          lastRetryAt: null,
          deactivatedAt: now,
          deactivationGraceEndsAt: graceEndsAt,
        },
      });

      await prisma.billingLog.create({
        data: {
          workspaceId,
          action: "dunning_exhausted_deactivated",
          provider: (await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { billingProvider: true } }))?.billingProvider ?? "unknown",
          metadata: { deactivatedAt: now.toISOString(), graceEndsAt: graceEndsAt.toISOString() },
        },
      });

      logger.info(`[Dunning] Workspace ${workspaceId} deactivated due to dunning exhaustion`);
      return { attempted: true, succeeded: false, status: newStatus, error: "All dunning retries exhausted" };
    } catch (error: any) {
      logger.error(`[Dunning] Failed to deactivate workspace ${workspaceId}: ${error}`);
      return { attempted: true, succeeded: false, status: "past_due", error: error.message };
    }
  }

  async runDunningCron(): Promise<{ processed: number; succeeded: number; deactivated: number; failed: number }> {
    const now = new Date();
    const pastDueWorkspaces = await prisma.workspace.findMany({
      where: {
        subscriptionStatus: "past_due",
        dunningStartedAt: { not: null },
      },
    });

    let processed = 0;
    let succeeded = 0;
    let deactivated = 0;
    let failed = 0;

    for (const workspace of pastDueWorkspaces) {
      // Skip Ivno workspaces entirely - they require manual payment
      if (workspace.billingProvider === "ivno") {
        logger.info(`[Dunning] Skipping Ivno workspace ${workspace.id} in cron - requires manual payment`);
        continue;
      }

      const level = workspace.dunningLevel ?? 0;
      const levelConfig = DunningService.DUNNING_LEVELS[level] ?? DunningService.DUNNING_LEVELS[DunningService.MAX_DUNNING_LEVEL];
      const lastRetry = workspace.lastRetryAt ?? workspace.dunningStartedAt;
      if (!lastRetry) continue;

      const hoursSinceLastRetry = differenceInHours(now, lastRetry);
      if (hoursSinceLastRetry < levelConfig.delayHours) continue;

      processed++;
      try {
        const result = await this.retryPayment(workspace.id);
        if (result.succeeded) succeeded++;
        else if (result.status === "deactivated") deactivated++;
        else failed++;
      } catch (error) {
        failed++;
        logger.error(`[Dunning] Cron retry failed for workspace ${workspace.id}: ${error}`);
      }
    }

    return { processed, succeeded, deactivated, failed };
  }
}

export const dunningService = new DunningService();
