import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma, getPrismaClient, prismaShard1, prismaShard2, prismaShard3, prismaShard4 } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { publishToChannel, getChatChannel } from "@/lib/ably";
import { z } from "zod";

// Fetch and create team-specific chat messages

const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid ObjectId format");

const chatSchema = z.object({
    content: z.string().max(5000).optional().default(""),
    workspaceId: objectIdSchema,
    projectId: objectIdSchema.optional(),
    teamId: objectIdSchema.optional(),
    attachment: z.any().optional(),
    tempId: z.string().optional(),
    replyToId: objectIdSchema.optional(),
}).refine(data => data.content.trim().length > 0 || data.attachment, {
    message: "Message content or attachment is required",
    path: ["content"]
});

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get("workspaceId")?.trim();
        const teamId = searchParams.get("teamId")?.trim();

        // Determine workspaceId and DB shard
        let effectiveWorkspaceId = workspaceId;
        
        // If workspaceId is missing but teamId is present, try to derive it
        if (!effectiveWorkspaceId && teamId) {
            const { findAcrossShards } = await import("@/lib/prisma");
            const teamLookup = await findAcrossShards<any>("team", { id: teamId });
            if (teamLookup.data) {
                effectiveWorkspaceId = teamLookup.data.workspaceId;
            }
        }

        if (!effectiveWorkspaceId) {
            return NextResponse.json({ error: "workspaceId or teamId is required to resolve shard" }, { status: 400 });
        }

        // FINAL NUCLEAR BYPASS: Parallel shard scan with timeout to prevent hangs
        const shards = [
            { name: "Shard 1", client: prismaShard1 },
            { name: "Shard 2", client: prismaShard2 },
            { name: "Shard 3", client: prismaShard3 },
            { name: "Shard 4", client: prismaShard4 },
        ];

        const scanShard = async (shard: any) => {
            if (!shard.client) return [];
            try {
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Timeout")), 3000)
                );
                
                // TOTAL BYPASS: Fetch without 'where' to ensure visibility (matching debug/db)
                const queryPromise = (shard.client as any).chatMessage.findMany({
                    take: 500,
                    orderBy: { createdAt: "desc" },
                    include: {
                        replyTo: { select: { id: true, content: true, userId: true } }
                    }
                });

                const results: any = await Promise.race([queryPromise, timeoutPromise]);
                return results.map((m: any) => ({ ...m, shard: shard.name }));
            } catch (e) {
                console.error(`[Chat Bypass] Shard ${shard.name} failed or timed out`);
                return [];
            }
        };

        const allResults = await Promise.all(shards.map(scanShard));
        let allMessagesRaw = allResults.flat();

        // Perform strict JS-side filtering to bypass Prisma/Mongo type issues
        if (effectiveWorkspaceId) {
            allMessagesRaw = allMessagesRaw.filter(m => String(m.workspaceId) === String(effectiveWorkspaceId));
        }
        if (teamId) {
            allMessagesRaw = allMessagesRaw.filter(m => String(m.teamId) === String(teamId));
        }
        
        // Filter out deleted messages
        allMessagesRaw = allMessagesRaw.filter(m => !m.deletedAt);

        // Sort and limit
        const finalMessagesRaw = allMessagesRaw.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, 50);

        // Reverse for chronological UI
        finalMessagesRaw.reverse();

        // Attach users
        const uniqueUserIds = [...new Set(finalMessagesRaw.map((m: any) => m.userId))] as string[];
        const users = await prisma.user.findMany({
            where: { id: { in: uniqueUserIds } },
            select: { id: true, name: true, imageUrl: true }
        });

        const messages = finalMessagesRaw.map((m: any) => ({
            ...m,
            user: users.find(u => u.id === m.userId) || null
        }));

        const { getPlanLimits } = await import("@/lib/plan-limits");
        const workspace = await prisma.workspace.findUnique({
            where: { id: effectiveWorkspaceId as string },
            select: { plan: true }
        });
        const limits = getPlanLimits((workspace?.plan as any) || "free");

        // Get unread info
        let lastReadAt = null;
        if (teamId) {
            const { findAcrossShards } = await import("@/lib/prisma");
            const membership = await findAcrossShards<any>("teamMember", {
                teamId_userId: { teamId, userId: user.id }
            });
            lastReadAt = membership.data?.lastReadAt;
        }

        return NextResponse.json({
            messages,
            nextCursor: null,
            hasMore: false,
            lastReadAt,
            limits: {
                max: limits.maxChatMessages,
                current: messages.length,
            }
        });
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

        // Determine workspaceId – required for shard routing
        let targetWorkspaceId: string | undefined = body.workspaceId;
        if (!targetWorkspaceId && body.teamId) {
            const { findAcrossShards } = await import("@/lib/prisma");
            const teamLookup = await findAcrossShards<any>("team", { id: body.teamId });
            if (teamLookup.data) {
                targetWorkspaceId = teamLookup.data.workspaceId;
            }
        }
        if (!targetWorkspaceId) {
            return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
        }

        const data = chatSchema.parse({ ...body, workspaceId: targetWorkspaceId });
        const db = getPrismaClient(data.workspaceId);
        
        if (data.teamId) {
            let teamMember = await db.teamMember.findUnique({
                where: { teamId_userId: { teamId: data.teamId, userId: user.id } }
            });

            if (!teamMember) {
                teamMember = await prisma.teamMember.findUnique({
                    where: { teamId_userId: { teamId: data.teamId, userId: user.id } }
                });
            }

            if (!teamMember) {
                const { findAcrossShards } = await import("@/lib/prisma");
                const result = await findAcrossShards<any>("teamMember", {
                    teamId_userId: { teamId: data.teamId, userId: user.id }
                });
                teamMember = result.data;
            }

            if (!teamMember) {
                return NextResponse.json({ error: "Forbidden: not a team member" }, { status: 403 });
            }
        } else {
            const hasAccess = await verifyWorkspaceAccess(user.id, data.workspaceId);
            if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const messageRaw = await db.chatMessage.create({
            data: {
                content: data.content,
                workspaceId: data.workspaceId,
                projectId: data.projectId ?? null,
                teamId: data.teamId ?? null,
                userId: user.id,
                attachment: data.attachment,
                replyToId: data.replyToId ?? null,
            },
            include: {
                replyTo: { select: { id: true, content: true, userId: true } }
            }
        });

        const channelName = data.teamId 
            ? `team:${data.teamId}:chat` 
            : getChatChannel(data.workspaceId, data.projectId);
        
        await publishToChannel(channelName, "message", {
            ...messageRaw,
            tempId: body.tempId,
        });

        return NextResponse.json(messageRaw);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        console.error("Chat POST error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const messageId = searchParams.get("id");
        const workspaceId = searchParams.get("workspaceId");

        if (!messageId || !workspaceId) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        const db = getPrismaClient(workspaceId);
        const message = await db.chatMessage.findUnique({
            where: { id: messageId }
        });

        if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });
        if (message.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const deleted = await db.chatMessage.update({
            where: { id: messageId },
            data: { deletedAt: new Date() }
        });

        const channelName = deleted.teamId
            ? `team:${deleted.teamId}:chat`
            : getChatChannel(deleted.workspaceId, deleted.projectId ?? undefined);
        
        await publishToChannel(channelName, "message:deleted", { id: messageId });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Chat DELETE error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
