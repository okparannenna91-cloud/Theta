import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
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
            select: { workspaceId: true }
        });

        if (!board) {
            return NextResponse.json({ error: "Board not found" }, { status: 404 });
        }

        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: board.workspaceId,
                    userId: user.id
                }
            }
        });

        if (!membership) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
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
            select: { workspaceId: true }
        });

        if (!board) {
            return NextResponse.json({ error: "Board not found" }, { status: 404 });
        }

        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: board.workspaceId,
                    userId: user.id
                }
            }
        });

        if (!membership) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Move orphaned tasks to another column if available
        const remainingColumns = await prisma.column.findMany({
            where: { boardId: column.boardId, id: { not: params.id } },
            select: { id: true },
            orderBy: { order: "asc" },
        });

        const fallbackColumnId = remainingColumns.length > 0 ? remainingColumns[0].id : null;

        await prisma.task.updateMany({
            where: { columnId: params.id },
            data: { columnId: fallbackColumnId },
        });

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
