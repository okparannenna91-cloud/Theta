import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { getCurrentUser } = await import("@/lib/auth");
    const { verifyWorkspaceAccess, requireWorkspaceAdmin } = await import("@/lib/workspace");
    const { billingOrchestrator } = await import("@/lib/billing/orchestrator");
    const { BILLING_PLAN_LOOKUP } = await import("@/lib/billing-plans");

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { workspaceId, planId, interval } = body as {
      workspaceId: string;
      planId: string;
      interval?: "monthly" | "annual";
    };

    if (!workspaceId || !planId) {
      return NextResponse.json({ error: "workspaceId and planId required (planId: growth | pro | theta_plus)" }, { status: 400 });
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!hasAccess) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const isAdmin = await requireWorkspaceAdmin(user.id, workspaceId);
    if (!isAdmin) return NextResponse.json({ error: "Only workspace owners/admins can mock unlock" }, { status: 403 });

    const plan = BILLING_PLAN_LOOKUP[planId];
    if (!plan) return NextResponse.json({ error: `Plan not found: ${planId}` }, { status: 400 });

    const resolvedInterval = interval ?? "monthly";

    // Simulate payment success without hitting any provider - instant unlock (uses same path as webhook)
    await billingOrchestrator.handlePaymentSucceeded(
      workspaceId,
      0,
      "USD",
      `mock_${Date.now()}`,
      "mock",
      { planKey: planId, interval: resolvedInterval, source: "mock-unlock" }
    );

    return NextResponse.json({ success: true, plan: planId, interval: resolvedInterval, message: `Workspace unlocked to ${plan.name} (${resolvedInterval}) without charge` });
  } catch (error: any) {
    console.error("[MockUnlock] Error:", error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
