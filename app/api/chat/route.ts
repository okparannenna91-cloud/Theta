import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { getAccessibleProjectIds, requireProjectAccess } from "@/lib/project-permissions";
import { publishToChannel, getChatChannel } from "@/lib/ably";
import { z } from "zod";
import crypto from "crypto";

const idSchema = z.string().min(1, "ID is required");

const chatSchema = z.object({
    content: z.string().max(5000).optional().default(""),
    workspaceId: idSchema,
    projectId: idSchema.optional(),
    teamId: idSchema.optional(),
    attachment: z.any().optional(),
    tempId: z.string().optional(),
    replyToId: idSchema.optional(),
}).refine(data => data.content.trim().length > 0 || data.attachment, {
    message: "Message content or attachment is required",
    path: ["content"]
});

export const dynamic = "force-dynamic";

function docToMessage(doc: any) {
    if (!doc) return null;
    return {
        id: doc._id,
        content: doc.content,
        workspaceId: doc.workspaceId,
        projectId: doc.projectId ?? null,
        teamId: doc.teamId ?? null,
        userId: doc.userId,
        attachment: doc.attachment ?? null,
        reactions: doc.reactions ?? null,
        isPinned: doc.isPinned ?? false,
        isEdited: doc.isEdited ?? false,
        deletedAt: doc.deletedAt ? new Date(doc.deletedAt) : null,
        replyToId: doc.replyToId ?? null,
        createdAt: new Date(doc.createdAt),
        updatedAt: new Date(doc.updatedAt),
    };
}

async function rawFind(filter: Record<string, any>, sort: Record<string, number> = { createdAt: -1 }, limit = 51) {
    const cmd: Record<string, any> = {
        find: "chat_messages",
        filter,
        sort,
        limit,
    };
    const result = await prisma.$runCommandRaw(cmd);
    const batch = (result as any)?.cursor?.firstBatch ?? [];
    return batch;
}

async function rawCount(filter: Record<string, any>) {
    const result = await prisma.$runCommandRaw({ count: "chat_messages", query: filter });
    return (result as any).n ?? 0;
}

async function rawInsert(doc: Record<string, any>) {
    const result = await prisma.$runCommandRaw({
        insert: "chat_messages",
        documents: [doc],
    });
    return result as any;
}

