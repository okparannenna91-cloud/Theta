import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  publishToChannel,
  getBoardChannel,
  getWorkspaceChannel,
  getProjectChannel,
} from "@/lib/ably";

const reorderSchema = z.object({
  updates: z.array(
    z.object({
      id: z.string(),
      columnId: z.string(),
      order: z.number(),
    })
  ),
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
    const { updates } = reorderSchema.parse(body);

    if (updates.length === 0) {
      return NextResponse.json({ tasks: [] });
    }

    const board = await prisma.board.findUnique({
      where: { id: params.id },
    });
    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: board.workspaceId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const results = await prisma.$transaction(
      updates.map((update) =>
        prisma.task.update({
          where: { id: update.id },
          data: {
            columnId: update.columnId,
            order: update.order,
          },
          include: {
            project: { select: { id: true, name: true } },
            subtasks: { orderBy: { order: "asc" } },
            tags: true,
            _count: { select: { comments: true } },
          },
        })
      )
    );

    const workspaceChannel = getWorkspaceChannel(board.workspaceId);
    const boardChannel = getBoardChannel(board.workspaceId, params.id);

    for (const task of results) {
      await publishToChannel(workspaceChannel, "task:updated", task);
      await publishToChannel(boardChannel, "task:updated", task);
      if (task.projectId) {
        const projectChannel = getProjectChannel(
          board.workspaceId,
          task.projectId
        );
        await publishToChannel(projectChannel, "task:updated", task);
      }
    }

    return NextResponse.json({ tasks: results });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Reorder tasks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
