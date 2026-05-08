import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPrismaClient, prisma as globalPrisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { subDays, isAfter, isBefore, startOfDay, endOfDay, format } from "date-fns";

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

        if (!workspaceId) {
            return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
        }

        const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const db = getPrismaClient(workspaceId);
        const cutoffDate = subDays(new Date(), days);

        // Fetch fundamental data (Relationship & Analytics Accuracy Fix)
        const [projects, tasks, statuses] = await Promise.all([
            db.project.findMany({
                where: { workspaceId },
                include: { _count: { select: { tasks: true } } }
            }),
            db.task.findMany({
                where: { workspaceId },
                include: { project: true }
            }),
            db.status.findMany({
                where: { workspaceId },
                orderBy: { order: 'asc' }
            })
        ]);

        // Identify 'Done/Completed' status dynamically
        const completionStatus = statuses[statuses.length - 1];
        const completionIds = statuses.filter(s => s.name.toLowerCase() === 'done' || s.name.toLowerCase() === 'completed').map(s => s.id);
        if (completionStatus && !completionIds.includes(completionStatus.id)) {
            completionIds.push(completionStatus.id);
        }

        const isTaskCompleted = (t: any) => 
            completionIds.includes(t.statusId) || 
            ['done', 'completed'].includes(t.status.toLowerCase());

        const totalProjects = projects.length;
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(isTaskCompleted);
        const pendingTasks = tasks.filter(t => !isTaskCompleted(t));
        const overdueTasks = pendingTasks.filter((t: any) => t.dueDate && isBefore(new Date(t.dueDate), new Date()));
        
        const projectCompletionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;

        // Grouping Data for Charts (Over Time)
        const dateMap = new Map();
        for (let i = days - 1; i >= 0; i--) {
            const dateStr = format(subDays(new Date(), i), "MMM dd");
            dateMap.set(dateStr, { date: dateStr, created: 0, completed: 0 });
        }

        tasks.forEach((task: any) => {
            if (isAfter(new Date(task.createdAt), cutoffDate)) {
                const dateStr = format(new Date(task.createdAt), "MMM dd");
                if (dateMap.has(dateStr)) {
                    dateMap.get(dateStr).created += 1;
                }
            }
            if (isTaskCompleted(task) && task.completedAt && isAfter(new Date(task.completedAt), cutoffDate)) {
                const dateStr = format(new Date(task.completedAt), "MMM dd");
                if (dateMap.has(dateStr)) {
                    dateMap.get(dateStr).completed += 1;
                }
            }
        });

        const tasksOverTime = Array.from(dateMap.values());

        // Team Productivity (Tasks completed per user)
        const productivityMap = new Map();
        completedTasks.forEach((t: any) => {
            if (t.userId) {
                productivityMap.set(t.userId, (productivityMap.get(t.userId) || 0) + 1);
            }
        });

        // Resolve user ids globally
        const userIdsToResolve = Array.from(productivityMap.keys());
        const users = await globalPrisma.user.findMany({
            where: { id: { in: userIdsToResolve } },
            select: { id: true, name: true, imageUrl: true }
        });

        const teamProductivity = users.map((u: any) => ({
            name: u.name,
            imageUrl: u.imageUrl,
            tasksCompleted: productivityMap.get(u.id) || 0
        })).sort((a: any, b: any) => b.tasksCompleted - a.tasksCompleted);

        // Most Active Projects
        const projectActivityMap = new Map();
        tasks.forEach((t: any) => {
            if (isAfter(new Date(t.updatedAt), cutoffDate)) {
                projectActivityMap.set(t.projectId, (projectActivityMap.get(t.projectId) || 0) + 1);
            }
        });

        const mostActiveProjects = projects
            .map((p: any) => ({
                id: p.id,
                name: p.name,
                activityCount: projectActivityMap.get(p.id) || 0
            }))
            .sort((a: any, b: any) => b.activityCount - a.activityCount)
            .slice(0, 5); // Top 5

        const { getPlanLimits } = await import("@/lib/plan-limits");
        const workspace = await globalPrisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { plan: true }
        });
        const limits = getPlanLimits((workspace?.plan as any) || "free");

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
