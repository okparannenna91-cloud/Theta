import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { publishToChannel, getWorkspaceChannel } from "@/lib/ably";

const updateStatusSchema = z.object({
    name: z.string().min(1).max(50).optional(),
    color: z.string().optional(),
    order: z.number().int().optional(),
    workspaceId: z.string(),
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

        const body = await req.json();
        const data = updateStatusSchema.parse(body);

        // Verify the status exists and user has access
        const existing = await prisma.status.findUnique({
            where: { id: params.id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Status not found" }, { status: 404 });
        }

        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: existing.workspaceId,
                    userId: user.id,
                },
            },
        });

        if (!membership) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // If renaming, update all tasks that reference this status
        if (data.name && data.name !== existing.name) {
            // Check uniqueness within the project
            const conflict = await prisma.status.findFirst({
                where: {
                    projectId: existing.projectId,
                    name: { equals: data.name, mode: "insensitive" },
                    id: { not: params.id },
                },
            });

            if (conflict) {
                return NextResponse.json({ error: "Status name already exists" }, { status: 400 });
            }

            // Update all tasks with this statusId to use the new name string
            await prisma.task.updateMany({
                where: { statusId: params.id },
                data: { status: data.name.toLowerCase().replace(/\s+/g, "_") },
            });
        }

        const updated = await prisma.status.update({
            where: { id: params.id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.color !== undefined && { color: data.color }),
                ...(data.order !== undefined && { order: data.order }),
            },
        });

        // Publish real-time update
        await publishToChannel(
            getWorkspaceChannel(existing.workspaceId),
            "status:updated",
            updated
        );

        return NextResponse.json(updated);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        if ((error as any).code === "P2002") {
            return NextResponse.json({ error: "Status name already exists" }, { status: 400 });
        }
        logger.error("Update status error:", error);
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

        const existing = await prisma.status.findUnique({
            where: { id: params.id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Status not found" }, { status: 404 });
        }

        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: existing.workspaceId,
                    userId: user.id,
                },
            },
        });

        if (!membership) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Check if any tasks use this status
        const taskCount = await prisma.task.count({
            where: { statusId: params.id },
        });

        if (taskCount > 0) {
            const { searchParams } = new URL(req.url);
            const migrateToStatusId = searchParams.get("migrateToStatusId");

            if (!migrateToStatusId) {
                return NextResponse.json(
                    {
                        error: `Cannot delete: ${taskCount} task(s) use this status. Provide migrateToStatusId to migrate them first.`,
                        taskCount,
                    },
                    { status: 400 }
                );
            }

            // Verify target status exists in same project
            const targetStatus = await prisma.status.findUnique({
                where: { id: migrateToStatusId },
            });

            if (!targetStatus || targetStatus.projectId !== existing.projectId) {
                return NextResponse.json({ error: "Invalid target status" }, { status: 400 });
            }

            // Migrate tasks to target status
            await prisma.task.updateMany({
                where: { statusId: params.id },
                data: {
                    statusId: migrateToStatusId,
                    status: targetStatus.name.toLowerCase().replace(/\s+/g, "_"),
                },
            });
        }

        await prisma.status.delete({
            where: { id: params.id },
        });

        // Publish real-time update
        await publishToChannel(
            getWorkspaceChannel(existing.workspaceId),
            "status:deleted",
            { id: params.id, workspaceId: existing.workspaceId }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error("Delete status error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
