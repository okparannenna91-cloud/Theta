import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity, buildActivityMetadata } from "@/lib/activity";
import { z } from "zod";

const updateMilestoneSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  color: z.string().optional(),
  status: z.enum(["planned", "active", "completed", "cancelled"]).optional(),
  taskIds: z.array(z.string()).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, imageUrl: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    });

    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    const hasAccess = await prisma.workspaceMember.findFirst({
      where: { workspaceId: milestone.workspaceId, userId: user.id },
    });
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    let tasks: any[] = [];
    if (milestone.taskIds && milestone.taskIds.length > 0) {
      const rawTasks = await prisma.task.findMany({
        where: { id: { in: milestone.taskIds } },
        select: { id: true, title: true, status: true, statusId: true, progress: true, dueDate: true, assigneeIds: true },
      });

      const statusIds = [...new Set(rawTasks.map((t) => t.statusId).filter((id): id is string => Boolean(id)))];
      const statusRecords = statusIds.length > 0
        ? await prisma.status.findMany({ where: { id: { in: statusIds } }, select: { id: true, category: true } })
        : [];
      const categoryByStatusId = new Map(statusRecords.map((s) => [s.id, s.category]));
      const DONE_KEYWORDS = ["done", "complete", "finished", "closed", "resolved", "shipped", "approved", "archived", "merged", "delivered"];

      tasks = rawTasks.map((t) => {
        let isCompleted = false;
        const category = t.statusId ? (categoryByStatusId.get(t.statusId) || null) : null;
        if (category) {
          isCompleted = category.toUpperCase() === "DONE";
        }
        if (!isCompleted) {
          isCompleted = DONE_KEYWORDS.some((kw) => t.status.toLowerCase().includes(kw));
        }
        return { ...t, isCompleted, statusCategory: category };
      });
    }

    const milestoneWithTasks = { ...milestone, tasks };

    return NextResponse.json(milestoneWithTasks);
  } catch (error) {
    console.error("Get milestone error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const data = updateMilestoneSchema.parse(body);

    const milestone = await prisma.milestone.findUnique({ where: { id } });
    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    if (!milestone.projectId) {
      return NextResponse.json({ error: "Milestone has no project" }, { status: 400 });
    }

    const hasAccess = await prisma.projectMember.findFirst({
      where: { projectId: milestone.projectId, userId: user.id },
    });
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const oldTaskIds = milestone.taskIds;
    const newTaskIds = data.taskIds ?? oldTaskIds;

    const updateData: any = {};
    if (data.title) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
    if (data.color) updateData.color = data.color;
    if (data.status) updateData.status = data.status;
    updateData.taskIds = newTaskIds;

    const updated = await prisma.milestone.update({
      where: { id },
      data: updateData,
      include: {
        owner: { select: { id: true, name: true, imageUrl: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    });

    const addedTasks = newTaskIds.filter((t: string) => !oldTaskIds.includes(t));
    const removedTasks = oldTaskIds.filter((t: string) => !newTaskIds.includes(t));

    if (addedTasks.length > 0) {
      await prisma.task.updateMany({
        where: { id: { in: addedTasks } },
        data: { isMilestone: true },
      });
    }
    if (removedTasks.length > 0) {
      await prisma.task.updateMany({
        where: { id: { in: removedTasks } },
        data: { isMilestone: false },
      });
    }

    const changes: Record<string, { old: unknown; new: unknown }> = {};
    if (data.title && data.title !== milestone.title) changes.title = { old: milestone.title, new: data.title };
    if (data.status && data.status !== milestone.status) changes.status = { old: milestone.status, new: data.status };
    if (data.dueDate && new Date(data.dueDate).getTime() !== milestone.dueDate.getTime()) changes.dueDate = { old: milestone.dueDate.toISOString(), new: data.dueDate };

    await logActivity({
      userId: user.id,
      workspaceId: milestone.workspaceId,
      action: "UPDATED",
      entityType: "MILESTONE",
      entityId: id,
      projectId: milestone.projectId || undefined,
      metadata: buildActivityMetadata({
        entityName: updated.title,
        projectName: updated.project?.name,
        changes,
        tasksAdded: addedTasks.length,
        tasksRemoved: removedTasks.length,
      }),
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors.map((e) => e.message).join(", ") }, { status: 400 });
    }
    console.error("Update milestone error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const milestone = await prisma.milestone.findUnique({ where: { id } });
    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    if (!milestone.projectId) {
      return NextResponse.json({ error: "Milestone has no project" }, { status: 400 });
    }

    const hasAccess = await prisma.projectMember.findFirst({
      where: { projectId: milestone.projectId, userId: user.id },
    });
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (milestone.taskIds.length > 0) {
      await prisma.task.updateMany({
        where: { id: { in: milestone.taskIds } },
        data: { isMilestone: false },
      });
    }

    await prisma.milestone.delete({ where: { id } });

    await logActivity({
      userId: user.id,
      workspaceId: milestone.workspaceId,
      action: "DELETED",
      entityType: "MILESTONE",
      entityId: id,
      projectId: milestone.projectId || undefined,
      metadata: buildActivityMetadata({
        entityName: milestone.title,
        linkedTaskCount: milestone.taskIds.length,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete milestone error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}