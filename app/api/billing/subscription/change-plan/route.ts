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
    const { workspaceId, newPlanKey, newInterval } = body as {
      workspaceId: string;
      newPlanKey: string;
      newInterval?: "monthly" | "annual";
    };

    if (!workspaceId || !newPlanKey) {
      return NextResponse.json({ error: "workspaceId and newPlanKey are required" }, { status: 400 });
    }

    const result = await billingOrchestrator.changePlan(workspaceId, newPlanKey, newInterval);

    return NextResponse.json(result);
  } catch (error: any) {
    logger.error("[Change Plan] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
