import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireProjectWriteAccess } from "@/lib/project-permissions";
import { publishToChannel, getBoardChannel } from "@/lib/ably";

const columnSchema = z.object({
    name: z.string().min(1),
    order: z.number().default(0),
    columnType: z.string().default("text"),
    settings: z.any().optional(),
    width: z.number().optional(),
    color: z.string().optional(),
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

        const board = await prisma.board.findUnique({ where: { id: params.id } });

        if (!board) {
            return NextResponse.json({ error: "Board not found" }, { status: 404 });
        }

        const accessCheck = await requireProjectWriteAccess(user.id, board.projectId, board.workspaceId);
        if (!accessCheck.allowed) {
            return NextResponse.json({ error: accessCheck.error!.message }, { status: accessCheck.error!.status });
        }

        const { enforcePlanLimit } = await import("@/lib/plan-limits");
        const columnCount = await prisma.column.count({ where: { boardId: params.id } });
        await enforcePlanLimit(board.workspaceId, "columns", columnCount);

        const column = await prisma.column.create({
            data: {
                name: data.name,
                order: data.order ?? (await prisma.column.count({ where: { boardId: params.id } })),
                columnType: data.columnType,
                settings: data.settings || undefined,
                width: data.width || 200,
                color: data.color,
                boardId: params.id,
            },
        });

        // Also create a matching workflow status if one doesn't exist with this name
        const existingStatus = await prisma.status.findFirst({
            where: {
                projectId: board.projectId,
                name: { equals: data.name, mode: "insensitive" },
            },
        });

        if (!existingStatus) {
            const lastStatus = await prisma.status.findFirst({
                where: { projectId: board.projectId },
                orderBy: { order: "desc" },
            });

            await prisma.status.create({
                data: {
                    name: data.name,
                    color: data.color || "#4f46e5",
                    order: (lastStatus?.order ?? -1) + 1,
                    projectId: board.projectId,
                    workspaceId: board.workspaceId,
                },
            });
        }

        // Notify via Ably
        const boardChannel = getBoardChannel(board.workspaceId, params.id);
        await publishToChannel(boardChannel, "column:created", column);

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
