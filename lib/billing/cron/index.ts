import { billingOrchestrator } from "../orchestrator";
import { CronSummary } from "../types";
import { logger } from "@/lib/logger";
import { isBillingCronEnabled } from "../cron-enabled";

export async function runBillingCron(): Promise<CronSummary> {
  if (!isBillingCronEnabled()) {
    logger.warn("[BillingCron] Skipped - billing cron disabled via BILLING_CRON_ENABLED=false (billing is required in prod — enable in production)");
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
