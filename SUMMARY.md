## Objective
Ensure the billing checkout flow works reliably for both USD and NGN payments, with correct provider selection regardless of runtime environment configuration.

## Important Details
- **Env var not available at runtime:** `GET /api/billing/checkout` confirmed `flutterwaveKey: false` in Vercel Production, even though `FLUTTERWAVE_SECRET_KEY` is set in Vercel dashboard (Production, no typos). Same key works locally from `.env.local`. Root cause still unconfirmed — possible that env var was set after last deploy.

- **Provider registration (`lib/billing/providers/register.ts`):** Paystack (["NGN"]) and Ivno (["USD","EUR","GBP"]) always registered. Flutterwave (["USD","EUR","GBP"]) registered only if `process.env.FLUTTERWAVE_SECRET_KEY` is truthy. Previously had a `registered` flag that prevented re-checking the env var — **removed** now, so `registerProviders()` is idempotent via `providerRegistry.has()` and re-checks `process.env` on every call.

- **Checkout route handler (`app/api/billing/checkout/route.ts`):** Now calls `registerProviders()` explicitly at request time. If explicit provider isn't in `providerRegistry`, sets `resolvedProvider = undefined` so orchestrator picks the workspace's existing provider or first available for the currency.

- **Orchestrator currency validation (`lib/billing/orchestrator.ts:52-62`):** When falling back to `workspace.billingProvider`, checks `existingProvider.currencies.includes(params.currency)` — if workspace's stored provider (e.g. "paystack") doesn't support requested currency (e.g. "USD"), falls through to first available provider for that currency. Prevents Paystack being used for USD.

- **Module-level to constructor:** Moved `registerProviders()` from module top-level to `BillingOrchestrator` constructor for late initialization.

## Work State
- Completed:
  - CSP `worker-src blob:` fix ✅
  - Ably `connect-src` fix (added `*.ably.net`, `*.ably-realtime.com`) — Ably Connected confirmed ✅
  - Vercel live feedback CSP fix (`script-src-elem` + `vercel.live`) ✅
  - `afterSignInUrl` deprecation — added `forceRedirectUrl` to `SignUpButton` ✅
  - Billing route 404 — changed all 11 `/dashboard/billing` refs to `/billing` ✅
  - Checkout 400 error — added graceful fallback when explicit provider not registered ✅
  - Orchestrator currency validation — workspace `billingProvider` checked for currency compatibility before use ✅
  - Removed `registered` flag from `registerProviders()` so env var re-checked on every invocation ✅
  - Moved `registerProviders()` from module top-level to constructor ✅
  - Added explicit `registerProviders()` call in checkout route handler ✅
- Active: (none)
- Blocked: Flutterwave card payment not available because `FLUTTERWAVE_SECRET_KEY` not visible at runtime in Vercel Production. This push removes the `registered` guard so a fresh deploy is needed to test.

## Next Move
1. **Redeploy to Vercel** (this latest commit changes how providers are registered)
2. Test: open billing modal → USD should show Flutterwave AND Ivno options
3. If Flutterwave still missing, confirm env var is truly available:
   - Go to Vercel dashboard → Project → Settings → Environment Variables
   - Confirm `FLUTTERWAVE_SECRET_KEY` exists for **Production** target
   - Remove and re-add it (copy to clipboard first)
   - Redeploy again from Vercel dashboard
   - Check `GET /api/billing/checkout` for `flutterwaveKey: true`
