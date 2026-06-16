import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findAcrossShards } from "@/lib/prisma";
import { Board } from "@prisma/client";
import { requireProjectAccess } from "@/lib/project-permissions";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: board, db } = await findAcrossShards<any>("board", { id: params.id });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Verify workspace access (Workspace records are on Shard 1 / primary)
    const { prisma } = await import("@/lib/prisma");
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

    // Check project-level access
    const accessCheck = await requireProjectAccess(user.id, board.projectId, board.workspaceId);
    if (!accessCheck.allowed) {
      return NextResponse.json({ error: accessCheck.error!.message }, { status: accessCheck.error!.status });
    }

    // Now fetch full details from the shard
    const fullBoard = await db.board.findUnique({
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

    return NextResponse.json(fullBoard);
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
    const { name, description, icon, isFavorite, visibility } = body;

    const { data: board, db } = await findAcrossShards<any>("board", { id: params.id });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Verify workspace access
    const { prisma } = await import("@/lib/prisma");
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

    // Check project-level access
    const accessCheck = await requireProjectAccess(user.id, board.projectId, board.workspaceId);
    if (!accessCheck.allowed) {
      return NextResponse.json({ error: accessCheck.error!.message }, { status: accessCheck.error!.status });
    }

    const updatedBoard = await db.board.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
        ...(isFavorite !== undefined && { isFavorite }),
        ...(visibility !== undefined && { visibility }),
      },
    });

    return NextResponse.json(updatedBoard);
  } catch (error) {
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

    const { data: board, db } = await findAcrossShards<any>("board", { id: params.id });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Verify workspace access
    const { prisma } = await import("@/lib/prisma");
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

    // Check project-level access
    const accessCheck = await requireProjectAccess(user.id, board.projectId, board.workspaceId);
    if (!accessCheck.allowed) {
      return NextResponse.json({ error: accessCheck.error!.message }, { status: accessCheck.error!.status });
    }

    // Manual Cascade: Nullify board and column references on tasks
    await db.task.updateMany({
        where: { boardId: params.id },
        data: { boardId: null, columnId: null }
    });

    await db.board.delete({
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

