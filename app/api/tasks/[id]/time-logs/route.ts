import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessProjectResource } from "@/lib/project-permissions";
import { z } from "zod";

const timeLogSchema = z.object({
    duration: z.number().positive(),
    description: z.string().optional(),
});

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { duration, description } = timeLogSchema.parse(body);

        const task = await prisma.task.findUnique({ where: { id: params.id } });
        if (!task) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        const { verifyWorkspaceAccess } = await import("@/lib/workspace");
        const hasAccess = await verifyWorkspaceAccess(user.id, task.workspaceId);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const hasProjectAccess = await canAccessProjectResource(user.id, task.workspaceId, task.projectId);
        if (!hasProjectAccess) {
            return NextResponse.json({ error: "Access denied to this project" }, { status: 403 });
        }

        const timeLog = await prisma.timeLog.create({
            data: {
                duration,
                description,
                taskId: params.id,
                userId: user.id,
            },
        });

        return NextResponse.json(timeLog);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        console.error("Create time log error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const task = await prisma.task.findUnique({ where: { id: params.id } });
        if (!task) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        const { verifyWorkspaceAccess } = await import("@/lib/workspace");
        const hasAccess = await verifyWorkspaceAccess(user.id, task.workspaceId);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const hasProjectAccess = await canAccessProjectResource(user.id, task.workspaceId, task.projectId);
        if (!hasProjectAccess) {
            return NextResponse.json({ error: "Access denied to this project" }, { status: 403 });
        }

        const rawTimeLogs = await prisma.timeLog.findMany({
            where: { taskId: params.id },
            orderBy: { createdAt: "desc" },
        });

        const userIdsToFetch = new Set<string>();
        rawTimeLogs.forEach((t: any) => {
            if (t.userId) userIdsToFetch.add(t.userId);
        });

        const users = await prisma.user.findMany({
            where: { id: { in: Array.from(userIdsToFetch) } },
            select: { id: true, name: true, imageUrl: true }
        });
        
        const userMap = new Map(users.map(u => [u.id, u]));

        const timeLogs = rawTimeLogs.map((t: any) => ({
            ...t,
            user: userMap.get(t.userId) || null
        }));

        return NextResponse.json(timeLogs);
    } catch (error) {
        console.error("Get time logs error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
