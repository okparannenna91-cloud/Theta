import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireProjectAccess } from "@/lib/project-permissions";
import { publishToChannel, getBoardChannel } from "@/lib/ably";

const groupSchema = z.object({
    name: z.string().min(1),
    order: z.number().default(0),
    color: z.string().optional(),
    collapsed: z.boolean().default(false),
});

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const board = await prisma.board.findUnique({ where: { id: params.id } });
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

        const groups = await prisma.groups.findMany({
            where: { boardId: params.id },
            orderBy: { order: "asc" },
        });

        return NextResponse.json(groups);
    } catch (error) {
        console.error("Get groups error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

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
        const data = groupSchema.parse(body);

        const board = await prisma.board.findUnique({ where: { id: params.id } });
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

        const { enforcePlanLimit } = await import("@/lib/plan-limits");
        const groupCount = await prisma.groups.count({ where: { boardId: params.id } });
        await enforcePlanLimit(board.workspaceId, "groups", groupCount);

        const group = await prisma.groups.create({
            data: {
                name: data.name,
                order: data.order,
                color: data.color,
                collapsed: data.collapsed,
                boardId: params.id,
            },
        });

        const boardChannel = getBoardChannel(board.workspaceId, params.id);
        await publishToChannel(boardChannel, "group:created", group);

        return NextResponse.json(group);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        console.error("Create group error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
