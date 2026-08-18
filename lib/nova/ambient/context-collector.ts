import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { WorkspaceMemory } from "./workspace-memory";
import { MIN_OVERDUE_DUE_DATE } from "@/lib/overdue";
import type { WorkspaceEvent, ObservationContext } from "./types";

export class ContextCollector {
  static async collect(event: WorkspaceEvent): Promise<ObservationContext> {
    const context: ObservationContext = {
      workspaceId: event.workspaceId,
      event,
    };

    try {
      const [workspace, project, task, user] = await Promise.all([
        this.collectWorkspace(event.workspaceId),
        event.projectId ? this.collectProject(event.projectId) : Promise.resolve(undefined),
        event.taskId ? this.collectTask(event.taskId) : Promise.resolve(undefined),
        event.userId ? this.collectUser(event.userId, event.workspaceId) : Promise.resolve(undefined),
      ]);

      if (workspace) context.workspace = workspace;
      if (project) context.project = project;
      if (task) context.task = task;
      if (user) context.user = user;

      const [teamWorkload, recentActivity, sprint, memory] = await Promise.all([
        this.collectTeamWorkload(event.workspaceId),
        this.collectRecentActivity(event.workspaceId),
        event.projectId ? this.collectSprint(event.projectId) : Promise.resolve(undefined),
        WorkspaceMemory.retrieve(event.workspaceId, event.userId),
      ]);

      context.teamWorkload = teamWorkload;
      context.recentActivity = recentActivity;
      if (sprint) context.sprint = sprint;
      context.memory = memory;

      if (event.metadata?.content) {
        context.chatMessage = {
          id: (event.metadata.messageId as string) || "",
          content: event.metadata.content as string,
          userId: event.userId || "",
          userName: user?.name || null,
          channelId: (event.metadata.channelId as string) || "",
          mentions: (event.metadata.mentions as string[]) || [],
          isQuestion: (event.metadata.content as string).includes("?"),
          isReply: !!(event.metadata.parentMessageId),
          parentMessageId: (event.metadata.parentMessageId as string) || null,
          createdAt: event.timestamp,
        };
      }
    } catch (error: any) {
      logger.warn("[ContextCollector] Context collection error:", error.message);
    }

    return context;
  }

