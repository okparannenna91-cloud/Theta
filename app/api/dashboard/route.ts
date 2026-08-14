import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccessibleProjectIds } from "@/lib/project-permissions";
import { StatusCategory } from "@/lib/constants/status";
import { cacheGetOrSet, cacheKey } from "@/lib/cache";

/**
 * Growth of a displayed total since the start of the current window.
 * `windowCreated` is the number created within the window, so the total at
 * window start is `current - windowCreated`.
 */
function growthPercent(current: number, windowCreated: number): number {
  const prev = current - windowCreated;
  if (prev > 0) return Math.round((windowCreated / prev) * 100);
  return windowCreated > 0 ? 100 : 0;
}

export async function GET(req: Request) {
  let workspaceId: string | null = null;
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");
    const includeSubtasks = searchParams.get("includeSubtasks") === "1";
    workspaceId = searchParams.get("workspaceId");

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

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

    // Verify Workspace Membership
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id
        }
      }
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied to this workspace" }, { status: 403 });
    }

    const [accessibleProjectIds, teamMembershipCheck] = await Promise.all([
      getAccessibleProjectIds(user.id, workspaceId),
      teamId
        ? prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: user.id } } })
        : Promise.resolve(null),
    ]);

    if (teamId && !teamMembershipCheck) {
      return NextResponse.json({ error: "Access denied to this team" }, { status: 403 });
    }

    const whereProject: Record<string, unknown> = { workspaceId, id: { in: accessibleProjectIds } };
    if (teamId) whereProject.teamId = teamId;

    const whereTask: Record<string, unknown> = { workspaceId, projectId: { in: accessibleProjectIds }, ...(includeSubtasks ? {} : { parentId: { equals: null } }) };
    if (teamId) whereTask.project = { teamId };

    const daysParam = searchParams.get("days");
    const daysBack = daysParam ? parseInt(daysParam, 10) : 7;
    const rangeStart = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    const prevRangeStart = new Date(Date.now() - daysBack * 2 * 24 * 60 * 60 * 1000);

    const cacheKeyStr = cacheKey(
      "dashboard",
      user.id,
      workspaceId,
      teamId || "all",
      String(daysBack),
      includeSubtasks ? "s" : "n"
    );

    const data = await cacheGetOrSet(cacheKeyStr, async () => {
      const wsId = workspaceId!;
      // Status records with semantic categories (used for all completion/active counting below)
      const statusRecords = await prisma.status.findMany({
        where: { projectId: { in: accessibleProjectIds } },
        select: { id: true, name: true, category: true },
      });
      const categoryMap = new Map(
        statusRecords.map((s) => [s.name.toLowerCase(), s.category])
      );
      const doneStatusIds = new Set(
        statusRecords.filter((s) => s.category === StatusCategory.DONE).map((s) => s.id)
      );

      // A task is "completed" if its status slug is done/completed OR its Status record has category DONE
      const completedStatusFilter: Record<string, unknown> = {
        OR: [
          { status: { in: ["done", "completed"] } },
          ...(doneStatusIds.size > 0 ? [{ statusId: { in: Array.from(doneStatusIds) } }] : []),
        ],
      };
      const notCompletedStatusFilter: Record<string, unknown> = {
        NOT: {
          OR: [
            { status: { in: ["done", "completed"] } },
            ...(doneStatusIds.size > 0 ? [{ statusId: { in: Array.from(doneStatusIds) } }] : []),
          ],
        },
      };

      const prevPeriodWhere: Record<string, unknown> = {
        workspaceId: wsId,
        projectId: { in: accessibleProjectIds },
        ...(includeSubtasks ? {} : { parentId: { equals: null } }),
        createdAt: { lt: rangeStart, gte: prevRangeStart },
      };

      const activityAccessFilter: Record<string, unknown> = {
        OR: [{ projectId: null }, { projectId: { in: accessibleProjectIds } }]
      };

      const [
        projectsCount, tasksCount, membersCount, recentProjects, recentTasks,
        statuses, totalTaskCount,
        prevProjectsCount, prevTasksCount, prevCompletedTaskCount, prevTotalTaskCount,
      ] = await Promise.all([
        prisma.project.count({ where: whereProject }),
        prisma.task.count({ where: { ...whereTask, ...notCompletedStatusFilter } }),
        prisma.workspaceMember.count({ where: { workspaceId: wsId } }),
        prisma.project.findMany({
          where: whereProject,
          take: 5,
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { tasks: true } } },
        }),
        prisma.task.findMany({
          where: whereTask,
          take: 5,
          orderBy: { createdAt: "desc" },
          include: { project: { select: { name: true } } },
        }),
        prisma.status.findMany({ where: { projectId: { in: accessibleProjectIds } }, orderBy: { order: "asc" } }),
        // Individual counts instead of groupBy (Prisma MongoDB crashes on nullable fields in groupBy)
        prisma.task.count({ where: whereTask }),
        // Previous period counts for trend calculation
        prisma.project.count({ where: { workspaceId: wsId, id: { in: accessibleProjectIds }, createdAt: { lt: rangeStart, gte: prevRangeStart } } }),
        prisma.task.count({ where: { ...prevPeriodWhere, ...notCompletedStatusFilter } }),
        prisma.task.count({ where: { ...prevPeriodWhere, ...completedStatusFilter } }),
        prisma.task.count({ where: prevPeriodWhere }),
      ]);

      const completedTaskCount = await prisma.task.count({
        where: { ...whereTask, ...completedStatusFilter },
      });

      // Created within the current window — used to derive growth vs window start
      const [windowProjectsCount, windowActiveTasksCount, windowMembersCount] = await Promise.all([
        prisma.project.count({ where: { ...whereProject, createdAt: { gte: rangeStart } } }),
        prisma.task.count({ where: { ...whereTask, ...notCompletedStatusFilter, createdAt: { gte: rangeStart } } }),
        prisma.workspaceMember.count({ where: { workspaceId: wsId, createdAt: { gte: rangeStart } } }),
      ]);

      const completionRate = totalTaskCount > 0 ? Math.round((completedTaskCount / totalTaskCount) * 100) : 0;
      const prevCompletionRate = prevTotalTaskCount > 0 ? Math.round((prevCompletedTaskCount / prevTotalTaskCount) * 100) : 0;

      // Status Distribution: use semantic category from Status model
      const statusCounts = await Promise.all(
        statuses.map(async (s) => {
          return prisma.task.count({ where: { ...whereTask, statusId: s.id } });
        })
      );
      const statusDistribution = statuses.map((s, i) => {
        const category = categoryMap.get(s.name.toLowerCase()) || "";
        return {
          name: s.name,
          value: statusCounts[i] ?? 0,
          category: category || undefined,
        };
      });

      // Priority Distribution: individual counts per priority
      const [priorityLow, priorityMedium, priorityHigh, priorityUrgent] = await Promise.all([
        prisma.task.count({ where: { ...whereTask, priority: "low" } }),
        prisma.task.count({ where: { ...whereTask, priority: "medium" } }),
        prisma.task.count({ where: { ...whereTask, priority: "high" } }),
        prisma.task.count({ where: { ...whereTask, priority: "urgent" } }),
      ]);
      const priorityDistribution = [
        { name: "Low", value: priorityLow },
        { name: "Medium", value: priorityMedium },
        { name: "High", value: priorityHigh },
        { name: "Urgent", value: priorityUrgent },
      ];

      // Build activity trends from bounded per-day counts (no unbounded fetch)
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const trendDays = Math.min(daysBack, 7);
      const trendBuckets = await Promise.all(
        Array.from({ length: trendDays }, (_, i) => {
          const dayStart = new Date(Date.now() - (trendDays - 1 - i) * 24 * 60 * 60 * 1000);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
          return prisma.activity.count({
            where: {
              workspaceId: wsId,
              createdAt: { gte: dayStart, lt: dayEnd },
              ...activityAccessFilter,
            },
          });
        })
      );
      const activityTrends = trendBuckets.map((count, i) => {
        const d = new Date(Date.now() - (trendDays - 1 - i) * 24 * 60 * 60 * 1000);
        return { name: dayNames[d.getDay()], activities: count };
      });

      const rawActivities: any[] = await prisma.activity.findMany({
        where: {
          workspaceId: wsId,
          ...activityAccessFilter,
        },
        take: 10,
        orderBy: { createdAt: "desc" },
      });

      const activityUserIds: string[] = rawActivities
        .map(a => (a as any).userId as string | null)
        .filter((id): id is string => id !== null);

      const activityUsers = activityUserIds.length > 0
        ? await prisma.user.findMany({ where: { id: { in: activityUserIds } }, select: { id: true, name: true, imageUrl: true } })
        : [];
      const userMap = new Map(activityUsers.map(u => [u.id, u]));
      const recentActivities = rawActivities
        .filter((a): a is (typeof rawActivities[0] & { userId: string }) => a.userId !== null)
        .map(a => ({ ...a, user: userMap.get(a.userId) || null }));

      // Workspace structure from recent projects (reuse existing data)
      const workspaceStructure = [{
        name: "Workspace",
        children: recentProjects.map(p => {
          const projectWithCount = p as typeof p & { _count: { tasks: number } };
          return { name: p.name, size: projectWithCount._count?.tasks || 1 };
        }),
      }];

      return {
        projectsCount,
        tasksCount,
        membersCount,
        completionRate,
        trends: {
          projects: growthPercent(projectsCount, windowProjectsCount),
          tasks: growthPercent(tasksCount, windowActiveTasksCount),
          members: growthPercent(membersCount, windowMembersCount),
          completionRate: completionRate - prevCompletionRate,
        },
        recentProjects: recentProjects.map(p => ({ id: p.id, name: p.name, tasksCount: p._count.tasks })),
        recentTasks: recentTasks.map(t => ({ id: t.id, title: t.title, status: t.status, project: t.project, priority: t.priority })),
        recentActivities,
        activityTrends,
        statusDistribution,
        priorityDistribution,
        workspaceStructure,
        completionTime: [],
      };
    }, 15);

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Dashboard API error details:", {
      message,
      stack: error instanceof Error ? error.stack : undefined,
      workspaceId
    });
    return NextResponse.json(
      { error: "Internal server error", details: message },
      { status: 500 }
    );
  }
}