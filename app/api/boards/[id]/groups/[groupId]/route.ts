import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireProjectAccess } from "@/lib/project-permissions";
import { publishToChannel, getBoardChannel } from "@/lib/ably";

const groupUpdateSchema = z.object({
    name: z.string().min(1).optional(),
    order: z.number().optional(),
    color: z.string().optional(),
    collapsed: z.boolean().optional(),
});

export async function PATCH(
    req: Request,
    { params }: { params: { id: string; groupId: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const data = groupUpdateSchema.parse(body);

        const group = await prisma.groups.findUnique({ where: { id: params.groupId } });
        if (!group) {
            return NextResponse.json({ error: "Group not found" }, { status: 404 });
        }

        const board = await prisma.board.findUnique({ where: { id: group.boardId } });
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

        const accessCheck = await requireProjectAccess(user.id, board.projectId, board.workspaceId);
        if (!accessCheck.allowed) {
            return NextResponse.json({ error: accessCheck.error!.message }, { status: accessCheck.error!.status });
        }

        const updatedGroup = await prisma.groups.update({
            where: { id: params.groupId },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.order !== undefined && { order: data.order }),
                ...(data.color !== undefined && { color: data.color }),
                ...(data.collapsed !== undefined && { collapsed: data.collapsed }),
            },
        });

        const boardChannel = getBoardChannel(board.workspaceId, group.boardId);
        await publishToChannel(boardChannel, "group:updated", updatedGroup);

        return NextResponse.json(updatedGroup);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        console.error("Update group error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { id: string; groupId: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const group = await prisma.groups.findUnique({ where: { id: params.groupId } });
        if (!group) {
            return NextResponse.json({ error: "Group not found" }, { status: 404 });
        }

        const board = await prisma.board.findUnique({ where: { id: group.boardId } });
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

        const accessCheck = await requireProjectAccess(user.id, board.projectId, board.workspaceId);
        if (!accessCheck.allowed) {
            return NextResponse.json({ error: accessCheck.error!.message }, { status: accessCheck.error!.status });
        }

        await prisma.groups.delete({ where: { id: params.groupId } });

        const boardChannel = getBoardChannel(board.workspaceId, group.boardId);
        await publishToChannel(boardChannel, "group:deleted", { id: params.groupId });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete group error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
