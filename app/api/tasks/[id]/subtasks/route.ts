import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessProjectResource } from "@/lib/project-permissions";
import { recalculateTaskProgress, updateParentTask } from "@/lib/task-utils";
import { z } from "zod";

const subtaskSchema = z.object({
    title: z.string().min(1),
    order: z.number().optional(),
});

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

        const subtasks = await prisma.subtask.findMany({
            where: { taskId: params.id },
            orderBy: { order: "asc" },
        });

        return NextResponse.json(subtasks);
    } catch (error) {
        console.error("Fetch subtasks error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(
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

        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: task.workspaceId,
                    userId: user.id,
                },
            },
        });

        if (!membership) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const hasProjectAccess = await canAccessProjectResource(user.id, task.workspaceId, task.projectId);
        if (!hasProjectAccess) {
            return NextResponse.json({ error: "Access denied to this project" }, { status: 403 });
        }

        const body = await req.json();
        const data = subtaskSchema.parse(body);

        const subtask = await prisma.subtask.create({
            data: {
                title: data.title,
                order: data.order || 0,
                taskId: params.id,
            },
        });

        await recalculateTaskProgress(params.id);

        // Cascade progress update to grandparent tasks
        if (task.parentId) {
            await updateParentTask(task.parentId, task.workspaceId);
        }

        return NextResponse.json(subtask);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        console.error("Create subtask error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
