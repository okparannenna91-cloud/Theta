import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findAcrossShards } from "@/lib/prisma";
import { Task } from "@prisma/client";
import { z } from "zod";
import { publishToChannel, getWorkspaceChannel, getBoardChannel, getProjectChannel } from "@/lib/ably";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  projectId: z.string().optional(),
  boardId: z.string().optional(),
  columnId: z.string().optional(),
  order: z.number().optional(),
  dueDate: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = updateSchema.parse(body);

    const { data: task, db } = await findAcrossShards<Task>("task", { id: params.id });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Verify workspace access (Workspace records are on Shard 1 / primary)
    const { prisma } = await import("@/lib/prisma");
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: task.workspaceId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const updateData: any = { ...data };
    if (data.dueDate) {
      updateData.dueDate = new Date(data.dueDate);
    }

    const updated = await db.task.update({
      where: { id: params.id },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Notify via Ably
    const workspaceChannel = getWorkspaceChannel(updated.workspaceId);
    await publishToChannel(workspaceChannel, "task:updated", updated);

    if (updated.boardId) {
      const boardChannel = getBoardChannel(updated.workspaceId, updated.boardId);
      await publishToChannel(boardChannel, "task:updated", updated);
    }

    if (updated.projectId) {
      const projectChannel = getProjectChannel(updated.workspaceId, updated.projectId);
      await publishToChannel(projectChannel, "task:updated", updated);
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Update task error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: task, db } = await findAcrossShards<Task>("task", { id: params.id });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Verify workspace access
    const { prisma } = await import("@/lib/prisma");
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: task.workspaceId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await db.task.delete({
      where: { id: params.id },
    });

    // Notify via Ably
    const workspaceChannel = getWorkspaceChannel(task.workspaceId);
    await publishToChannel(workspaceChannel, "task:deleted", { id: params.id });

    if (task.boardId) {
      const boardChannel = getBoardChannel(task.workspaceId, task.boardId);
      await publishToChannel(boardChannel, "task:deleted", { id: params.id });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete task error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

