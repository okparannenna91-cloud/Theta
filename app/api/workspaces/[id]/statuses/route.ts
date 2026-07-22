import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { publishToChannel, getWorkspaceChannel } from "@/lib/ably";

const statusSchema = z.object({
    name: z.string().min(1).max(50),
    color: z.string().optional(),
    order: z.number().int().optional(),
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

        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: params.id,
                    userId: user.id,
                },
            },
        });

        if (!membership) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const statuses = await prisma.status.findMany({
            where: { workspaceId: params.id },
            orderBy: { order: "asc" },
        });

        return NextResponse.json(statuses);
    } catch (error) {
        logger.error("Fetch statuses error:", error);
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

        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: params.id,
                    userId: user.id,
                },
            },
        });

        if (!membership) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const body = await req.json();
        const data = statusSchema.parse(body);

        // Get the next order value if not provided
        let order = data.order;
        if (order === undefined) {
            const lastStatus = await prisma.status.findFirst({
                where: { workspaceId: params.id },
                orderBy: { order: "desc" },
            });
            order = (lastStatus?.order ?? -1) + 1;
        }

        const status = await prisma.status.create({
            data: {
                name: data.name,
                color: data.color || "#4f46e5",
                order,
                workspaceId: params.id,
            },
        });

        // Publish real-time update
        await publishToChannel(
            getWorkspaceChannel(params.id),
            "status:created",
            status
        );

        return NextResponse.json(status);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        if ((error as any).code === "P2002") {
            return NextResponse.json({ error: "Status name already exists in this workspace" }, { status: 400 });
        }
        logger.error("Create status error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
