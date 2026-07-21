import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireProjectWriteAccess } from "@/lib/project-permissions";
import { completeGoal } from "@/lib/services/goals-service";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const goalRecord = await prisma.goal.findUnique({
      where: { id: params.id },
      select: { workspaceId: true, projectId: true },
    });
    if (!goalRecord) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const accessCheck = await requireProjectWriteAccess(user.id, goalRecord.projectId!, goalRecord.workspaceId);
    if (!accessCheck.allowed) {
      return NextResponse.json({ error: accessCheck.error!.message }, { status: accessCheck.error!.status });
    }

    const goal = await completeGoal(params.id);

    return NextResponse.json(goal);
  } catch (error) {
    console.error("POST /api/goals/[id]/complete error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
