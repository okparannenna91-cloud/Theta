import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess, requireWorkspaceAdmin } from "@/lib/workspace";
import { billingOrchestrator } from "@/lib/billing/orchestrator";
import { providerRegistry } from "@/lib/billing/providers/registry";
import { BILLING_PLAN_LOOKUP } from "@/lib/billing-plans";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { workspaceId, planId, interval, currency, memberCount } = body as {
      workspaceId: string;
      planId: string;
      interval: "monthly" | "annual";
      currency: string;
      memberCount?: number;
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

    // Validate that at least one provider supports the requested currency
    const providersForCurrency = providerRegistry.getForCurrency(resolvedCurrency as any);
    if (providersForCurrency.length === 0) {
      return NextResponse.json({ error: `No payment provider available for currency: ${resolvedCurrency}` }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const resolvedMemberCount = memberCount ?? 0;

    const result = await billingOrchestrator.createCheckout({
      workspaceId,
      planId,
      interval,
      currency: resolvedCurrency,
      userId: user.id,
      userEmail: user.email,
      memberCount: resolvedMemberCount,
      successUrl: `${baseUrl}/dashboard/billing?payment=success`,
      cancelUrl: `${baseUrl}/dashboard/billing?payment=cancelled`,
    });

    return NextResponse.json({ url: result.url, sessionId: result.sessionId });
  } catch (error: any) {
    logger.error("[Checkout] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
