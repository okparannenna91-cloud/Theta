import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { SprintPlanning } from "@/lib/nova/sprint-planning";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, projectId, sprintDurationDays } = await request.json();

    if (!workspaceId || !projectId) {
      return NextResponse.json({ error: "workspaceId and projectId are required" }, { status: 400 });
    }

    const workspace = await verifyWorkspaceAccess(workspaceId, user.id);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const plan = await SprintPlanning.generateSprintPlan(
      workspaceId,
      projectId,
      sprintDurationDays || 14,
    );

    return NextResponse.json(plan);
  } catch (error: any) {
    console.error("POST /api/sprints/ai-plan error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate sprint plan" },
      { status: 500 }
    );
  }
}
