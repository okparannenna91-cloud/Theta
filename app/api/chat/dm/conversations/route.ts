import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId")?.trim();

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!hasAccess) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const conversations = await prisma.conversation.findMany({
      where: {
        workspaceId,
        participantIds: { has: user.id },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (conversations.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    const conversationIds = conversations.map(c => c.id);

    const lastMessagesRaw = await prisma.$runCommandRaw({
      aggregate: "chat_messages",
      pipeline: [
        { $match: { conversationId: { $in: conversationIds }, workspaceId, deletedAt: null } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: "$conversationId", lastMessage: { $first: "$$ROOT" } } },
        { $replaceWith: "$lastMessage" },
        { $project: { _id: 1, content: 1, userId: 1, createdAt: 1, conversationId: 1 } },
      ],
      cursor: {},
    });
    const lastMessages = ((lastMessagesRaw as any)?.cursor?.firstBatch ?? []) as any[];
    const lastMessageMap = new Map(lastMessages.map(m => [m.conversationId, m]));

    const unreadCountsRaw = await prisma.$runCommandRaw({
      aggregate: "chat_messages",
      pipeline: [
        {
          $match: {
            conversationId: { $in: conversationIds },
            workspaceId,
            deletedAt: null,
            userId: { $ne: user.id },
          },
        },
        {
          $group: {
            _id: "$conversationId",
            count: { $sum: 1 },
          },
        },
      ],
      cursor: {},
    });
    const unreadCounts = ((unreadCountsRaw as any)?.cursor?.firstBatch ?? []) as any[];
    const unreadCountMap = new Map(unreadCounts.map(c => [c._id, c.count]));

    const allParticipantIds = [...new Set(conversations.flatMap(c => c.participantIds))];
    const users = allParticipantIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: allParticipantIds } },
          select: { id: true, name: true, imageUrl: true },
        })
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    const result = conversations.map(conv => {
      const lastMsg = lastMessageMap.get(conv.id);
      const otherParticipantIds = conv.participantIds.filter(id => id !== user.id);
      const participants = otherParticipantIds.map(id => userMap.get(id)).filter(Boolean);
      const msgUser = lastMsg ? userMap.get(lastMsg.userId) : null;

      return {
        id: conv.id,
        type: conv.type,
        participants,
        lastMessage: lastMsg ? {
          id: lastMsg._id,
          content: lastMsg.content,
          createdAt: new Date(lastMsg.createdAt).toISOString(),
          userId: lastMsg.userId,
          userName: msgUser?.name || null,
        } : null,
        unreadCount: unreadCountMap.get(conv.id) ?? 0,
        updatedAt: conv.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({ conversations: result });
  } catch (error) {
    console.error("[DM Conversations] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { workspaceId, participantUserId } = body;

    if (!workspaceId || !participantUserId) {
      return NextResponse.json({ error: "workspaceId and participantUserId are required" }, { status: 400 });
    }

    if (participantUserId === user.id) {
      return NextResponse.json({ error: "Cannot create DM with yourself" }, { status: 400 });
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!hasAccess) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const otherMembership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: participantUserId } },
    });
    if (!otherMembership) {
      return NextResponse.json({ error: "User not found in workspace" }, { status: 404 });
    }

    const sortedIds = [user.id, participantUserId].sort();
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        workspaceId,
        type: "direct",
        participantIds: { hasEvery: sortedIds },
        AND: [
          { participantIds: { has: sortedIds[0] } },
          { participantIds: { has: sortedIds[1] } },
        ],
      },
    });

    if (existingConversation) {
      const participantUsers = await prisma.user.findMany({
        where: { id: { in: existingConversation.participantIds } },
        select: { id: true, name: true, imageUrl: true },
      });
      return NextResponse.json({
        conversation: {
          id: existingConversation.id,
          type: existingConversation.type,
          participants: participantUsers.filter(p => p.id !== user.id),
          updatedAt: existingConversation.updatedAt.toISOString(),
        },
        created: false,
      });
    }

    const conversation = await prisma.conversation.create({
      data: {
        workspaceId,
        type: "direct",
        participantIds: [user.id, participantUserId],
      },
    });

    const participantUsers = await prisma.user.findMany({
      where: { id: { in: conversation.participantIds } },
      select: { id: true, name: true, imageUrl: true },
    });

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        type: conversation.type,
        participants: participantUsers.filter(p => p.id !== user.id),
        updatedAt: conversation.updatedAt.toISOString(),
      },
      created: true,
    });
  } catch (error) {
    console.error("[DM Create] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
