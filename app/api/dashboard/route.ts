import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccessibleProjectIds } from "@/lib/project-permissions";

export async function GET(req: Request) {
  let workspaceId: string | null = null;
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");
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

    const whereTask: Record<string, unknown> = { workspaceId, projectId: { in: accessibleProjectIds } };
    if (teamId) whereTask.project = { teamId };

    const daysParam = searchParams.get("days");
    const daysBack = daysParam ? parseInt(daysParam, 10) : 7;
    const rangeStart = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    const prevRangeStart = new Date(Date.now() - daysBack * 2 * 24 * 60 * 60 * 1000);

    const [
      projectsCount, tasksCount, membersCount, recentProjects, recentTasks,
      activities, statuses, totalTaskCount, completedTaskCount,
      prevProjectsCount, prevTasksCount, prevCompletedTaskCount, prevTotalTaskCount,
    ] = await Promise.all([
      prisma.project.count({ where: whereProject }),
      prisma.task.count({ where: { ...whereTask, status: { notIn: ["done"] } } }),
      prisma.workspaceMember.count({ where: { workspaceId } }),
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
      prisma.activity.findMany({
        where: {
          workspaceId,
          createdAt: { gte: rangeStart },
          OR: [{ projectId: null }, { projectId: { in: accessibleProjectIds } }]
        }
      }),
      prisma.status.findMany({ where: { projectId: { in: accessibleProjectIds } }, orderBy: { order: "asc" } }),
      // Individual counts instead of groupBy (Prisma MongoDB crashes on nullable fields in groupBy)
      prisma.task.count({ where: whereTask }),
      prisma.task.count({ where: { ...whereTask, status: { in: ["done", "completed"] } } }),
      // Previous period counts for trend calculation
      prisma.project.count({ where: { workspaceId, id: { in: accessibleProjectIds }, createdAt: { lt: rangeStart, gte: prevRangeStart } } }),
      prisma.task.count({ where: { workspaceId, projectId: { in: accessibleProjectIds }, status: { notIn: ["done"] }, createdAt: { lt: rangeStart, gte: prevRangeStart } } }),
      prisma.task.count({ where: { workspaceId, projectId: { in: accessibleProjectIds }, status: { in: ["done", "completed"] }, createdAt: { lt: rangeStart, gte: prevRangeStart } } }),
      prisma.task.count({ where: { workspaceId, projectId: { in: accessibleProjectIds }, createdAt: { lt: rangeStart, gte: prevRangeStart } } }),
    ]);

    const completionRate = totalTaskCount > 0 ? Math.round((completedTaskCount / totalTaskCount) * 100) : 0;
    const prevCompletionRate = prevTotalTaskCount > 0 ? Math.round((prevCompletedTaskCount / prevTotalTaskCount) * 100) : 0;

    // Status Distribution: one count per status (separate batch to avoid circular ref)
    const statusCounts = await Promise.all(
      statuses.map(s =>
        prisma.task.count({ where: { ...whereTask, statusId: s.id } })
      )
    );
    const statusDistribution = statuses.map((s, i) => ({
      name: s.name,
      value: statusCounts[i] ?? 0,
    }));

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

    // Build activity trends from the batched activities
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const trendDays = Math.min(daysBack, 7);
    const activityTrends = Array.from({ length: trendDays }, (_, i) => {
      const d = new Date(Date.now() - (trendDays - 1 - i) * 24 * 60 * 60 * 1000);
      const dayKey = d.toDateString();
      return { name: dayNames[d.getDay()], activities: activities.filter(a => new Date(a.createdAt).toDateString() === dayKey).length };
    });

    const rawActivities: (typeof activities[0] & { metadata?: Record<string, unknown> })[] = await prisma.activity.findMany({
      where: {
        workspaceId,
        OR: [{ projectId: null }, { projectId: { in: accessibleProjectIds } }]
      },
      take: 10,
      orderBy: { createdAt: "desc" },
    }) as any;

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

    return NextResponse.json({
      projectsCount,
      tasksCount,
      membersCount,
      completionRate,
      trends: {
        projects: prevProjectsCount > 0 ? Math.round(((projectsCount - prevProjectsCount) / prevProjectsCount) * 100) : 0,
        tasks: prevTasksCount > 0 ? Math.round(((tasksCount - prevTasksCount) / prevTasksCount) * 100) : 0,
        members: 0,
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
    });
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

