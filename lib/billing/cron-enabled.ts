/**
 * Billing cron is optional — app should run fine without CRON_SECRET.
 * Enable explicitly with BILLING_CRON_ENABLED=true (and CRON_SECRET set).
 * Disable with BILLING_CRON_ENABLED=false or DISABLE_BILLING_CRON=true.
 * Default: enabled only when CRON_SECRET is configured (preserves existing prod behavior).
 */
export function isBillingCronEnabled(): boolean {
  if (process.env.DISABLE_BILLING_CRON === "true") return false;
  if (process.env.BILLING_CRON_ENABLED === "false") return false;
  if (process.env.BILLING_CRON_ENABLED === "true") return true;
  return !!process.env.CRON_SECRET;
}
