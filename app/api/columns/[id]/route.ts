import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma, findAcrossShards } from "@/lib/prisma";
import { Column } from "@prisma/client";
import { z } from "zod";

const columnSchema = z.object({
    name: z.string().min(1).optional(),
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

        const body = await req.json();
        const data = columnSchema.parse(body);

        const { data: column, db } = await findAcrossShards<any>("column", { id: params.id });

        if (!column) {
            return NextResponse.json({ error: "Column not found" }, { status: 404 });
        }

        // Fetch board to get workspaceId for auth
        const board = await db.board.findUnique({
            where: { id: column.boardId },
            select: { workspaceId: true }
        });

        if (!board) {
            return NextResponse.json({ error: "Board not found" }, { status: 404 });
        }

        // Verify workspace access (Workspace records are on Shard 1 / primary)
        const { prisma } = await import("@/lib/prisma");
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

        const updatedColumn = await db.column.update({
            where: { id: params.id },
            data: {
                name: data.name,
                order: data.order,
            },
        });

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

        const { data: column, db } = await findAcrossShards<any>("column", { id: params.id });

        if (!column) {
            return NextResponse.json({ error: "Column not found" }, { status: 404 });
        }

        // Fetch board to get workspaceId for auth
        const board = await db.board.findUnique({
            where: { id: column.boardId },
            select: { workspaceId: true }
        });

        if (!board) {
            return NextResponse.json({ error: "Board not found" }, { status: 404 });
        }

        // Verify workspace access
        const { prisma } = await import("@/lib/prisma");
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

        await db.column.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete column error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
