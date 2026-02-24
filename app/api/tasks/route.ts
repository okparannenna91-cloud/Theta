import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { z } from "zod";
import { publishToChannel, getWorkspaceChannel, getBoardChannel, getProjectChannel } from "@/lib/ably";

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().default("todo"),
  priority: z.string().default("medium"),
  workspaceId: z.string(),
  projectId: z.string(),
  boardId: z.string().optional(),
  columnId: z.string().optional(),
  dueDate: z.string().optional(),
  coverImage: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const teamId = searchParams.get("teamId");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Explicit workspaceId is required for multi-tenant isolation." },
        { status: 400 }
      );
    }

    // Verify workspace access
    const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied to workspace" },
        { status: 403 }
      );
    }

    const db = getPrismaClient(workspaceId);
    let projectWhere: any = { workspaceId, teamId: null };

    // If teamId is provided, we only show tasks from projects belonging to that team
    if (teamId) {
      const membership = await db.teamMember.findUnique({
        where: {
          teamId_userId: { teamId, userId: user.id },
        },
      });
      if (!membership) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
      projectWhere = { workspaceId, teamId };
    }

    const tasks = await db.task.findMany({
      where: {
        workspaceId: workspaceId as string,
        project: projectWhere,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Tasks API error:", error);
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
    const data = taskSchema.parse(body);

    // Verify workspace access
    const hasAccess = await verifyWorkspaceAccess(user.id, data.workspaceId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied to workspace" },
        { status: 403 }
      );
    }

    const db = getPrismaClient(data.workspaceId);

    // Verify project belongs to workspace and user has access
    const project = await db.project.findFirst({
      where: {
        id: data.projectId as string,
        workspaceId: data.workspaceId as string,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found in workspace" },
        { status: 404 }
      );
    }

    // Check plan limits strictly
    try {
      const workspace = await db.workspace.findUnique({
        where: { id: data.workspaceId },
        include: { _count: { select: { tasks: true } } }
      });
      if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

      const { enforcePlanLimit } = await import("@/lib/plan-limits");
      await enforcePlanLimit(data.workspaceId, "tasks", workspace._count.tasks);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    const task = await db.task.create({
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        workspaceId: data.workspaceId as string,
        projectId: data.projectId as string,
        userId: user.id as string,
        boardId: data.boardId,
        columnId: data.columnId,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        coverImage: data.coverImage,
      },
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
    const workspaceChannel = getWorkspaceChannel(task.workspaceId);
    await publishToChannel(workspaceChannel, "task:created", task);

    if (task.boardId) {
      const boardChannel = getBoardChannel(task.workspaceId, task.boardId);
      await publishToChannel(boardChannel, "task:created", task);
    }

    if (task.projectId) {
      const projectChannel = getProjectChannel(task.workspaceId, task.projectId);
      await publishToChannel(projectChannel, "task:created", task);
    }

    // Log activity
    const { createActivity } = await import("@/lib/activity");
    await createActivity(
      user.id,
      data.workspaceId,
      "created",
      "task",
      task.id,
      {
        taskTitle: task.title,
        projectId: task.projectId,
      }
    );

    // Slack Notification
    const { notifyWorkspace } = await import("@/lib/integrations/slack");
    await notifyWorkspace(
      data.workspaceId,
      `New task created: *${task.title}* in project *${task.project.name}*`,
      "Task Created"
    );

    return NextResponse.json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Create task error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

