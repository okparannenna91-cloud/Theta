import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma, getPrismaClient } from "@/lib/prisma";
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

        // Determine workspaceId and DB shard
        let effectiveWorkspaceId = workspaceId;
        let db = getPrismaClient(effectiveWorkspaceId);

        // If teamId is provided, check team access
        if (teamId) {
            if (effectiveWorkspaceId) {
                // If workspaceId is provided, we know the shard. Just verify team access directly on that shard.
                let teamMember = await db.teamMember.findUnique({
                    where: { teamId_userId: { teamId, userId: user.id } }
                });

                if (!teamMember) {
                    // Fallback to cross-shard search for legacy members that might be on the wrong shard
                    const { findAcrossShards } = await import("@/lib/prisma");
                    const result = await findAcrossShards<any>("teamMember", {
                        teamId_userId: { teamId, userId: user.id }
                    });
                    teamMember = result.data;
                }

                if (!teamMember) {
                    return NextResponse.json({ error: "Access denied to team chat" }, { status: 403 });
                }
            } else {
                // Legacy support if workspaceId is not passed in GET explicitly
                const { findAcrossShards } = await import("@/lib/prisma");
                const result = await findAcrossShards<any>("teamMember", {
                    teamId_userId: { teamId, userId: user.id }
                });

                if (!result.data) {
                    return NextResponse.json({ error: "Access denied to team chat" }, { status: 403 });
                }

                db = result.db;
                const team = await db.team.findUnique({
                    where: { id: teamId },
                    select: { workspaceId: true }
                });
                effectiveWorkspaceId = team?.workspaceId || null;
            }
        } else if (workspaceId) {
            const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
            if (!hasAccess) {
                return NextResponse.json({ error: "Access denied to workspace" }, { status: 403 });
            }
        } else {
            return NextResponse.json({ error: "workspaceId or teamId is required" }, { status: 400 });
        }

        // Get chat messages without include since users are on Shard 1
        const messagesRaw = await db.chatMessage.findMany({
            where: {
                teamId: teamId || null,
                workspaceId: effectiveWorkspaceId as string,
                projectId: teamId ? null : (projectId || null),
                deletedAt: null, // Only fetch non-deleted messages or handle them in frontend
            },
            include: {
                replyTo: {
                    select: {
                        id: true,
                        content: true,
                        userId: true,
                    }
                }
            },
            orderBy: { createdAt: "asc" },
            take: 100,
        });

        // Manually attach user info from primary DB
        const uniqueUserIds = [...new Set(messagesRaw.map(m => m.userId))];
        const users = await prisma.user.findMany({
            where: { id: { in: uniqueUserIds } },
            select: { id: true, name: true, imageUrl: true }
        });

        const messages = messagesRaw.map(m => ({
            ...m,
            user: users.find(u => u.id === m.userId) || null
        }));

        const { getPlanLimits } = await import("@/lib/plan-limits");
        const workspace = await prisma.workspace.findUnique({
            where: { id: effectiveWorkspaceId as string },
            select: { plan: true }
        });
        const limits = getPlanLimits((workspace?.plan as any) || "free");
        const count = await db.chatMessage.count({ where: { workspaceId: effectiveWorkspaceId as string } });

        // Get unread info
        let lastReadAt = null;
        if (teamId) {
            const membership = await db.teamMember.findUnique({
                where: { teamId_userId: { teamId, userId: user.id } },
                select: { lastReadAt: true }
            });
            lastReadAt = membership?.lastReadAt;
        }

        return NextResponse.json({
            messages,
            lastReadAt,
            limits: {
                max: limits.maxChatMessages,
                current: count,
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
        // If not provided, attempt to derive from teamId
        if (!targetWorkspaceId && body.teamId) {
            const { findAcrossShards } = await import("@/lib/prisma");
            const teamLookup = await findAcrossShards<any>("team", { id: body.teamId });
            if (teamLookup.data) {
                targetWorkspaceId = teamLookup.data.workspaceId;
                console.log(`[Chat POST] Derived workspaceId=${targetWorkspaceId} from teamId=${body.teamId}`);
            }
        }
        if (!targetWorkspaceId) {
            return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
        }

        const data = chatSchema.parse({ ...body, workspaceId: targetWorkspaceId });

        // Always use workspaceId-scoped shard (fast path)
        const db = getPrismaClient(data.workspaceId);

        // Verify access based on teamId or workspaceId
        if (data.teamId) {
            // Use the known shard directly via workspaceId
            let teamMember = await db.teamMember.findUnique({
                where: { teamId_userId: { teamId: data.teamId, userId: user.id } }
            });

            if (!teamMember) {
                // Fallback to primary DB for legacy members
                teamMember = await prisma.teamMember.findUnique({
                    where: { teamId_userId: { teamId: data.teamId, userId: user.id } }
                });
            }

            if (!teamMember) {
                // Final fallback: cross-shard search
                const { findAcrossShards } = await import("@/lib/prisma");
                const result = await findAcrossShards<any>("teamMember", {
                    teamId_userId: { teamId: data.teamId, userId: user.id }
                });
                teamMember = result.data;
            }

            if (!teamMember) {
                console.error(`[Chat POST] Team access denied. teamId=${data.teamId}, userId=${user.id}, workspaceId=${data.workspaceId}`);
                return NextResponse.json({ error: "Forbidden: not a team member" }, { status: 403 });
            }
        } else {
            const hasAccess = await verifyWorkspaceAccess(user.id, data.workspaceId);
            if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Check plan limits for chat messages
        const chatCount = await db.chatMessage.count({
            where: { workspaceId: data.workspaceId }
        });

        try {
            const { enforcePlanLimit } = await import("@/lib/plan-limits");
            await enforcePlanLimit(data.workspaceId, "chat", chatCount);
        } catch (error: any) {
            console.warn(`[Chat POST] Plan limit check failed for workspace=${data.workspaceId}: ${error.message}`);
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        // Create the message on the correct shard
        const messageRaw = await db.chatMessage.create({
            data: {
                content: data.content,
                workspaceId: data.workspaceId,
                projectId: data.projectId ?? undefined,
                teamId: data.teamId ?? undefined,
                userId: user.id as string,
                attachment: (data.attachment as any) ?? undefined,
                replyToId: data.replyToId ?? undefined,
            },
            include: {
                replyTo: {
                    select: {
                        id: true,
                        content: true,
                        userId: true,
                    }
                }
            }
        });

        console.log(`[Chat POST] Message saved. id=${messageRaw.id}, teamId=${data.teamId}, workspaceId=${data.workspaceId}`);

        // Use current user info (Shard 1)
        const message = {
            ...messageRaw,
            user: {
                id: user.id,
                name: user.name,
                imageUrl: user.imageUrl,
            },
        };

        // Publish to Ably
        const channelName = data.teamId
            ? `team:${data.teamId}:chat`
            : getChatChannel(data.workspaceId, data.projectId);

        await publishToChannel(channelName, "message", { ...message, tempId: data.tempId });

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

export async function PATCH(req: Request) {
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
        const body = await req.json();

        // Check if user is owner of message (for editing) or has workspace access (for pinning)
        const message = await db.chatMessage.findUnique({
            where: { id: messageId }
        });

        if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });

        const updateData: any = {};
        if (body.content !== undefined && message.userId === user.id) {
            updateData.content = body.content;
            updateData.isEdited = true;
        }
        if (body.isPinned !== undefined) {
            const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
            if (hasAccess) updateData.isPinned = body.isPinned;
        }

        const updated = await db.chatMessage.update({
            where: { id: messageId },
            data: updateData,
            include: {
                replyTo: {
                    select: { id: true, content: true, userId: true }
                }
            }
        });

        // Publish update to Ably
        const channelName = updated.teamId
            ? `team:${updated.teamId}:chat`
            : getChatChannel(updated.workspaceId, updated.projectId ?? undefined);
        
        await publishToChannel(channelName, "message:updated", updated);

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Chat PATCH error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
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

        // Soft delete
        const deleted = await db.chatMessage.update({
            where: { id: messageId },
            data: { deletedAt: new Date() }
        });

        // Publish delete to Ably
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
