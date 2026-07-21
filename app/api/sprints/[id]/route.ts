import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, requireProjectWriteAccess } from "@/lib/project-permissions";

const updateSprintSchema = z.object({
  name: z.string().min(1).optional(),
  goal: z.string().optional(),
  startDate: z.string().datetime().or(z.string().date()).optional(),
  endDate: z.string().datetime().or(z.string().date()).optional(),
  status: z.enum(["PLANNING", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
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

    const sprint = await prisma.sprint.findUnique({ where: { id: params.id } });
    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    const accessCheck = await requireProjectAccess(user.id, sprint.projectId, sprint.workspaceId);
    if (!accessCheck.allowed) {
      return NextResponse.json({ error: accessCheck.error!.message }, { status: accessCheck.error!.status });
    }

    return NextResponse.json(sprint);
  } catch (error) {
    console.error("GET /api/sprints/[id] error:", error);
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
    const parsed = updateSprintSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.sprint.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    const accessCheck = await requireProjectWriteAccess(user.id, existing.projectId, existing.workspaceId);
    if (!accessCheck.allowed) {
      return NextResponse.json({ error: accessCheck.error!.message }, { status: accessCheck.error!.status });
    }

    const updateData: Record<string, unknown> = { ...parsed.data };
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate as string);
    }
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate as string);
    }

    const sprint = await prisma.sprint.update({
      where: { id: params.id },
      data: updateData,
    });

    try {
      const { logActivity, buildActivityMetadata } = await import("@/lib/activity");
      await logActivity({
        userId: user.id,
        workspaceId: existing.workspaceId,
        action: "updated",
        entityType: "sprint",
        entityId: sprint.id,
        metadata: buildActivityMetadata({ entityName: sprint.name }),
        projectId: existing.projectId,
      });
    } catch (e) {
      console.error("Activity logging failed:", e);
    }

    // Trigger Automations for sprint status transitions
    if (parsed.data.status && parsed.data.status !== existing.status) {
      try {
        const { processAutomations } = await import("@/lib/automations/engine");
        const ctx = { projectId: existing.projectId, userId: user.id, sprintId: params.id };

        if (parsed.data.status === "ACTIVE" && existing.status !== "ACTIVE") {
          await processAutomations(existing.workspaceId, "SPRINT_STARTED", ctx);
        }
        if (parsed.data.status === "COMPLETED" && existing.status !== "COMPLETED") {
          await processAutomations(existing.workspaceId, "SPRINT_COMPLETED", ctx);
        }
      } catch (automationError) {
        console.error("Failed to trigger automations on sprint update:", automationError);
      }
    }

    return NextResponse.json(sprint);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    console.error("PATCH /api/sprints/[id] error:", error);
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

    const existing = await prisma.sprint.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    const accessCheck = await requireProjectWriteAccess(user.id, existing.projectId, existing.workspaceId);
    if (!accessCheck.allowed) {
      return NextResponse.json({ error: accessCheck.error!.message }, { status: accessCheck.error!.status });
    }

    try {
      const { logActivity, buildActivityMetadata } = await import("@/lib/activity");
      await logActivity({
        userId: user.id,
        workspaceId: existing.workspaceId,
        action: "deleted",
        entityType: "sprint",
        entityId: existing.id,
        metadata: buildActivityMetadata({ entityName: existing.name }),
        projectId: existing.projectId,
      });
    } catch (e) {
      console.error("Activity logging failed:", e);
    }

    await prisma.sprint.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/sprints/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
