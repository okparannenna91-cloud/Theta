import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findAcrossShards } from "@/lib/prisma";
import { Board } from "@prisma/client";
import { z } from "zod";

const columnSchema = z.object({
    name: z.string().min(1),
    order: z.number().default(0),
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
        const data = columnSchema.parse(body);

        const { data: board, db } = await findAcrossShards<any>("board", { id: params.id });

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

        const column = await db.column.create({
            data: {
                name: data.name,
                order: data.order,
                boardId: params.id,
            },
        });

        return NextResponse.json(column);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        console.error("Create column error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
