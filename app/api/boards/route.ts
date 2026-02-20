import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma, getPrismaClient } from "@/lib/prisma";
import { canCreateBoard, getPlanLimitMessage } from "@/lib/plan-limits";
import { z } from "zod";

const boardSchema = z.object({
  name: z.string().min(1),
  projectId: z.string(),
});

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");
    let workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      const workspace = await prisma.workspaceMember.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
      });
      workspaceId = workspace?.workspaceId || null;
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required and no default found" },
        { status: 400 }
      );
    }

    // Verify workspace membership
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const db = getPrismaClient(workspaceId);
    let projectWhere: any = { workspaceId };

    if (teamId) {
      // Verify team membership
      const teamMembership = await db.teamMember.findUnique({
        where: {
          teamId_userId: { teamId, userId: user.id },
        },
      });
      if (!teamMembership) {
        return NextResponse.json({ error: "Access denied to team" }, { status: 403 });
      }
      projectWhere.teamId = teamId;
    }

    const boards = await db.board.findMany({
      where: {
        project: projectWhere,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        columns: {
          orderBy: { order: "asc" },
        },
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(boards);
  } catch (error) {
    console.error("Boards API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = boardSchema.parse(body);

    // Verify project belongs to a workspace the user is a member of
    const project = await prisma.project.findUnique({
      where: {
        id: data.projectId,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Verify workspace access
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: project.workspaceId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const db = getPrismaClient(project.workspaceId);
    const { prisma } = await import("@/lib/prisma");

    // Check plan limits strictly
    const boardCount = await db.board.count({
      where: { workspaceId: project.workspaceId }
    });

    try {
      const { enforcePlanLimit } = await import("@/lib/plan-limits");
      await enforcePlanLimit(project.workspaceId, "boards", boardCount);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    const board = await db.board.create({
      data: {
        name: data.name,
        projectId: data.projectId,
        workspaceId: project.workspaceId,
      },
    });

    // Create default columns
    const defaultColumns = ["Todo", "In Progress", "Done"];
    for (let i = 0; i < defaultColumns.length; i++) {
      await db.column.create({
        data: {
          name: defaultColumns[i],
          boardId: board.id,
          order: i,
        },
      });
    }

    const boardWithColumns = await db.board.findUnique({
      where: { id: board.id },
      include: {
        columns: true,
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(boardWithColumns);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Create board error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

