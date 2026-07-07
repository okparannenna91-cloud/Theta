import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { getAccessibleProjectIds } from "@/lib/project-permissions";
import { getPlanLimits } from "@/lib/plan-limits";
import { subDays, isAfter, isBefore, startOfDay, endOfDay, format } from "date-fns";

type TaskWithProject = {
    id: string;
    title: string;
    status: string;
    statusId: string | null;
    priority: string;
    userId: string | null;
    projectId: string | null;
    workspaceId: string;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
    dueDate: Date | null;
    project: { id: string; name: string } | null;
};

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get("workspaceId");
        const daysParam = searchParams.get("days") || "30";
        const days = parseInt(daysParam, 10);
        if (isNaN(days) || days < 1 || days > 365) {
            return NextResponse.json({ error: "days must be a number between 1 and 365" }, { status: 400 });
        }

        if (!workspaceId) {
            return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
        }

        const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const cutoffDate = subDays(new Date(), days);

        // Get accessible project IDs for permission filtering
        const accessibleProjectIds = await getAccessibleProjectIds(user.id, workspaceId);

        // Fetch fundamental data (Relationship & Analytics Accuracy Fix)
        const [projects, tasks, statuses] = await Promise.all([
            prisma.project.findMany({
                where: { workspaceId, id: { in: accessibleProjectIds } },
                include: { _count: { select: { tasks: true } } }
            }),
            prisma.task.findMany({
                where: { workspaceId, projectId: { in: accessibleProjectIds } },
                include: { project: true }
            }),
            prisma.status.findMany({
                where: { workspaceId },
                orderBy: { order: 'asc' }
            })
        ]);

        // Identify 'Done/Completed' status dynamically
        const completionStatus = statuses[statuses.length - 1];
        const completionIds = statuses.filter(s => s.name.toLowerCase() === 'done').map(s => s.id);
        if (completionStatus && !completionIds.includes(completionStatus.id)) {
            completionIds.push(completionStatus.id);
        }

        const isTaskCompleted = (task: TaskWithProject) =>
            completionIds.includes(task.statusId ?? '') ||
            (task.status && ['done'].includes(task.status.toLowerCase()));

        const totalProjects = projects.length;
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(isTaskCompleted);
        const pendingTasks = tasks.filter(t => !isTaskCompleted(t));
        const overdueTasks = pendingTasks.filter((task: TaskWithProject) => task.dueDate && isBefore(new Date(task.dueDate), new Date()));

        const projectCompletionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;

        // Grouping Data for Charts (Over Time)
        const dateMap = new Map<string, { date: string; created: number; completed: number }>();
        for (let i = days - 1; i >= 0; i--) {
            const dateStr = format(subDays(new Date(), i), "MMM dd");
            dateMap.set(dateStr, { date: dateStr, created: 0, completed: 0 });
        }

        tasks.forEach((task: TaskWithProject) => {
            if (isAfter(new Date(task.createdAt), cutoffDate)) {
                const dateStr = format(new Date(task.createdAt), "MMM dd");
                if (dateMap.has(dateStr)) {
                    dateMap.get(dateStr)!.created += 1;
                }
            }
            if (isTaskCompleted(task) && task.completedAt && isAfter(new Date(task.completedAt), cutoffDate)) {
                const dateStr = format(new Date(task.completedAt), "MMM dd");
                if (dateMap.has(dateStr)) {
                    dateMap.get(dateStr)!.completed += 1;
                }
            }
        });

        const tasksOverTime = Array.from(dateMap.values());

        // Team Productivity (Tasks completed per user)
        const productivityMap = new Map<string, number>();
        completedTasks.forEach((task: TaskWithProject) => {
            if (task.userId) {
                productivityMap.set(task.userId, (productivityMap.get(task.userId) || 0) + 1);
            }
        });

        // Resolve user ids globally
        const userIdsToResolve = Array.from(productivityMap.keys());
        const users = await prisma.user.findMany({
            where: { id: { in: userIdsToResolve } },
            select: { id: true, name: true, imageUrl: true }
        });

        const teamProductivity = users
            .map((u: { id: string; name: string | null; imageUrl: string | null }) => ({
                name: u.name,
                imageUrl: u.imageUrl,
                tasksCompleted: productivityMap.get(u.id) || 0
            }))
            .sort((a, b) => b.tasksCompleted - a.tasksCompleted);

        // Most Active Projects
        const projectActivityMap = new Map<string, number>();
        tasks.forEach((task: TaskWithProject) => {
            if (isAfter(new Date(task.updatedAt), cutoffDate)) {
                projectActivityMap.set(task.projectId ?? '', (projectActivityMap.get(task.projectId ?? '') || 0) + 1);
            }
        });

        const mostActiveProjects = projects
            .map((p: { id: string; name: string }) => ({
                id: p.id,
                name: p.name,
                activityCount: projectActivityMap.get(p.id) || 0
            }))
            .sort((a, b) => b.activityCount - a.activityCount)
            .slice(0, 5);

        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { plan: true }
        });
        const limits = getPlanLimits((workspace?.plan as import("@/lib/plan-limits").PlanName) || "free");

        return NextResponse.json({
            totals: {
                projects: totalProjects,
                tasks: totalTasks,
                completedTasks: completedTasks.length,
                pendingTasks: pendingTasks.length,
                overdueTasks: overdueTasks.length,
                projectCompletionRate: Math.round(projectCompletionRate)
            },
            tasksOverTime,
            teamProductivity,
            mostActiveProjects,
            limits: {
                hasAccess: limits.hasAdvancedAnalytics
            }
        });
    } catch (error) {
        console.error("Analytics API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
