import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess, requireWorkspaceAdmin } from "@/lib/workspace";
import { billingOrchestrator } from "@/lib/billing/orchestrator";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { workspaceId } = body as { workspaceId: string };

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const isAdmin = await requireWorkspaceAdmin(user.id, workspaceId);
    if (!isAdmin) {
      return NextResponse.json({ error: "Only workspace owners and admins can reactivate subscriptions" }, { status: 403 });
    }

    await billingOrchestrator.reactivateSubscription(workspaceId);

    return NextResponse.json({ status: "active", cancelAtPeriodEnd: false });
  } catch (error: any) {
    logger.error("[Reactivate Subscription] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
