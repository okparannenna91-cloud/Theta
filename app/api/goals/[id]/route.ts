import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, requireProjectWriteAccess } from "@/lib/project-permissions";
import { getGoal, updateGoal, cancelGoal } from "@/lib/services/goals-service";

const updateGoalSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(["okr", "milestone", "target"]).optional(),
  ownerId: z.string().min(1).optional(),
  projectId: z.string().optional(),
  startDate: z.string().datetime().or(z.string().date()).optional(),
  endDate: z.string().datetime().or(z.string().date()).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const goal = await getGoal(params.id);
    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const goalRecord = await prisma.goal.findUnique({
      where: { id: params.id },
      select: { workspaceId: true, projectId: true },
    });
    if (!goalRecord) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const accessCheck = await requireProjectAccess(user.id, goalRecord.projectId!, goalRecord.workspaceId);
    if (!accessCheck.allowed) {
      return NextResponse.json({ error: accessCheck.error!.message }, { status: accessCheck.error!.status });
    }

    return NextResponse.json(goal);
  } catch (error) {
    console.error("GET /api/goals/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateGoalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
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

    const goal = await updateGoal(params.id, {
      ...parsed.data,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
    });

    try {
      const { logActivity, buildActivityMetadata } = await import("@/lib/activity");
      await logActivity({
        userId: user.id,
        workspaceId: goalRecord.workspaceId,
        action: "updated",
        entityType: "goal",
        entityId: goal.id,
        metadata: buildActivityMetadata({ entityName: goal.title }),
        projectId: goalRecord.projectId || undefined,
      });
    } catch (e) {
      console.error("Activity logging failed:", e);
    }

    return NextResponse.json(goal);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    console.error("PATCH /api/goals/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
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

    const goal = await cancelGoal(params.id);

    try {
      const { logActivity, buildActivityMetadata } = await import("@/lib/activity");
      await logActivity({
        userId: user.id,
        workspaceId: goalRecord.workspaceId,
        action: "cancelled",
        entityType: "goal",
        entityId: goal.id,
        metadata: buildActivityMetadata({ entityName: goal.title }),
        projectId: goalRecord.projectId || undefined,
      });
    } catch (e) {
      console.error("Activity logging failed:", e);
    }

    return NextResponse.json(goal);
  } catch (error) {
    console.error("DELETE /api/goals/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
