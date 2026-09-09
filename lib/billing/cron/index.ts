import { billingOrchestrator } from "../orchestrator";
import { CronSummary } from "../types";
import { logger } from "@/lib/logger";
import { isBillingCronEnabled } from "../cron-enabled";

export async function runBillingCron(): Promise<CronSummary> {
  if (!isBillingCronEnabled()) {
    logger.info("[BillingCron] Skipped - billing cron disabled (BILLING_CRON_ENABLED=false or no CRON_SECRET)");
    return {
      dunning: { processed: 0, succeeded: 0, failed: 0 } as any,
      renewals: { processed: 0, succeeded: 0, failed: 0 },
      trialExpiration: 0,
      subscriptionExpiration: 0,
      dataRetentionCleaned: 0,
    };
  }
  logger.info("[BillingCron] Starting unified billing cron...");
  const summary = await billingOrchestrator.runBillingCron();
  logger.info("[BillingCron] Completed:", JSON.stringify(summary));
  return summary;
}
