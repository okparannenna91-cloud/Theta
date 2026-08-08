import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const interval = searchParams.get("interval") ?? "monthly";
    const currency = searchParams.get("currency") ?? "USD";

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const { getCurrentUser } = await import("@/lib/auth");
    const { verifyWorkspaceAccess } = await import("@/lib/workspace");
    const { getPlanPriceDynamic, BILLING_PLANS } = await import("@/lib/billing-plans");
    const { prisma } = await import("@/lib/prisma");

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const memberCount = await prisma.workspaceMember.count({ where: { workspaceId } });

    const prices: Record<string, number> = {};
    for (const plan of BILLING_PLANS) {
      prices[plan.id] = await getPlanPriceDynamic(plan.id, interval as any, memberCount, currency as any);
    }

    return NextResponse.json({ prices, currency, interval, memberCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
