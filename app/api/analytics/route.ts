import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";
import { startOfDay, subDays, eachDayOfInterval, format } from "date-fns";

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get("workspaceId");

        if (!workspaceId) {
            return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
        }

        // Check plan limits for advanced analytics
        try {
            const { enforcePlanLimit } = await import("@/lib/plan-limits");
            await enforcePlanLimit(workspaceId, "analytics", 0);
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        const db = getPrismaClient(workspaceId);

        // 1. Activity Over Time (Last 7 days)
        const sevenDaysAgo = subDays(startOfDay(new Date()), 6);
        const activities = await db.activity.findMany({
            where: {
                workspaceId,
                createdAt: { gte: sevenDaysAgo }
            },
            select: { createdAt: true }
        });

        const days = eachDayOfInterval({
            start: sevenDaysAgo,
            end: new Date()
        });

        const activityData = days.map(day => {
            const dateStr = format(day, "MMM dd");
            const count = activities.filter(a => format(new Date(a.createdAt), "MMM dd") === dateStr).length;
            return { date: dateStr, activities: count };
        });

        // 2. Task Status Distribution
        const tasks = await db.task.findMany({
            where: { workspaceId },
            select: { status: true, title: true, projectId: true }
        });

        const statusMap = tasks.reduce((acc: any, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
        }, {});

        const statusData = [
            { name: "To Do", value: statusMap["todo"] || 0, fill: "#ef4444" },
            { name: "In Progress", value: statusMap["in-progress"] || 0, fill: "#f59e0b" },
            { name: "Done", value: statusMap["done"] || 0, fill: "#10b981" }
        ];

        // 3. Resource Allocation (Tasks per Project)
        const projects = await db.project.findMany({
            where: { workspaceId },
            select: { id: true, name: true }
        });

        const projectData = projects.map(p => {
            const count = tasks.filter(t => t.projectId === p.id).length;
            return { name: p.name, value: count };
        });

        // 4. Workspace Treemap Data
        const treemapData = {
            name: "Workspace",
            children: projects.map(p => ({
                name: p.name,
                size: tasks.filter(t => t.projectId === p.id).length
            }))
        };

        return NextResponse.json({
            activityData,
            statusData,
            projectData,
            treemapData
        });

    } catch (error) {
        console.error("Analytics GET error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
