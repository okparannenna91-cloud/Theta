import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
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

    const result = await billingOrchestrator.retryPayment(workspaceId);

    return NextResponse.json(result);
  } catch (error: any) {
    logger.error("[Retry Payment] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
