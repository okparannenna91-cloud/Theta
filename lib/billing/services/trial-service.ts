import { prisma } from "@/lib/prisma";
import { addDays, addMonths, addYears, differenceInDays } from "date-fns";
import { SubscriptionStatus, BillingInterval } from "../types";
import { transition } from "../subscription-state-machine";
import { BILLING_PLAN_LOOKUP } from "@/lib/billing-plans";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

export class TrialService {
  static readonly TRIAL_DAYS = 14;

  async startTrial(workspaceId: string): Promise<void> {
    const now = new Date();
    const trialEndsAt = addDays(now, TrialService.TRIAL_DAYS);

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        subscriptionStatus: "trialing",
        trialStartedAt: now,
        trialEndsAt,
      },
    });

    await prisma.billingLog.create({
      data: {
        workspaceId,
        action: "trial_started",
        provider: "system",
      },
    });

    logger.info(`[Trial] Started for workspace ${workspaceId}, ends at ${trialEndsAt.toISOString()}`);
  }

  async isTrialExpired(workspaceId: string): Promise<boolean> {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { subscriptionStatus: true, trialEndsAt: true },
    });
    if (!workspace) throw new Error(`Workspace ${workspaceId} not found`);
    if (workspace.subscriptionStatus !== "trialing") return false;

    const now = new Date();
    return workspace.trialEndsAt ? now > workspace.trialEndsAt : false;
  }

  async getRemainingDays(workspaceId: string): Promise<number> {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { trialEndsAt: true },
    });
    if (!workspace) throw new Error(`Workspace ${workspaceId} not found`);

    const now = new Date();
    if (!workspace.trialEndsAt) return 0;
    return Math.max(0, differenceInDays(workspace.trialEndsAt, now));
  }

  async expireTrials(): Promise<number> {
    const now = new Date();
    const expired = await prisma.workspace.findMany({
      where: {
        subscriptionStatus: "trialing",
        trialEndsAt: { lte: now },
      },
    });

    let count = 0;
    for (const workspace of expired) {
      try {
        const newStatus = transition("trialing", "trial.expired") as SubscriptionStatus;

        await prisma.workspace.update({
          where: { id: workspace.id },
          data: { subscriptionStatus: newStatus },
        });

        await prisma.billingLog.create({
          data: {
            workspaceId: workspace.id,
            action: "trial_expired",
            provider: "system",
          },
        });

        count++;
        logger.info(`[Trial] Expired for workspace ${workspace.id}`);
      } catch (error) {
        logger.error(`[Trial] Failed to expire trial for workspace ${workspace.id}: ${error}`);
      }
    }

    return count;
  }

  async sendReminders(): Promise<number> {
    const now = new Date();
    let count = 0;

    const trialWorkspaces = await prisma.workspace.findMany({
      where: {
        subscriptionStatus: "trialing",
        trialEndsAt: { not: null },
      },
      include: {
        members: {
          where: { role: "owner" },
          include: { user: true },
          take: 1,
        },
      },
    });

    for (const workspace of trialWorkspaces) {
      try {
        if (!workspace.trialEndsAt) continue;
        const daysRemaining = differenceInDays(workspace.trialEndsAt, now);

        if (daysRemaining > 14 || daysRemaining < 0) continue;

        const shouldSend =
          (daysRemaining === 3 && !workspace.trialReminderSentAt) ||
          (daysRemaining === 1 && (workspace.trialReminderCount ?? 0) < 2) ||
          (daysRemaining === 0 && (workspace.trialReminderCount ?? 0) < 3);

        if (!shouldSend) continue;

        const ownerEmail = workspace.members[0]?.user?.email;
        if (!ownerEmail) continue;

        const reminderCount = (workspace.trialReminderCount ?? 0) + 1;

        await sendEmail({
          to: ownerEmail,
          subject: daysRemaining === 0
            ? "Your Theta trial has ended — choose a plan"
            : `Your Theta trial ends in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: ${daysRemaining <= 1 ? "#ef4444" : "#6366f1"};">
                ${daysRemaining === 0 ? "Trial Expired" : "Trial Ending Soon"}
              </h1>
              <p>Hello,</p>
              <p>${daysRemaining === 0
                ? "Your free trial of Theta has ended. Please select a plan to continue using your workspace."
                : `Your free trial ends in <strong>${daysRemaining} day${daysRemaining === 1 ? "" : "s"}</strong>.`}
              </p>
              <p>Choose a plan to keep your projects, tasks, and team collaboration running smoothly.</p>
              <div style="margin: 32px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing"
                   style="background-color: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                   ${daysRemaining === 0 ? "Choose a Plan" : "View Plans"}
                </a>
              </div>
            </div>
          `,
        });

        await prisma.workspace.update({
          where: { id: workspace.id },
          data: {
            trialReminderSentAt: now,
            trialReminderCount: reminderCount,
          },
        });

        count++;
        logger.info(`[Trial] Reminder sent for workspace ${workspace.id} (${daysRemaining}d remaining)`);
      } catch (error) {
        logger.error(`[Trial] Failed to send reminder for workspace ${workspace.id}: ${error}`);
      }
    }

    return count;
  }

  async convertToPaid(
    workspaceId: string,
    provider: string,
    providerCustomerId: string,
    providerSubscriptionId: string,
    planKey: string,
    interval: BillingInterval
  ): Promise<void> {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new Error(`Workspace ${workspaceId} not found`);
    if (workspace.subscriptionStatus !== "trialing") {
      throw new Error(`Cannot convert workspace ${workspaceId} with status ${workspace.subscriptionStatus}`);
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
        providerCustomerId,
        providerSubscriptionId,
        currentPeriodStart: now,
        currentPeriodEnd,
        subscribedAt: now,
      },
    });

    const plan = BILLING_PLAN_LOOKUP[planKey];
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
        providerCustomerId,
      },
    });

    await prisma.billingLog.create({
      data: {
        workspaceId,
        action: "trial_converted",
        provider,
        amount: 0,
      },
    });

    logger.info(`[Trial] Converted to paid for workspace ${workspaceId}`);
  }
}

export const trialService = new TrialService();
