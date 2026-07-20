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

    const body = await request.json();
    const { workspaceId, projectId, sprintDurationDays } = body;
    if (!workspaceId || !projectId) {
      return NextResponse.json(
        { error: "workspaceId and projectId are required" },
        { status: 400 }
      );
    }

    const access = await verifyWorkspaceAccess(workspaceId, user.id);
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const plan = await SprintPlanning.generateSprintPlan(
      workspaceId,
      projectId,
      sprintDurationDays || 14
    );
    return NextResponse.json(plan);
  } catch (error) {
    console.error("Sprint planning error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const projectId = searchParams.get("projectId");
    if (!workspaceId || !projectId) {
      return NextResponse.json(
        { error: "workspaceId and projectId are required" },
        { status: 400 }
      );
    }

    const access = await verifyWorkspaceAccess(workspaceId, user.id);
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const analysis = await SprintPlanning.analyzeBacklog(
      workspaceId,
      projectId
    );
    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Backlog analysis error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
