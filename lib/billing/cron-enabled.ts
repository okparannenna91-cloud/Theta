/**
 * Billing is NOT optional — cron must run in prod for renewals/dunning/trials.
 * Only disable explicitly for local dev with BILLING_CRON_ENABLED=false.
 * Default: enabled (requires CRON_SECRET).
 */
export function isBillingCronEnabled(): boolean {
  if (process.env.DISABLE_BILLING_CRON === "true") return false;
  if (process.env.BILLING_CRON_ENABLED === "false") return false;
  return true;
}
