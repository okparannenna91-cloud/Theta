import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { getAccessibleProjectIds, requireProjectAccess } from "@/lib/project-permissions";
import { publishToChannel, getChatChannel } from "@/lib/ably";
import { z } from "zod";

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
        const cursor = searchParams.get("cursor")?.trim();

        let effectiveWorkspaceId = workspaceId;

        if (!effectiveWorkspaceId && teamId) {
            const teamLookup = await prisma.team.findUnique({ where: { id: teamId }, select: { workspaceId: true } });
            if (teamLookup) {
                effectiveWorkspaceId = teamLookup.workspaceId;
            }
        }

        if (!effectiveWorkspaceId) {
            return NextResponse.json({ error: "workspaceId or teamId is required" }, { status: 400 });
        }

        const accessibleProjectIds = await getAccessibleProjectIds(user.id, effectiveWorkspaceId);

        const TAKE = 50;
        const messagesRaw = await prisma.chatMessage.findMany({
            where: {
                workspaceId: effectiveWorkspaceId,
                ...(teamId ? { teamId } : {}),
                ...(teamId ? {} : {
                    OR: [
                        { projectId: null },
                        { projectId: { in: accessibleProjectIds } }
                    ]
                }),
                deletedAt: null,
                ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
            },
            take: TAKE + 1,
            orderBy: { createdAt: "desc" },
            include: {
                replyTo: { select: { id: true, content: true, userId: true } }
            }
        });

        const hasMore = messagesRaw.length > TAKE;
        const pageMessages = hasMore ? messagesRaw.slice(0, TAKE) : messagesRaw;
        pageMessages.reverse();

        const uniqueUserIds = [...new Set(pageMessages.map(m => m.userId))] as string[];
        const users = await prisma.user.findMany({
            where: { id: { in: uniqueUserIds } },
            select: { id: true, name: true, imageUrl: true }
        });

        const messages = pageMessages.map(m => ({
            ...m,
            user: users.find(u => u.id === m.userId) || null,
            replyTo: m.replyTo ? {
                ...m.replyTo,
                user: users.find(u => u.id === m.replyTo?.userId) || null
            } : null,
        }));

        const { getPlanLimits } = await import("@/lib/plan-limits");
        const workspace = await prisma.workspace.findUnique({
            where: { id: effectiveWorkspaceId },
            select: { plan: true }
        });
        const limits = getPlanLimits((workspace?.plan as any) || "free");

        let lastReadAt = null;
        if (teamId) {
            const membership = await prisma.teamMember.findUnique({
                where: { teamId_userId: { teamId, userId: user.id } },
                select: { lastReadAt: true }
            });
            lastReadAt = membership?.lastReadAt;
        }

        return NextResponse.json({
            messages,
            nextCursor: messages.length > 0 ? messages[0].createdAt : null,
            hasMore,
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

        let targetWorkspaceId: string | undefined = body.workspaceId;
        if (!targetWorkspaceId && body.teamId) {
            const teamLookup = await prisma.team.findUnique({ where: { id: body.teamId }, select: { workspaceId: true } });
            if (teamLookup) {
                targetWorkspaceId = teamLookup.workspaceId;
            }
        }
        if (!targetWorkspaceId) {
            return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
        }

        const data = chatSchema.parse({ ...body, workspaceId: targetWorkspaceId });
        
        if (data.teamId) {
            const teamMember = await prisma.teamMember.findUnique({
                where: { teamId_userId: { teamId: data.teamId, userId: user.id } }
            });

            if (!teamMember) {
                return NextResponse.json({ error: "Forbidden: not a team member" }, { status: 403 });
            }
        } else {
            const hasAccess = await verifyWorkspaceAccess(user.id, data.workspaceId);
            if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (data.projectId) {
          const projectAccess = await requireProjectAccess(user.id, data.projectId, data.workspaceId);
          if (!projectAccess.allowed) {
            return NextResponse.json({ error: projectAccess.error!.message }, { status: projectAccess.error!.status });
          }
        }

        const messageRaw = await prisma.chatMessage.create({
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

        const replyToUser = messageRaw.replyTo ? await prisma.user.findUnique({
            where: { id: messageRaw.replyTo.userId },
            select: { id: true, name: true, imageUrl: true }
        }) : null;

        const message = {
            ...messageRaw,
            user: { id: user.id, name: user.name || "User", imageUrl: user.imageUrl },
            replyTo: messageRaw.replyTo ? { ...messageRaw.replyTo, user: replyToUser } : null,
        };

        const channelName = data.teamId 
            ? `team:${data.teamId}:chat` 
            : getChatChannel(data.workspaceId, data.projectId);
        
        await publishToChannel(channelName, "message", {
            ...message,
            tempId: body.tempId,
        });

        return NextResponse.json(message);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        console.error("Chat POST error:", error);
        return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const messageId = searchParams.get("id");

        if (!messageId) {
            return NextResponse.json({ error: "Missing message id" }, { status: 400 });
        }

        const body = await req.json();
        const { isPinned } = body;

        const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });

        if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });
        if (message.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const updated = await prisma.chatMessage.update({
            where: { id: messageId },
            data: { isPinned: isPinned !== undefined ? isPinned : !message.isPinned },
        });

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

        if (!messageId) {
            return NextResponse.json({ error: "Missing message id" }, { status: 400 });
        }

        const message = await prisma.chatMessage.findUnique({
            where: { id: messageId }
        });

        if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });
        if (message.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const deleted = await prisma.chatMessage.update({
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
