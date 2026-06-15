import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma, findAcrossShards } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
    title: z.string().min(1).optional(),
    completed: z.boolean().optional(),
    order: z.number().optional(),
});

async function recalculateTaskProgress(taskId: string, db: any) {
    const [subtasks, completedCount] = await Promise.all([
        db.subtask.count({ where: { taskId } }),
        db.subtask.count({ where: { taskId, completed: true } }),
    ]);
    const progress = subtasks > 0 ? Math.round((completedCount / subtasks) * 100) : 0;
    await db.task.update({
        where: { id: taskId },
        data: { progress },
    });
}

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: subtask, db } = await findAcrossShards<any>("subtask", { id: params.id });

        if (!subtask) {
            return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
        }

        const task = await (db as any).task.findUnique({
            where: { id: subtask.taskId },
            select: { workspaceId: true },
        });

        if (!task) {
            return NextResponse.json({ error: "Parent task not found" }, { status: 404 });
        }

        // Verify workspace access (Workspace records are on Shard 1 / primary)
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

        const body = await req.json();
        const data = updateSchema.parse(body);

        const updated = await (db as any).subtask.update({
            where: { id: params.id },
            data,
        });

        await recalculateTaskProgress(subtask.taskId, db);

        return NextResponse.json(updated);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        console.error("Update subtask error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: subtaskToDelete, db: deleteDb } = await findAcrossShards<any>("subtask", { id: params.id });

        if (!subtaskToDelete) {
            return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
        }

        const taskToUpdate = await (deleteDb as any).task.findUnique({
            where: { id: subtaskToDelete.taskId },
            select: { workspaceId: true },
        });

        if (!taskToUpdate) {
            return NextResponse.json({ error: "Parent task not found" }, { status: 404 });
        }

        // Verify workspace access
        const deleteMembership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: taskToUpdate.workspaceId,
                    userId: user.id,
                },
            },
        });

        if (!deleteMembership) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const taskId = subtaskToDelete.taskId;

        await (deleteDb as any).subtask.delete({
            where: { id: params.id },
        });

        await recalculateTaskProgress(taskId, deleteDb);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete subtask error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
