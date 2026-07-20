import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { RiskPredictionEngine } from "@/lib/nova/risk-prediction";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    const access = await verifyWorkspaceAccess(workspaceId, user.id);
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const includeVelocity = searchParams.get("includeVelocity") === "true";

    if (includeVelocity) {
      const velocity = await RiskPredictionEngine.calculateTeamVelocity(workspaceId);
      return NextResponse.json({ velocity });
    }

    const overview =
      await RiskPredictionEngine.getWorkspaceRiskOverview(workspaceId);
    return NextResponse.json(overview);
  } catch (error) {
    console.error("Risk prediction overview error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
