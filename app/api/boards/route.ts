import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanLimits } from "@/lib/plan-limits";
import { getAccessibleProjectIds, requireProjectAccess } from "@/lib/project-permissions";
import { z } from "zod";

const boardSchema = z.object({
  name: z.string().min(1),
  projectId: z.string(),
  description: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
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

    let projectWhere: any = { workspaceId };

    if (teamId) {
      const teamMembership = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: { teamId, userId: user.id },
        },
      });
      if (!teamMembership) {
        return NextResponse.json({ error: "Access denied to team" }, { status: 403 });
      }
      // Include projects linked via direct teamId OR ProjectTeam join table
      const projectTeamLinks = await prisma.projectTeam.findMany({
        where: { teamId },
        select: { projectId: true },
      });
      const teamProjectIds = projectTeamLinks.map(pt => pt.projectId);
      projectWhere = {
        workspaceId,
        OR: [
          { teamId },
          ...(teamProjectIds.length > 0 ? [{ id: { in: teamProjectIds } }] : []),
        ],
      };
    }

    let accessibleProjectIds: string[] | undefined;
    if (!teamId) {
      accessibleProjectIds = await getAccessibleProjectIds(user.id, workspaceId);
    }

    const boards = await prisma.board.findMany({
      where: {
        project: projectWhere,
        ...(!teamId && accessibleProjectIds ? { projectId: { in: accessibleProjectIds } } : {}),
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

    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { plan: true }
    });
    const planLimits = getPlanLimits((workspace?.plan as any) || "free");
    const boardCount = await prisma.board.count({ where: { workspaceId } });

    return NextResponse.json({
        boards,
        limits: {
            max: planLimits.maxBoards,
            current: boardCount,
            hasAccess: true
        }
    });
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

    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

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

    const projectAccess = await requireProjectAccess(user.id, data.projectId, project.workspaceId);
    if (!projectAccess.allowed) {
      return NextResponse.json({ error: projectAccess.error!.message }, { status: projectAccess.error!.status });
    }

    const boardCount = await prisma.board.count({
      where: { workspaceId: project.workspaceId }
    });

    try {
      const { enforcePlanLimit } = await import("@/lib/plan-limits");
      await enforcePlanLimit(project.workspaceId, "boards", boardCount);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    const board = await prisma.board.create({
      data: {
        name: data.name,
        projectId: data.projectId,
        workspaceId: project.workspaceId,
        description: data.description || "",
      },
    });

    const defaultColumns = ["Todo", "In Progress", "Done"];

    // Get existing project statuses to avoid duplicates
    const existingStatuses = await prisma.status.findMany({
      where: { projectId: data.projectId },
      orderBy: { order: "asc" },
    });

    for (let i = 0; i < defaultColumns.length; i++) {
      // If a status with this name already exists, use it; otherwise create it
      let status = existingStatuses.find(
        (s) => s.name.toLowerCase() === defaultColumns[i].toLowerCase()
      );

      if (!status) {
        status = await prisma.status.create({
          data: {
            name: defaultColumns[i],
            order: i,
            projectId: data.projectId,
            workspaceId: project.workspaceId,
          },
        });
      }

      await prisma.column.create({
        data: {
          name: defaultColumns[i],
          boardId: board.id,
          order: i,
        },
      });
    }

    const boardWithColumns = await prisma.board.findUnique({
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

