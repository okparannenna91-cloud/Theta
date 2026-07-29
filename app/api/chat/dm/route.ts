import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { publishToChannel } from "@/lib/ably";
import { z } from "zod";
import crypto from "crypto";

const idSchema = z.string().min(1);
const dmSchema = z.object({
  content: z.string().max(5000).optional().default(""),
  workspaceId: idSchema,
  conversationId: idSchema,
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
    conversationId: doc.conversationId ?? null,
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
  const cmd: Record<string, any> = { find: "chat_messages", filter, sort, limit };
  const result = await prisma.$runCommandRaw(cmd);
  return (result as any)?.cursor?.firstBatch ?? [];
}

async function rawInsert(doc: Record<string, any>) {
  return await prisma.$runCommandRaw({ insert: "chat_messages", documents: [doc] });
}

async function rawUpdateOne(filter: Record<string, any>, update: Record<string, any>) {
  return await prisma.$runCommandRaw({
    update: "chat_messages",
    updates: [{ q: filter, u: update }],
  });
}

async function rawCount(filter: Record<string, any>) {
  const result = await prisma.$runCommandRaw({ count: "chat_messages", query: filter });
  return (result as any).n ?? 0;
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId")?.trim();
    const conversationId = searchParams.get("conversationId")?.trim();
    const cursor = searchParams.get("cursor")?.trim();

    if (!workspaceId || !conversationId) {
      return NextResponse.json({ error: "workspaceId and conversationId are required" }, { status: 400 });
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!hasAccess) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation || conversation.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    if (!conversation.participantIds.includes(user.id)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const TAKE = 50;
    const findFilter: Record<string, any> = {
      workspaceId,
      conversationId,
      deletedAt: null,
    };
    if (cursor) {
      findFilter.createdAt = { $lt: new Date(cursor).getTime() };
    }

    const docs = await rawFind(findFilter, { createdAt: -1 }, TAKE + 1);
    const hasMore = docs.length > TAKE;
    const page = hasMore ? docs.slice(0, TAKE) : docs;
    page.reverse();

    const messages = page.map(docToMessage);

    const replyToIds = messages.map((m: any) => m.replyToId).filter(Boolean) as string[];
    let replyToMap = new Map<string, any>();
    if (replyToIds.length > 0) {
      const replyDocs = await rawFind({ _id: { $in: replyToIds } });
      for (const rd of replyDocs) {
        replyToMap.set(rd._id, { id: rd._id, content: rd.content, userId: rd.userId });
      }
    }

    const allUserIds = [...new Set([...messages.map((m: any) => m.userId), ...replyToIds.map(id => replyToMap.get(id)?.userId).filter(Boolean)])] as string[];
    const users = allUserIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: allUserIds } }, select: { id: true, name: true, imageUrl: true } })
      : [];

    const enrichedMessages = messages.map((m: any) => ({
      ...m,
      user: users.find(u => u.id === m.userId) || null,
      replyTo: m.replyToId && replyToMap.has(m.replyToId) ? {
        ...replyToMap.get(m.replyToId),
        user: users.find(u => u.id === replyToMap.get(m.replyToId)?.userId) || null,
      } : null,
    }));

    let lastReadAt = null;
    if (conversation.type === "direct") {
      const otherUserId = conversation.participantIds.find(id => id !== user.id);
      if (otherUserId) {
        const conversationLastRead = await prisma.conversation.findUnique({
          where: { id: conversationId },
          select: { updatedAt: true },
        });
        lastReadAt = conversationLastRead?.updatedAt;
      }
    }

    return NextResponse.json({
      messages: enrichedMessages,
      nextCursor: enrichedMessages.length > 0 ? enrichedMessages[enrichedMessages.length - 1].createdAt : null,
      hasMore,
    });
  } catch (error) {
    console.error("[DM GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const data = dmSchema.parse(body);

    const hasAccess = await verifyWorkspaceAccess(user.id, data.workspaceId);
    if (!hasAccess) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const conversation = await prisma.conversation.findUnique({ where: { id: data.conversationId } });
    if (!conversation || conversation.workspaceId !== data.workspaceId) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    if (!conversation.participantIds.includes(user.id)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const now = Date.now();
    const messageId = crypto.randomUUID();

    const doc = {
      _id: messageId,
      content: data.content,
      workspaceId: data.workspaceId,
      conversationId: data.conversationId,
      teamId: null,
      projectId: null,
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

    await rawInsert(doc);

    await prisma.conversation.update({
      where: { id: data.conversationId },
      data: { updatedAt: new Date() },
    });

    let replyToData = null;
    let replyToUser = null;
    if (data.replyToId) {
      const replyDocs = await rawFind({ _id: data.replyToId });
      if (replyDocs.length > 0) {
        replyToData = { id: replyDocs[0]._id, content: replyDocs[0].content, userId: replyDocs[0].userId };
        replyToUser = await prisma.user.findUnique({
          where: { id: replyToData.userId },
          select: { id: true, name: true, imageUrl: true },
        });
      }
    }

    const message = {
      id: messageId,
      content: data.content,
      workspaceId: data.workspaceId,
      conversationId: data.conversationId,
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

    await publishToChannel(`dm:${data.conversationId}`, "message", {
      ...message,
      tempId: body.tempId,
    });

    return NextResponse.json(message);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("[DM POST] Error:", error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get("id");
    if (!messageId) return NextResponse.json({ error: "Missing message id" }, { status: 400 });

    const matchDocs = await rawFind({ _id: messageId }, {}, 1);
    if (matchDocs.length === 0) return NextResponse.json({ error: "Message not found" }, { status: 404 });

    const msg = matchDocs[0];
    if (msg.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await rawUpdateOne({ _id: messageId }, { $set: { deletedAt: Date.now() } });

    if (msg.conversationId) {
      await publishToChannel(`dm:${msg.conversationId}`, "message:deleted", { id: messageId });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DM DELETE] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
