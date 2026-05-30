import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma, findAcrossShards } from "@/lib/prisma";
import { z } from "zod";

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

        const { data: subtask, db } = await findAcrossShards<any>("subtask", {
            id: params.id,
            include: { task: { select: { workspaceId: true } } },
        });

        if (!subtask) {
            return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
        }

        // Verify workspace access (Workspace records are on Shard 1 / primary)
        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: subtask.task.workspaceId,
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

        const { data: subtaskToDelete, db: deleteDb } = await findAcrossShards<any>("subtask", {
            id: params.id,
            include: { task: { select: { workspaceId: true } } },
        });

        if (!subtaskToDelete) {
            return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
        }

        // Verify workspace access
        const deleteMembership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: subtaskToDelete.task.workspaceId,
                    userId: user.id,
                },
            },
        });

        if (!deleteMembership) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        await (deleteDb as any).subtask.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete subtask error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
