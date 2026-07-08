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

    const [
      projectsCount, tasksCount, membersCount, recentProjects, recentTasks,
      activities, statuses, taskCounts
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
      prisma.status.findMany({ where: { workspaceId }, orderBy: { order: "asc" } }),
      prisma.task.groupBy({
        by: ['status', 'priority', 'statusId'],
        where: whereTask,
        _count: true,
      }),
    ]);

    // Compute completion rate from aggregated counts
    const completionStatusName = statuses[statuses.length - 1]?.name?.toLowerCase() || "completed";
    const completedCount = taskCounts.filter(t =>
      t.status?.toLowerCase() === completionStatusName ||
      t.statusId === statuses[statuses.length - 1]?.id
    ).reduce((sum, t) => sum + t._count, 0);
    const totalTaskCount = taskCounts.reduce((sum, t) => sum + t._count, 0);
    const completionRate = totalTaskCount > 0 ? Math.round((completedCount / totalTaskCount) * 100) : 0;

    // Status Distribution from aggregated data
    const statusDistribution = statuses.map(s => {
      const count = taskCounts
        .filter(t => t.statusId === s.id || t.status?.toLowerCase() === s.name.toLowerCase())
        .reduce((sum, t) => sum + t._count, 0);
      return { name: s.name, value: count };
    });

    // Priority Distribution from aggregated data
    const priorityMap: Record<string, number> = { low: 0, medium: 0, high: 0, urgent: 0 };
    for (const t of taskCounts) {
      if (t.priority) priorityMap[t.priority] = (priorityMap[t.priority] || 0) + t._count;
    }

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
      recentProjects: recentProjects.map(p => ({ id: p.id, name: p.name, tasksCount: p._count.tasks })),
      recentTasks: recentTasks.map(t => ({ id: t.id, title: t.title, status: t.status, project: t.project, priority: t.priority })),
      recentActivities,
      activityTrends,
      statusDistribution,
      priorityDistribution: Object.entries(priorityMap).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })),
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

