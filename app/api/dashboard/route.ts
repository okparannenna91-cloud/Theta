import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");
    let workspaceId = searchParams.get("workspaceId");

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

    // Base filter for projects/tasks
    const whereProject: any = { workspaceId };

    if (teamId) {
      whereProject.teamId = teamId;
      // Also verify team membership if specific team is requested
      const teamMembership = await prisma.teamMember.findUnique({
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
    } else {
      // If no team specified, we might want to show personal projects OR all workspace projects.
      // For now, let's show all workspace projects (collaboration focus).
      // If you want to only show personal projects when no team is selected:
      // whereProject.teamId = null; 
      // whereProject.userId = user.id;
    }

    const projectsCount = await prisma.project.count({
      where: whereProject,
    });

    // Fetch tasks linked to these projects
    const tasksCount = await prisma.task.count({
      where: {
        project: whereProject,
        status: { not: "completed" }
      },
    });

    const teamsCount = await prisma.teamMember.count({
      where: { userId: user.id },
    });

    const allTasks = await prisma.task.findMany({
      where: {
        project: whereProject
      },
      include: { project: true } // Need project to display context
    });

    const completedTasksList = allTasks.filter((t: any) => t.status === "completed");
    const completedTasksCount = completedTasksList.length;
    const completionRate =
      allTasks.length > 0
        ? Math.round((completedTasksCount / allTasks.length) * 100)
        : 0;

    const recentProjects = await prisma.project.findMany({
      where: whereProject,
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });

    const recentTasks = await prisma.task.findMany({
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
    const activities = await prisma.activity.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: sevenDaysAgo }
      }
    });

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const activityTrends = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dayName = days[d.getDay()];
      const count = activities.filter(a => new Date(a.createdAt).toDateString() === d.toDateString()).length;
      return { name: dayName, tasks: count };
    });

    // Project structure for treemap
    const projectsWithTasks = await prisma.project.findMany({
      where: whereProject,
      include: {
        _count: { select: { tasks: true } }
      }
    });

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
      activityTrends,
      statusDistribution: [
        { name: "Todo", value: allTasks.filter(t => t.status === "todo").length },
        { name: "In Progress", value: allTasks.filter(t => t.status === "in_progress").length },
        { name: "Review", value: allTasks.filter(t => t.status === "review").length },
        { name: "Done", value: completedTasksCount },
      ],
      priorityDistribution: [
        { name: "Low", value: allTasks.filter(t => t.priority === "low").length },
        { name: "Medium", value: allTasks.filter(t => t.priority === "medium").length },
        { name: "High", value: allTasks.filter(t => t.priority === "high").length },
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
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

