import { NextResponse } from "next/server";

export async function GET() {
  const { providerRegistry } = await import("@/lib/billing/providers/registry");
  const { registerProviders } = await import("@/lib/billing/providers/register");
  registerProviders();

  const fwKey = process.env.FLUTTERWAVE_SECRET_KEY;
  const fwDefined = fwKey !== undefined;
  const fwNull = fwKey === null;
  const fwType = typeof fwKey;
  const fwLen = fwKey?.length ?? -1;
  const fwEmptyString = fwKey === "";
  const fwFirstChar = fwKey && fwKey.length > 0 ? fwKey.charCodeAt(0) : null;
  const allEnvKeys = Object.keys(process.env).sort();

  const flutterwaveKeys = allEnvKeys.filter(k => k.toLowerCase().includes("flutter") || k.toLowerCase().includes("flw"));

  return NextResponse.json({
    env: {
      FLUTTERWAVE_SECRET_KEY: {
        defined: fwDefined,
        null: fwNull,
        type: fwType,
        length: fwLen,
        emptyString: fwEmptyString,
        firstCharCode: fwFirstChar,
      },
      VERCEL_ENV: process.env.VERCEL_ENV ?? null,
      VERCEL_URL: process.env.VERCEL_URL ?? null,
      VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      NODE_ENV: process.env.NODE_ENV ?? null,
      NEXT_RUNTIME: typeof (process as any).nextRuntime !== "undefined" ? (process as any).nextRuntime : null,
    },
    flutterwaveRelatedKeys: flutterwaveKeys.map(k => ({ key: k, len: ((process.env as any)[k] || "").length })),
    allEnvKeyCount: allEnvKeys.length,
    allEnvKeySample: allEnvKeys.slice(0, 50),
    registry: {
      flutterwaveRegistered: providerRegistry.has("flutterwave"),
      allProviders: providerRegistry.getAll().map(p => ({ id: p.id, currencies: p.currencies, name: p.name })),
    },
    codePaths: {
      currenciesGetter: "lib/billing/providers/flutterwave-provider.ts:14",
      flwFetchCheck: "lib/billing/providers/flutterwave-provider.ts:291-292",
      registration: "lib/billing/providers/register.ts:8",
      routeValidation: "app/api/billing/checkout/route.ts:64-72",
    },
  });
}

export async function POST(req: Request) {
  try {
    const { getCurrentUser } = await import("@/lib/auth");
    const { verifyWorkspaceAccess, requireWorkspaceAdmin } = await import("@/lib/workspace");
    const { billingOrchestrator } = await import("@/lib/billing/orchestrator");
    const { providerRegistry } = await import("@/lib/billing/providers/registry");
    const { registerProviders } = await import("@/lib/billing/providers/register");
    registerProviders();
    const { BILLING_PLAN_LOOKUP } = await import("@/lib/billing-plans");
    const { logger } = await import("@/lib/logger");

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { workspaceId, planId, interval, currency, memberCount, provider: explicitProvider } = body as {
      workspaceId: string;
      planId: string;
      interval: "monthly" | "annual";
      currency: string;
      memberCount?: number;
      provider?: string;
    };

    if (!workspaceId || !planId || !interval) {
      return NextResponse.json({ error: "workspaceId, planId, and interval are required" }, { status: 400 });
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const isAdmin = await requireWorkspaceAdmin(user.id, workspaceId);
    if (!isAdmin) {
      return NextResponse.json({ error: "Only workspace owners and admins can manage billing" }, { status: 403 });
    }

    const plan = BILLING_PLAN_LOOKUP[planId];
    if (!plan) {
      return NextResponse.json({ error: `Plan not found: ${planId}` }, { status: 400 });
    }

    const resolvedCurrency = currency ?? "USD";
    let resolvedProvider = explicitProvider;
    if (resolvedProvider) {
      if (!providerRegistry.has(resolvedProvider)) {
        resolvedProvider = undefined;
      } else {
        const prov = providerRegistry.get(resolvedProvider);
        if (!prov.currencies.includes(resolvedCurrency as any)) {
          resolvedProvider = undefined;
        }
      }
    }
    if (!resolvedProvider) {
      const providersForCurrency = providerRegistry.getForCurrency(resolvedCurrency as any);
      if (providersForCurrency.length === 0) {
        return NextResponse.json({ error: `No payment provider available for currency: ${resolvedCurrency}` }, { status: 400 });
      }
    }

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
    const resolvedMemberCount = memberCount ?? 0;

    const result = await billingOrchestrator.createCheckout({
      workspaceId,
      planId,
      interval,
      currency: resolvedCurrency,
      userId: user.id,
      userEmail: user.email,
      memberCount: resolvedMemberCount,
      successUrl: `${baseUrl}/billing?payment=success`,
      cancelUrl: `${baseUrl}/billing?payment=cancelled`,
      provider: resolvedProvider,
    });

    return NextResponse.json({ url: result.url, sessionId: result.sessionId });
  } catch (error: any) {
    const logger = await import("@/lib/logger").then(m => m.logger).catch(() => null);
    if (logger) logger.error("[Checkout] Error:", error);
    else console.error("[Checkout] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