  private static async collectWorkspace(workspaceId: string) {
    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        plan: true,
        createdAt: true,
        _count: { select: { members: true, projects: true, tasks: true } },
      },
    });
    if (!ws) return null;

    const overdueCount = await prisma.task.count({
      where: { workspaceId, dueDate: { gte: MIN_OVERDUE_DUE_DATE, lt: new Date() }, status: { notIn: ["done", "completed", "cancelled"] } },
    });

    return {
      id: ws.id,
      name: ws.name,
      plan: ws.plan,
      memberCount: ws._count.members,
      projectCount: ws._count.projects,
      taskCount: ws._count.tasks,
      createdAt: ws.createdAt,
      daysSinceCreation: Math.ceil((Date.now() - ws.createdAt.getTime()) / 86400000),
      overdueCount,
    };
  }

  private static async collectProject(projectId: string) {
    const proj = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, updatedAt: true },
    });
    if (!proj) return null;

    const [taskCount, doneCount, overdueCount, blockedCount, memberCount] = await Promise.all([
      prisma.task.count({ where: { projectId } }),
      prisma.task.count({ where: { projectId, status: { in: ["done", "completed"] } } }),
      prisma.task.count({ where: { projectId, dueDate: { gte: MIN_OVERDUE_DUE_DATE, lt: new Date() }, status: { notIn: ["done", "completed", "cancelled"] } } }),
      prisma.task.count({ where: { projectId, status: "blocked" } }),
      prisma.workspaceMember.count({ where: { workspace: { projects: { some: { id: projectId } } } } }),
    ]);

    const daysSinceLastUpdate = Math.ceil((Date.now() - proj.updatedAt.getTime()) / 86400000);

    return {
      id: proj.id,
      name: proj.name,
      taskCount,
      completionRate: taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0,
      overdueCount,
      blockedCount,
      daysSinceLastUpdate,
      isInactive: daysSinceLastUpdate > 14 && taskCount > 0 && doneCount < taskCount,
      memberCount,
    };
  }

  private static async collectTask(taskId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        assigneeIds: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true,
        projectId: true,
        sprintId: true,
      },
    });
    if (!task) return null;

    const isOverdue = task.dueDate && task.dueDate > MIN_OVERDUE_DUE_DATE && task.dueDate < new Date() && task.status !== "done" && task.status !== "completed" && task.status !== "cancelled";

    const [dependencyCount, blockerCount, subtaskCount, completedSubtasks] = await Promise.all([
      prisma.taskDependency.count({ where: { taskId } }),
      prisma.task.count({ where: { status: "blocked", predecessors: { some: { taskId } } } }),
      prisma.task.count({ where: { parentId: taskId } }),
      prisma.task.count({ where: { parentId: taskId, status: { in: ["done", "completed"] } } }),
    ]);

    const blockingCount = await prisma.taskDependency.count({
      where: { predecessorId: taskId },
    });

    return {
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      assigneeIds: task.assigneeIds,
      isBlocked: task.status === "blocked",
      daysOverdue: isOverdue && task.dueDate ? Math.ceil((Date.now() - task.dueDate.getTime()) / 86400000) : 0,
      daysSinceCreation: Math.ceil((Date.now() - task.createdAt.getTime()) / 86400000),
      daysSinceLastUpdate: Math.ceil((Date.now() - task.updatedAt.getTime()) / 86400000),
      dependencyCount,
      blockerCount,
      blockingCount,
      hasSubtasks: subtaskCount > 0,
      subtaskCompletionRate: subtaskCount > 0 ? Math.round((completedSubtasks / subtaskCount) * 100) : 100,
      projectId: task.projectId,
      sprintId: task.sprintId,
    };
  }

  private static async collectUser(userId: string, workspaceId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { role: true, createdAt: true, user: { select: { id: true, name: true } } },
    });
    if (!member) return null;

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    const [activeTaskCount, overdueTaskCount, completedTaskCount7d, totalCompletedTaskCount] = await Promise.all([
      prisma.task.count({ where: { assigneeIds: { has: userId }, status: { notIn: ["done", "completed", "cancelled"] } } }),
      prisma.task.count({ where: { assigneeIds: { has: userId }, dueDate: { gte: MIN_OVERDUE_DUE_DATE, lt: new Date() }, status: { notIn: ["done", "completed", "cancelled"] } } }),
      prisma.task.count({ where: { assigneeIds: { has: userId }, completedAt: { gte: sevenDaysAgo } } }),
      prisma.task.count({ where: { assigneeIds: { has: userId }, status: { in: ["done", "completed"] } } }),
    ]);

    const daysSinceJoined = Math.ceil((Date.now() - member.createdAt.getTime()) / 86400000);

    return {
      id: member.user.id,
      name: member.user.name,
      role: member.role,
      activeTaskCount,
      overdueTaskCount,
      completedTaskCount7d,
      totalCompletedTaskCount,
      isNewMember: daysSinceJoined < 7,
      daysSinceJoined,
    };
  }

  private static async collectTeamWorkload(workspaceId: string) {
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { userId: true, role: true, user: { select: { name: true } } },
    });

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    const workload = await Promise.all(
      members.map(async (m) => {
        const [activeTasks, overdueCount, completedLast7d] = await Promise.all([
          prisma.task.count({ where: { assigneeIds: { has: m.userId }, status: { notIn: ["done", "completed", "cancelled"] } } }),
          prisma.task.count({ where: { assigneeIds: { has: m.userId }, dueDate: { gte: MIN_OVERDUE_DUE_DATE, lt: new Date() }, status: { notIn: ["done", "completed", "cancelled"] } } }),
          prisma.task.count({ where: { assigneeIds: { has: m.userId }, completedAt: { gte: sevenDaysAgo } } }),
        ]);
        return {
          userId: m.userId,
          name: m.user.name,
          activeTasks,
          overdueCount,
          completedLast7d,
          capacity: activeTasks > 10 ? 0 : Math.max(0, 1 - activeTasks / 10),
          role: m.role,
        };
      })
    );

    return workload.sort((a, b) => b.activeTasks - a.activeTasks);
  }

  private static async collectRecentActivity(workspaceId: string, limit = 15) {
    const activities = await prisma.activity.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { action: true, entityType: true, entityId: true, userId: true, createdAt: true },
    });
    return activities;
  }

  private static async collectSprint(projectId: string) {
    const sprint = await prisma.sprint.findFirst({
      where: { projectId, status: { not: "completed" } },
      orderBy: { startDate: "desc" },
      select: { id: true, name: true, status: true, startDate: true, endDate: true },
    });
    if (!sprint) return undefined;

    const [totalTasks, completedTasks, tasksCreatedAfterSprintStart] = await Promise.all([
      prisma.task.count({ where: { sprintId: sprint.id } }),
      prisma.task.count({ where: { sprintId: sprint.id, status: { in: ["done", "completed"] } } }),
      sprint.startDate
        ? prisma.task.count({ where: { sprintId: sprint.id, createdAt: { gte: sprint.startDate }, status: { notIn: ["done", "completed"] } } })
        : Promise.resolve(0),
    ]);

    const remainingDays = sprint.endDate
      ? Math.max(0, Math.ceil((sprint.endDate.getTime() - Date.now()) / 86400000))
      : 0;

    const totalStoryPoints = await prisma.task.aggregate({
      where: { sprintId: sprint.id },
      _sum: { estimatedHours: true },
    });

    const completedStoryPoints = await prisma.task.aggregate({
      where: { sprintId: sprint.id, status: { in: ["done", "completed"] } },
      _sum: { estimatedHours: true },
    });

    const daysElapsed = sprint.startDate
      ? Math.max(1, Math.ceil((Date.now() - sprint.startDate.getTime()) / 86400000))
      : 1;

    const totalSp = totalStoryPoints._sum?.estimatedHours || 1;
    const velocityPerDay = (completedStoryPoints._sum?.estimatedHours || 0) / daysElapsed;

    const requiredVelocity = remainingDays > 0
      ? (totalSp - (completedStoryPoints._sum?.estimatedHours || 0)) / remainingDays
      : 99;

    return {
      id: sprint.id,
      name: sprint.name,
      status: sprint.status,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      totalTasks,
      completedTasks,
      remainingDays,
      totalStoryPoints: totalSp,
      completedStoryPoints: completedStoryPoints._sum?.estimatedHours || 0,
      tasksAddedAfterStart: tasksCreatedAfterSprintStart,
      velocityPerDay: Math.round(velocityPerDay * 10) / 10,
      isAtRisk: requiredVelocity > velocityPerDay * 1.5 && remainingDays > 0,
    };
  }
}
