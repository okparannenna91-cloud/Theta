import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/project-permissions";
import { z } from "zod";

const boardUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  isFavorite: z.boolean().optional(),
  visibility: z.enum(["private", "team", "public"]).optional(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const board = await prisma.board.findUnique({
      where: { id: params.id },
      include: {
        columns: {
          orderBy: { order: "asc" },
        },
        tasks: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
            subtasks: {
              orderBy: { order: "asc" },
            },
            tags: true,
            _count: {
              select: { comments: true },
            },
          },
        },
        groups: {
          orderBy: { order: "asc" },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      } as any,
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

    const accessCheck = await requireProjectAccess(user.id, board.projectId, board.workspaceId);
    if (!accessCheck.allowed) {
      return NextResponse.json({ error: accessCheck.error!.message }, { status: accessCheck.error!.status });
    }
    return NextResponse.json(board);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
    const data = boardUpdateSchema.parse(body);

    const board = await prisma.board.findUnique({ where: { id: params.id } });

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

    const accessCheck = await requireProjectAccess(user.id, board.projectId, board.workspaceId);
    if (!accessCheck.allowed) {
      return NextResponse.json({ error: accessCheck.error!.message }, { status: accessCheck.error!.status });
    }

    const updatedBoard = await prisma.board.update({
      where: { id: params.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.isFavorite !== undefined && { isFavorite: data.isFavorite }),
        ...(data.visibility !== undefined && { visibility: data.visibility }),
      },
    });

    return NextResponse.json(updatedBoard);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Update board error:", error);
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

    const board = await prisma.board.findUnique({ where: { id: params.id } });

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

    const accessCheck = await requireProjectAccess(user.id, board.projectId, board.workspaceId);
    if (!accessCheck.allowed) {
      return NextResponse.json({ error: accessCheck.error!.message }, { status: accessCheck.error!.status });
    }

    await prisma.task.updateMany({
        where: { boardId: params.id },
        data: { boardId: null, columnId: null }
    });

    await prisma.board.delete({
      where: { id: params.id },
    });

    // Log Activity
    const { logActivity } = await import("@/lib/activity");
    await logActivity({
        userId: user.id,
        workspaceId: board.workspaceId,
        action: "deleted",
        entityType: "board",
        entityId: params.id,
        metadata: { name: board.name }
    });

    return NextResponse.json({ message: "Board deleted" });
  } catch (error) {
    console.error("Delete board error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

