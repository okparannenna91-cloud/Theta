import { inngest } from "@/lib/inngest/client";
import { dunningService } from "@/lib/billing/services/dunning-service";
import { trialService } from "@/lib/billing/services/trial-service";
import { billingOrchestrator } from "@/lib/billing/orchestrator";
import { registerProviders } from "@/lib/billing/providers/register";
import { logger } from "@/lib/logger";

registerProviders();

export const dunningCron = inngest.createFunction(
  { id: "billing-dunning-cron", triggers: [{ cron: "TZ(UTC) */6 * * *" }] },
  async ({ step }) => {
    logger.info("[Inngest] Dunning cron started");
    const summary = await dunningService.runDunningCron();
    logger.info("[Inngest] Dunning cron completed", JSON.stringify(summary));
    return summary;
  }
);

export const trialExpirationCron = inngest.createFunction(
  { id: "billing-trial-expiration", triggers: [{ cron: "TZ(UTC) 0 2 * * *" }] },
  async ({ step }) => {
    logger.info("[Inngest] Trial expiration cron started");
    const count = await trialService.expireTrials();
    logger.info("[Inngest] Trial expiration completed", { expired: count });
    return { expired: count };
  }
);

export const trialReminderCron = inngest.createFunction(
  { id: "billing-trial-reminder", triggers: [{ cron: "TZ(UTC) 0 8 * * *" }] },
  async ({ step }) => {
    logger.info("[Inngest] Trial reminder cron started");
    const count = await trialService.sendReminders();
    logger.info("[Inngest] Trial reminder completed", { remindersSent: count });
    return { remindersSent: count };
  }
);

export const subscriptionExpirationCron = inngest.createFunction(
  { id: "billing-sub-expiration", triggers: [{ cron: "TZ(UTC) 0 3 * * *" }] },
  async ({ step }) => {
    logger.info("[Inngest] Subscription expiration cron started");
    const count = await billingOrchestrator.expireCanceledSubscriptions();
    logger.info("[Inngest] Subscription expiration completed", { expired: count });
    return { expired: count };
  }
);

export const downgradeSchedulingCron = inngest.createFunction(
  { id: "billing-downgrade-scheduling", triggers: [{ cron: "TZ(UTC) 0 4 * * *" }] },
  async ({ step }) => {
    logger.info("[Inngest] Downgrade scheduling cron started");
    const count = await billingOrchestrator.processScheduledDowngrades();
    logger.info("[Inngest] Downgrade scheduling completed", { processed: count });
    return { processed: count };
  }
);

export const dataRetentionCleanup = inngest.createFunction(
  { id: "billing-data-retention", triggers: [{ cron: "TZ(UTC) 0 5 * * *" }] },
  async ({ step }) => {
    logger.info("[Inngest] Data retention cleanup started");
    const count = await billingOrchestrator.cleanupExpiredDataRetention();
    logger.info("[Inngest] Data retention cleanup completed", { purged: count });
    return { purged: count };
  }
);
