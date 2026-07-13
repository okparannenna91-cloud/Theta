import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const planId = searchParams.get("planId");
    const interval = searchParams.get("interval");
    const currency = searchParams.get("currency") ?? "USD";

    if (!workspaceId || !planId || !interval) {
      return NextResponse.json({ error: "workspaceId, planId, and interval are required" }, { status: 400 });
    }

    const { getCurrentUser } = await import("@/lib/auth");
    const { verifyWorkspaceAccess } = await import("@/lib/workspace");
    const { getPlanPriceDynamic, BILLING_PLAN_LOOKUP } = await import("@/lib/billing-plans");
    const { prisma } = await import("@/lib/prisma");

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const plan = BILLING_PLAN_LOOKUP[planId];
    if (!plan) {
      return NextResponse.json({ error: `Plan not found: ${planId}` }, { status: 400 });
    }

    const memberCount = await prisma.workspaceMember.count({ where: { workspaceId } });
    const basePrice = plan.basePriceMonthlyUSD;
    const perUserPrice = plan.perUserPriceMonthlyUSD;
    const userCharge = memberCount * perUserPrice;
    const totalAmount = await getPlanPriceDynamic(planId, interval as any, memberCount, currency as any);

    return NextResponse.json({
      basePrice,
      perUserPrice,
      memberCount,
      userCharge,
      totalAmount,
      currency,
      interval,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
