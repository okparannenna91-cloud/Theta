import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { publishToChannel, getWorkspaceChannel } from "@/lib/ably";
import { recalculateTaskProgress, updateParentTask } from "@/lib/task-utils";

const updateSchema = z.object({
    title: z.string().min(1).optional(),
    completed: z.boolean().optional(),
    order: z.number().optional(),
});

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const subtask = await prisma.subtask.findUnique({ where: { id: params.id } });

        if (!subtask) {
            return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
        }

        const task = await prisma.task.findUnique({
            where: { id: subtask.taskId },
            select: { workspaceId: true, parentId: true },
        });

        if (!task) {
            return NextResponse.json({ error: "Parent task not found" }, { status: 404 });
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

        const body = await req.json();
        const data = updateSchema.parse(body);

        const updated = await prisma.subtask.update({
            where: { id: params.id },
            data,
        });

        await recalculateTaskProgress(subtask.taskId);

        // Cascade progress update to grandparent tasks
        if (task.parentId) {
            await updateParentTask(task.parentId, task.workspaceId);
        }

        const workspaceChannel = getWorkspaceChannel(task.workspaceId);
        await publishToChannel(workspaceChannel, "subtask:updated", updated);

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

        const subtaskToDelete = await prisma.subtask.findUnique({ where: { id: params.id } });

        if (!subtaskToDelete) {
            return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
        }

        const taskToUpdate = await prisma.task.findUnique({
            where: { id: subtaskToDelete.taskId },
            select: { workspaceId: true, parentId: true },
        });

        if (!taskToUpdate) {
            return NextResponse.json({ error: "Parent task not found" }, { status: 404 });
        }

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

        await prisma.subtask.delete({
            where: { id: params.id },
        });

        await recalculateTaskProgress(taskId);

        // Cascade progress update to grandparent tasks
        if (taskToUpdate.parentId) {
            await updateParentTask(taskToUpdate.parentId, taskToUpdate.workspaceId);
        }

        const workspaceChannel = getWorkspaceChannel(taskToUpdate.workspaceId);
        await publishToChannel(workspaceChannel, "subtask:deleted", { id: params.id, taskId });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete subtask error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
