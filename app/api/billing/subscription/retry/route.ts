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
      return NextResponse.json({ error: "Only workspace owners and admins can retry payments" }, { status: 403 });
    }

    const result = await billingOrchestrator.retryPayment(workspaceId);

    return NextResponse.json(result);
  } catch (error: any) {
    logger.error("[Retry Payment] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