async function rawUpdateOne(filter: Record<string, any>, update: Record<string, any>) {
    const result = await prisma.$runCommandRaw({
        update: "chat_messages",
        updates: [{ q: filter, u: update }],
    });
    return result as any;
}

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

        const accessibleProjectIds = teamId ? [] : await getAccessibleProjectIds(user.id, effectiveWorkspaceId);

        const TAKE = 50;

        const countFilter: Record<string, any> = {
            workspaceId: effectiveWorkspaceId,
            deletedAt: null,
        };
        if (teamId) {
            countFilter.teamId = teamId;
        }
        const totalCount = await rawCount(countFilter);
        console.log("[Chat API] Total count", { totalCount, effectiveWorkspaceId, teamId });

        const findFilter: Record<string, any> = {
            workspaceId: effectiveWorkspaceId,
            deletedAt: null,
        };
        if (teamId) {
            findFilter.teamId = teamId;
        } else if (accessibleProjectIds.length > 0) {
            findFilter.$or = [
                { projectId: { $exists: false } },
                { projectId: null },
                { projectId: { $in: accessibleProjectIds } },
            ];
        } else {
            findFilter.$or = [
                { projectId: { $exists: false } },
                { projectId: null },
            ];
        }
        if (cursor) {
            findFilter.createdAt = { $lt: new Date(cursor).getTime() };
        }

        const docs = await rawFind(findFilter, { createdAt: -1 }, TAKE + 1);
        const hasMore = docs.length > TAKE;
        const page = hasMore ? docs.slice(0, TAKE) : docs;
        page.reverse();

        const messages = page.map(docToMessage);

        const replyToIds = messages.map(m => m.replyToId).filter(Boolean) as string[];
        let replyToMap = new Map<string, any>();
        if (replyToIds.length > 0) {
            const replyDocs = await rawFind({ _id: { $in: replyToIds } });
            for (const rd of replyDocs) {
                replyToMap.set(rd._id, { id: rd._id, content: rd.content, userId: rd.userId });
            }
        }

        const allUserIds = [...new Set([...messages.map(m => m.userId), ...replyToIds.map(id => replyToMap.get(id)?.userId).filter(Boolean)])] as string[];
        const users = allUserIds.length > 0
            ? await prisma.user.findMany({
                where: { id: { in: allUserIds } },
                select: { id: true, name: true, imageUrl: true }
              })
            : [];

        const enrichedMessages = messages.map(m => ({
            ...m,
            user: users.find(u => u.id === m.userId) || null,
            replyTo: m.replyToId && replyToMap.has(m.replyToId) ? {
                ...replyToMap.get(m.replyToId),
                user: users.find(u => u.id === replyToMap.get(m.replyToId)?.userId) || null,
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
            messages: enrichedMessages,
            nextCursor: enrichedMessages.length > 0 ? enrichedMessages[enrichedMessages.length - 1].createdAt : null,
            hasMore,
            lastReadAt,
            limits: {
                max: limits.maxChatMessages,
                current: enrichedMessages.length,
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

        const now = Date.now();
        const messageId = crypto.randomUUID();

        const doc = {
            _id: messageId,
            content: data.content,
            workspaceId: data.workspaceId,
            projectId: data.projectId ?? null,
            teamId: data.teamId ?? null,
            userId: user.id,
            attachment: data.attachment ?? null,
            reactions: null,
            isPinned: false,
            isEdited: false,
            deletedAt: null,
            replyToId: data.replyToId ?? null,
            createdAt: now,
            updatedAt: now,
        };

        console.log("[Chat POST] Raw inserting", { messageId, workspaceId: data.workspaceId, teamId: data.teamId });
        const result = await rawInsert(doc);
        console.log("[Chat POST] Raw insert result", JSON.stringify(result));

        const verifyCount = await rawCount({
            workspaceId: data.workspaceId,
            ...(data.teamId ? { teamId: data.teamId } : {}),
            deletedAt: null,
        });
        console.log("[Chat POST] Verify count after insert", { count: verifyCount });

        if (verifyCount === 0) {
            console.error("[Chat POST] FATAL: Insert returned success but count is 0");
        }

        let replyToData = null;
        let replyToUser = null;
        if (data.replyToId) {
            const replyDocs = await rawFind({ _id: data.replyToId });
            if (replyDocs.length > 0) {
                replyToData = { id: replyDocs[0]._id, content: replyDocs[0].content, userId: replyDocs[0].userId };
                replyToUser = await prisma.user.findUnique({
                    where: { id: replyToData.userId },
                    select: { id: true, name: true, imageUrl: true }
                });
            }
        }

        const message = {
            id: messageId,
            content: data.content,
            workspaceId: data.workspaceId,
            projectId: data.projectId ?? null,
            teamId: data.teamId ?? null,
            userId: user.id,
            attachment: data.attachment ?? null,
            reactions: null,
            isPinned: false,
            isEdited: false,
            deletedAt: null,
            replyToId: data.replyToId ?? null,
            createdAt: new Date(now),
            updatedAt: new Date(now),
            user: { id: user.id, name: user.name || "User", imageUrl: user.imageUrl },
            replyTo: replyToData ? { ...replyToData, user: replyToUser } : null,
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

        const matchDocs = await rawFind({ _id: messageId }, {}, 1);
        if (matchDocs.length === 0) return NextResponse.json({ error: "Message not found" }, { status: 404 });

        const msg = matchDocs[0];
        if (msg.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const hasAccess = await verifyWorkspaceAccess(user.id, msg.workspaceId);
        if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const newPinned = isPinned !== undefined ? isPinned : !msg.isPinned;
        await rawUpdateOne(
            { _id: messageId },
            { $set: { isPinned: newPinned, updatedAt: Date.now() } }
        );

        const updated = { ...docToMessage(msg), isPinned: newPinned };

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

        const matchDocs = await rawFind({ _id: messageId }, {}, 1);
        if (matchDocs.length === 0) return NextResponse.json({ error: "Message not found" }, { status: 404 });

        const msg = matchDocs[0];
        if (msg.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const hasAccess = await verifyWorkspaceAccess(user.id, msg.workspaceId);
        if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        await rawUpdateOne(
            { _id: messageId },
            { $set: { deletedAt: Date.now() } }
        );

        const channelName = msg.teamId
            ? `team:${msg.teamId}:chat`
            : getChatChannel(msg.workspaceId, msg.projectId ?? undefined);
        
        await publishToChannel(channelName, "message:deleted", { id: messageId });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Chat DELETE error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
