import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { getAccessibleProjectIds, canAccessProjectResource } from "@/lib/project-permissions";
import { getTaskCount } from "@/lib/usage-tracking";
import { getPlanLimits } from "@/lib/plan-limits";
import { z } from "zod";
import { publishToChannel, getWorkspaceChannel, getBoardChannel, getProjectChannel } from "@/lib/ably";

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().default("todo"),
  priority: z.enum(["none", "low", "medium", "high", "urgent"]).default("medium"),
  taskType: z.enum(["task", "bug", "feature", "story", "epic", "improvement"]).default("task"),
  workspaceId: z.string(),
  projectId: z.string().optional(),
  boardId: z.string().optional(),
  columnId: z.string().optional(),
  dueDate: z.string().optional(),
  startDate: z.string().optional(),
  isMilestone: z.boolean().optional(),
  color: z.string().optional(),
  parentId: z.string().optional(),
  isSummary: z.boolean().optional(),
  coverImage: z.string().optional(),
  schedulingMode: z.string().default("auto"),
  baselineStartDate: z.string().optional(),
  baselineDueDate: z.string().optional(),
  assigneeIds: z.array(z.string()).optional(),
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
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assigneeId = searchParams.get("assigneeId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

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

    const accessibleProjectIds = await getAccessibleProjectIds(user.id, workspaceId);
    let projectWhere: any = { id: { in: accessibleProjectIds } };

    // If teamId is provided, we only show tasks from projects belonging to that team
    if (teamId) {
      const membership = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: { teamId, userId: user.id },
        },
      });
      if (!membership) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
      projectWhere.teamId = teamId;
    }

    const taskWhere: any = {
      workspaceId: workspaceId as string,
      project: projectWhere,
    };

    // Search/filter params
    if (search) {
      taskWhere.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) {
      taskWhere.status = { equals: status, mode: 'insensitive' };
    }
    if (priority) {
      taskWhere.priority = priority;
    }
    if (assigneeId) {
      taskWhere.userId = assigneeId;
    }

    const [tasks, totalCount] = await Promise.all([
      prisma.task.findMany({
        where: taskWhere,
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
          predecessors: true,
          successors: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.task.count({ where: taskWhere }),
    ]);

    const [count, workspace] = await Promise.all([
        getTaskCount(workspaceId),
        prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { plan: true }
        })
    ]);

    const planLimits = getPlanLimits((workspace?.plan as any) || "free");

    return NextResponse.json({
        tasks,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
        limits: {
            max: planLimits.maxTasks,
            current: count,
            hasAccess: true
        }
    });
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

    // Find the correct statusId (Relationship Consistency Fix)
    const statusRecord = await prisma.status.findFirst({
        where: { 
            workspaceId: data.workspaceId,
            name: { equals: data.status, mode: 'insensitive' }
        }
    }) || await prisma.status.findFirst({
        where: { 
            workspaceId: data.workspaceId,
            name: { equals: 'Todo', mode: 'insensitive' }
        }
    });

    // Verify project belongs to workspace if provided
    if (data.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: data.projectId,
          workspaceId: data.workspaceId,
        },
      });

      if (!project) {
        return NextResponse.json(
          { error: "Project not found in workspace" },
          { status: 404 }
        );
      }

      const hasProjectAccess = await canAccessProjectResource(user.id, data.workspaceId, data.projectId);
      if (!hasProjectAccess) {
        return NextResponse.json(
          { error: "Access denied to this project" },
          { status: 403 }
        );
      }
    }

    // Check plan limits strictly
    try {
      const workspace = await prisma.workspace.findUnique({
        where: { id: data.workspaceId },
        select: { plan: true }
      });
      if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

      const { getTaskCount } = await import("@/lib/usage-tracking");
      const taskCount = await getTaskCount(data.workspaceId);

      const { enforcePlanLimit } = await import("@/lib/plan-limits");
      await enforcePlanLimit(data.workspaceId, "tasks", taskCount);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        statusId: statusRecord?.id,
        priority: data.priority,
        taskType: data.taskType,
        workspaceId: data.workspaceId as string,
        projectId: data.projectId as string,
        userId: user.id as string,
        assigneeIds: data.assigneeIds || [user.id],
        boardId: data.boardId,
        columnId: data.columnId,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        isMilestone: data.isMilestone || false,
        color: data.color,
        parentId: data.parentId,
        isSummary: data.isSummary || false,
        coverImage: data.coverImage,
        schedulingMode: data.schedulingMode,
        baselineStartDate: data.baselineStartDate ? new Date(data.baselineStartDate) : null,
        baselineDueDate: data.baselineDueDate ? new Date(data.baselineDueDate) : null,
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

    // Trigger Automations
    try {
        const { processAutomations } = await import("@/lib/automations/engine");
        await processAutomations(task.workspaceId, "TASK_CREATED", {
            taskId: task.id,
            projectId: task.projectId,
            userId: user.id,
            taskTitle: task.title,
            taskPriority: task.priority,
        });
    } catch (automationError) {
        console.error("Failed to trigger automations on task creation:", automationError);
    }

    // Log activity
    const { createActivity } = await import("@/lib/activity");
    await createActivity(
      user.id,
      data.workspaceId,
      "created",
      "task",
      task.id,
      { taskTitle: task.title, entityName: task.title },
      task.projectId
    );

    // Notify workspace members
    const { notifyWorkspaceMembers } = await import("@/lib/notifications");
    await notifyWorkspaceMembers(
      data.workspaceId,
      user.id,
      "task_assigned", // Using task_assigned as a generic "new task" type for now
      "New Task Created",
      `${user.name || "A member"} created a new task: ${task.title}${(task as any).project?.name ? ` in ${(task as any).project.name}` : ""}`,
      { taskId: task.id, projectId: task.projectId }
    );

    // Slack Notification
    const { notifyWorkspace } = await import("@/lib/integrations/slack");
    await notifyWorkspace(
      data.workspaceId,
      `New task created: *${task.title}*${(task as any).project?.name ? ` in project *${(task as any).project.name}*` : ""}`,
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

