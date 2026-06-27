import { billingOrchestrator } from "../orchestrator";
import { CronSummary } from "../types";
import { logger } from "@/lib/logger";

export async function runBillingCron(): Promise<CronSummary> {
  logger.info("[BillingCron] Starting unified billing cron...");
  const summary = await billingOrchestrator.runBillingCron();
  logger.info("[BillingCron] Completed:", JSON.stringify(summary));
  return summary;
}
