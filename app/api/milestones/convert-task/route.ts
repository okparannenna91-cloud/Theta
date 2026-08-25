import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity, buildActivityMetadata } from "@/lib/activity";
import { z } from "zod";

const convertSchema = z.object({
  taskId: z.string(),
  projectId: z.string().optional(),
  color: z.string().optional(),
  description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = convertSchema.parse(body);

    const task = await prisma.task.findUnique({
      where: { id: data.taskId },
      select: { id: true, title: true, description: true, dueDate: true, projectId: true, workspaceId: true, status: true, priority: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const hasAccess = await prisma.projectMember.findFirst({
      where: { projectId: task.projectId, userId: user.id },
    });
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!task.dueDate) {
      return NextResponse.json({ error: "Task must have a due date to convert to milestone" }, { status: 400 });
    }

    const projectId = data.projectId || task.projectId;

    const milestone = await prisma.milestone.create({
      data: {
        title: data.description || task.title,
        description: data.description || `Converted from task: ${task.title}`,
        projectId,
        workspaceId: task.workspaceId,
        ownerId: user.id,
        dueDate: task.dueDate,
        color: data.color || "#f59e0b",
        status: "planned",
        taskIds: [task.id],
      },
      include: {
        owner: { select: { id: true, name: true, imageUrl: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    });

    await prisma.task.update({
      where: { id: task.id },
      data: { isMilestone: true },
    });

    await logActivity({
      userId: user.id,
      workspaceId: task.workspaceId,
      action: "CREATED",
      entityType: "MILESTONE",
      entityId: milestone.id,
      projectId,
      metadata: buildActivityMetadata({
        entityName: milestone.title,
        projectName: milestone.project?.name,
        convertedFromTaskId: task.id,
        convertedFromTaskTitle: task.title,
      }),
    });

    return NextResponse.json(milestone);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors.map((e) => e.message).join(", ") }, { status: 400 });
    }
    console.error("Convert task to milestone error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
