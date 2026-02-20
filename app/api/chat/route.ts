import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma, getPrismaClient } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { publishToChannel, getChatChannel } from "@/lib/ably";
import { z } from "zod";

// Fetch and create team-specific chat messages

const chatSchema = z.object({
    content: z.string().min(1).max(5000),
    workspaceId: z.string(),
    projectId: z.string().optional(),
    teamId: z.string().optional(),
    attachment: z.any().optional(),
});

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get("workspaceId");
        const projectId = searchParams.get("projectId");
        const teamId = searchParams.get("teamId");

        // If teamId is provided, we fetch by team. Otherwise we need workspaceId
        if (!teamId && !workspaceId) {
            return NextResponse.json(
                { error: "workspaceId or teamId is required" },
                { status: 400 }
            );
        }

        // If teamId provided, verify membership
        if (teamId) {
            const membership = await prisma.teamMember.findUnique({
                where: { teamId_userId: { teamId, userId: user.id } },
                include: { team: true }
            });
            if (!membership) {
                return NextResponse.json({ error: "Access denied to team chat" }, { status: 403 });
            }
        } else if (workspaceId) {
            const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
            if (!hasAccess) {
                return NextResponse.json({ error: "Access denied to workspace" }, { status: 403 });
            }
        }

        // Determine workspaceId for sharding
        let effectiveWorkspaceId = workspaceId;
        if (!effectiveWorkspaceId && teamId) {
            const team = await prisma.team.findUnique({
                where: { id: teamId },
                select: { workspaceId: true }
            });
            effectiveWorkspaceId = team?.workspaceId || null;
        }

        const db = getPrismaClient(effectiveWorkspaceId);

        // Get chat messages
        const messages = await db.chatMessage.findMany({
            where: {
                teamId: teamId || null,
                workspaceId: teamId ? undefined : (workspaceId as string),
                projectId: teamId ? null : (projectId || null),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        imageUrl: true,
                    },
                },
            },
            orderBy: { createdAt: "asc" },
            take: 100,
        });

        return NextResponse.json(messages);
    } catch (error) {
        console.error("Chat GET error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const data = chatSchema.parse(body);

        // Verify access based on teamId or workspaceId
        if (data.teamId) {
            const membership = await prisma.teamMember.findUnique({
                where: { teamId_userId: { teamId: data.teamId, userId: user.id } },
            });
            if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        } else {
            const hasAccess = await verifyWorkspaceAccess(user.id, data.workspaceId);
            if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const db = getPrismaClient(data.workspaceId);

        // Check plan limits strictly for chat messages
        const chatCount = await db.chatMessage.count({
            where: { workspaceId: data.workspaceId }
        });

        try {
            const { enforcePlanLimit } = await import("@/lib/plan-limits");
            await enforcePlanLimit(data.workspaceId, "chat", chatCount);
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        // Create message
        const message = await db.chatMessage.create({
            data: {
                content: data.content,
                workspaceId: data.workspaceId,
                projectId: data.projectId || null,
                teamId: data.teamId || null,
                userId: user.id as string,
                attachment: (data.attachment as any) || null,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        imageUrl: true,
                    },
                },
            },
        });

        // Publish to Ably
        const channelName = data.teamId
            ? `team:${data.teamId}:chat`
            : getChatChannel(data.workspaceId, data.projectId);

        await publishToChannel(channelName, "message", message);

        return NextResponse.json(message);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        console.error("Chat POST error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
