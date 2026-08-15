import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

    let tasks: any[] = [];
    if (milestone && milestone.taskIds && milestone.taskIds.length > 0) {
      tasks = await prisma.task.findMany({
        where: { id: { in: milestone.taskIds } },
        select: { id: true, title: true, status: true, progress: true, dueDate: true, assigneeIds: true },
      });
    }

    const milestoneWithTasks = milestone ? { ...milestone, tasks } : null;

    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    const hasAccess = await prisma.workspaceMember.findFirst({
      where: { workspaceId: milestone.workspaceId, userId: user.id },
    });
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

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

    const addedTasks = newTaskIds.filter((t) => !oldTaskIds.includes(t));
    const removedTasks = oldTaskIds.filter((t) => !newTaskIds.includes(t));

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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete milestone error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}