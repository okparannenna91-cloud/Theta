import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { sendActivityDigestEmail } from "@/lib/email/notification-email";

const PLAN_RETENTION_DAYS: Record<string, number> = {
  free: 30,
  growth: 90,
  pro: 365,
  theta_plus: 3650,
};

// ──────────────────────────────────────────────
//  ACTIVITY RETENTION CLEANUP (daily at 3:00 AM UTC)
// ──────────────────────────────────────────────

export const activityRetentionCleanup = inngest.createFunction(
  { id: "activity-retention-cleanup", triggers: [{ cron: "TZ(UTC) 0 3 * * *" }] },
  async ({ step }) => {
    logger.info("[Activity] Retention cleanup started");

    const workspaces = await prisma.workspace.findMany({
      select: { id: true, plan: true },
    });

    let totalDeleted = 0;

    for (const workspace of workspaces) {
      const retentionDays = PLAN_RETENTION_DAYS[workspace.plan] || 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await prisma.activity.deleteMany({
        where: {
          workspaceId: workspace.id,
          createdAt: { lt: cutoffDate },
        },
      });

      totalDeleted += result.count;
    }

    logger.info(`[Activity] Retention cleanup completed. Deleted ${totalDeleted} old activity records.`);
    return { deleted: totalDeleted };
  }
);

// ──────────────────────────────────────────────
//  ARCHIVE READ NOTIFICATIONS (daily at 4:00 AM UTC)
// ──────────────────────────────────────────────

export const archiveReadNotifications = inngest.createFunction(
  { id: "archive-read-notifications", triggers: [{ cron: "TZ(UTC) 0 4 * * *" }] },
  async ({ step }) => {
    logger.info("[Notifications] Auto-archiving read notifications");

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await prisma.notification.updateMany({
      where: {
        read: true,
        archived: false,
        updatedAt: { lt: sevenDaysAgo },
      },
      data: {
        archived: true,
      },
    });

    logger.info(`[Notifications] Auto-archived ${result.count} read notifications.`);
    return { archived: result.count };
  }
);

// ──────────────────────────────────────────────
//  ACTIVITY DIGEST EMAIL (daily at 8:00 AM UTC)
// ──────────────────────────────────────────────

export const activityDigestEmail = inngest.createFunction(
  { id: "activity-digest-email", triggers: [{ cron: "TZ(UTC) 0 8 * * *" }] },
  async ({ step }) => {
    logger.info("[Email] Activity digest email cron started");

    const workspaces = await prisma.workspace.findMany({
      select: { id: true },
      where: { billingStatus: { not: "canceled" } },
    });

    let totalSent = 0;

    for (const workspace of workspaces) {
      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId: workspace.id },
        select: { userId: true },
      });

      for (const member of members) {
        const result = await sendActivityDigestEmail(member.userId, workspace.id);
        if (result.success) totalSent++;
      }
    }

    logger.info(`[Email] Activity digest emails sent: ${totalSent}`);
    return { sent: totalSent };
  }
);
