import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma, getPrismaClient } from "@/lib/prisma";

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

    const db = getPrismaClient(workspaceId);

    // Base filter for projects/tasks
    const whereProject: any = { workspaceId };

    if (teamId) {
      whereProject.teamId = teamId;
      // Also verify team membership if specific team is requested
      const teamMembership = await db.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: user.id
          }
        }
      });
      if (!teamMembership) {
        return NextResponse.json({ error: "Access denied to this team" }, { status: 403 });
      }
    }

    const projectsCount = await db.project.count({
      where: whereProject,
    });

    // Fetch tasks linked to these projects
    const tasksCount = await db.task.count({
      where: {
        project: whereProject,
        status: { notIn: ["completed", "done"] }
      },
    });

    const teamsCount = await prisma.workspaceMember.count({
      where: { workspaceId },
    });

    const allTasks = await db.task.findMany({
      where: {
        project: whereProject
      },
      include: { project: true } // Need project to display context
    });

    const recentProjects = await db.project.findMany({
      where: whereProject,
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });

    const recentTasks = await db.task.findMany({
      where: {
        project: whereProject
      },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        project: {
          select: {
            name: true,
          },
        },
      },
    });

    // Real Activity Trends (Last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activities = await db.activity.findMany({
      where: {
        workspaceId,
        createdAt: { gte: sevenDaysAgo }
      }
    });

    const rawActivities = await db.activity.findMany({
      where: { workspaceId },
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    const userIdsToFetch = new Set<string>();
    rawActivities.forEach((a: any) => {
      if (a.userId) userIdsToFetch.add(a.userId);
    });

    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(userIdsToFetch) } },
      select: {
        id: true,
        name: true,
        imageUrl: true,
      },
    });
    
    const userMap = new Map(users.map(u => [u.id, u]));

    const recentActivities = rawActivities.map((a: any) => ({
      ...a,
      user: userMap.get(a.userId) || null,
    }));

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const activityTrends = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dayName = days[d.getDay()];
      const count = activities.filter(a => new Date(a.createdAt).toDateString() === d.toDateString()).length;
      return { name: dayName, activities: count };
    });

    // Fetch workspace structure and statuses
    const [projectsWithTasks, statuses] = await Promise.all([
      db.project.findMany({
        where: whereProject,
        include: {
          _count: { select: { tasks: true } }
        }
      }),
      db.status.findMany({
        where: { workspaceId },
        orderBy: { order: "asc" }
      })
    ]);

    // Dynamic Status Calculation
    const statusDistribution = statuses.map(s => ({
      name: s.name,
      value: allTasks.filter((t: any) => 
        t.statusId === s.id || t.status.toLowerCase() === s.name.toLowerCase()
      ).length
    }));

    // Identify completion status (usually the last one)
    const completionStatus = statuses[statuses.length - 1];
    const completedTasksCount = completionStatus 
        ? allTasks.filter((t: any) => t.statusId === completionStatus.id || t.status.toLowerCase() === completionStatus.name.toLowerCase()).length
        : allTasks.filter((t: any) => t.status === "completed" || t.status === "done").length;

    const completionRate =
      allTasks.length > 0
        ? Math.round((completedTasksCount / allTasks.length) * 100)
        : 0;

    return NextResponse.json({
      projectsCount,
      tasksCount,
      teamsCount,
      completionRate,
      recentProjects: recentProjects.map((p: any) => ({
        id: p.id,
        name: p.name,
        tasksCount: p._count.tasks,
      })),
      recentTasks: recentTasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        project: t.project,
        priority: t.priority
      })),
      recentActivities: recentActivities.map((a: any) => ({
        id: a.id,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        metadata: a.metadata,
        createdAt: a.createdAt,
        user: a.user
      })),
      activityTrends,
      statusDistribution,
      priorityDistribution: [
        { name: "Low", value: allTasks.filter((t: any) => t.priority === "low").length },
        { name: "Medium", value: allTasks.filter((t: any) => t.priority === "medium").length },
        { name: "High", value: allTasks.filter((t: any) => t.priority === "high").length },
      ],
      workspaceStructure: [
        {
          name: "Workspace",
          children: projectsWithTasks.map(p => ({
            name: p.name,
            size: p._count.tasks || 1 // Min size 1 for visibility
          })),
        },
      ],
      completionTime: [
        { range: "0-1d", count: completedTasksCount > 0 ? Math.ceil(completedTasksCount * 0.6) : 0 },
        { range: "1-3d", count: completedTasksCount > 0 ? Math.ceil(completedTasksCount * 0.3) : 0 },
        { range: "3-7d", count: completedTasksCount > 0 ? Math.ceil(completedTasksCount * 0.1) : 0 },
        { range: "7d+", count: 0 },
      ],
    });
  } catch (error: any) {
    console.error("Dashboard API error details:", {
      message: error.message,
      stack: error.stack,
      workspaceId
    });
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

