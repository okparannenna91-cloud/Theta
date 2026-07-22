import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireProjectAccess, requireProjectWriteAccess } from "@/lib/project-permissions";
import { publishToChannel, getBoardChannel } from "@/lib/ably";

const columnSchema = z.object({
    name: z.string().min(1).optional(),
    order: z.number().optional(),
    wipLimit: z.number().nullable().optional(),
    color: z.string().nullable().optional(),
    columnType: z.string().optional(),
    settings: z.any().optional(),
    width: z.number().optional(),
    visible: z.boolean().optional(),
    pinned: z.boolean().optional(),
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
        const data = columnSchema.parse(body);

        const column = await prisma.column.findUnique({ where: { id: params.id } });

        if (!column) {
            return NextResponse.json({ error: "Column not found" }, { status: 404 });
        }

        const board = await prisma.board.findUnique({
            where: { id: column.boardId },
            select: { workspaceId: true, projectId: true }
        });

        if (!board) {
            return NextResponse.json({ error: "Board not found" }, { status: 404 });
        }

        const accessCheck = await requireProjectWriteAccess(user.id, board.projectId, board.workspaceId);
        if (!accessCheck.allowed) {
            return NextResponse.json({ error: accessCheck.error!.message }, { status: accessCheck.error!.status });
        }

        const updatedColumn = await prisma.column.update({
            where: { id: params.id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.order !== undefined && { order: data.order }),
                ...(data.wipLimit !== undefined && { wipLimit: data.wipLimit }),
                ...(data.color !== undefined && { color: data.color }),
                ...(data.columnType !== undefined && { columnType: data.columnType }),
                ...(data.settings !== undefined && { settings: data.settings }),
                ...(data.width !== undefined && { width: data.width }),
                ...(data.visible !== undefined && { visible: data.visible }),
                ...(data.pinned !== undefined && { pinned: data.pinned }),
            },
        });

        // If column name changed, rename the matching Status and update all tasks
        if (data.name && data.name !== column.name) {
            const matchingStatus = await prisma.status.findFirst({
                where: {
                    projectId: board.projectId,
                    name: { equals: column.name, mode: "insensitive" },
                },
            });

            if (matchingStatus) {
                // Check uniqueness before renaming
                const conflict = await prisma.status.findFirst({
                    where: {
                        projectId: board.projectId,
                        name: { equals: data.name, mode: "insensitive" },
                        id: { not: matchingStatus.id },
                    },
                });

                if (!conflict) {
                    const slug = data.name.toLowerCase().replace(/\s+/g, "_");

                    await prisma.status.update({
                        where: { id: matchingStatus.id },
                        data: {
                            name: data.name,
                            ...(data.color !== undefined && { color: data.color }),
                        },
                    });

                    // Update all tasks referencing this status
                    await prisma.task.updateMany({
                        where: { statusId: matchingStatus.id },
                        data: { status: slug },
                    });
                }
            }
        }
        
        // Notify via Ably
        const boardChannel = getBoardChannel(board.workspaceId, updatedColumn.boardId);
        await publishToChannel(boardChannel, "column:updated", updatedColumn);
        
        return NextResponse.json(updatedColumn);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        console.error("Update column error:", error);
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

        const column = await prisma.column.findUnique({ where: { id: params.id } });

        if (!column) {
            return NextResponse.json({ error: "Column not found" }, { status: 404 });
        }

        const board = await prisma.board.findUnique({
            where: { id: column.boardId },
            select: { workspaceId: true, projectId: true }
        });

        if (!board) {
            return NextResponse.json({ error: "Board not found" }, { status: 404 });
        }

        const accessCheck = await requireProjectWriteAccess(user.id, board.projectId, board.workspaceId);
        if (!accessCheck.allowed) {
            return NextResponse.json({ error: accessCheck.error!.message }, { status: accessCheck.error!.status });
        }

        // Move orphaned tasks to another column if available
        const remainingColumns = await prisma.column.findMany({
            where: { boardId: column.boardId, id: { not: params.id } },
            select: { id: true, name: true },
            orderBy: { order: "asc" },
        });

        const fallbackColumnId = remainingColumns.length > 0 ? remainingColumns[0].id : null;

        // Find the Status for the deleted column and the target column
        const deletedColumnStatus = await prisma.status.findFirst({
            where: {
                projectId: board.projectId,
                name: { equals: column.name, mode: "insensitive" },
            },
        });

        let targetStatusSlug = "todo";
        if (fallbackColumnId && remainingColumns.length > 0) {
            const targetStatus = await prisma.status.findFirst({
                where: {
                    projectId: board.projectId,
                    name: { equals: remainingColumns[0].name, mode: "insensitive" },
                },
            });
            if (targetStatus) {
                targetStatusSlug = targetStatus.name.toLowerCase().replace(/\s+/g, "_");
            }
        }

        // Migrate tasks: update columnId AND status
        await prisma.task.updateMany({
            where: { columnId: params.id },
            data: {
                columnId: fallbackColumnId,
                ...(deletedColumnStatus && {
                    statusId: deletedColumnStatus.id,
                    status: targetStatusSlug,
                }),
            },
        });

        // Delete the orphaned Status record
        if (deletedColumnStatus) {
            await prisma.status.delete({
                where: { id: deletedColumnStatus.id },
            });

            // Publish status update via Ably
            await publishToChannel(
                getBoardChannel(board.workspaceId, column.boardId),
                "status:deleted",
                { id: deletedColumnStatus.id, workspaceId: board.workspaceId }
            );
        }

        await prisma.column.delete({
            where: { id: params.id },
        });

        // Notify via Ably
        const boardChannel = getBoardChannel(board.workspaceId, column.boardId);
        await publishToChannel(boardChannel, "column:deleted", { id: params.id });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete column error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
