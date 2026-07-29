import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const teams = await prisma.team.findMany({
      where: { workspaceId, status: "active" },
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const teamIds = teams.map(t => t.id);

    const lastMessagesRaw = await prisma.$runCommandRaw({
      aggregate: "chat_messages",
      pipeline: [
        { $match: { teamId: { $in: teamIds }, workspaceId, deletedAt: null } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: "$teamId", lastMessage: { $first: "$$ROOT" } } },
        { $replaceWith: "$lastMessage" },
        { $project: { _id: 1, content: 1, userId: 1, createdAt: 1, teamId: 1 } },
      ],
      cursor: {},
    });
    const lastMessages = ((lastMessagesRaw as any)?.cursor?.firstBatch ?? []) as any[];
    const lastMessageMap = new Map(lastMessages.map(m => [m.teamId, m]));

    const countsRaw = await prisma.$runCommandRaw({
      aggregate: "chat_messages",
      pipeline: [
        { $match: { teamId: { $in: teamIds }, workspaceId, deletedAt: null } },
        { $group: { _id: "$teamId", count: { $sum: 1 } } },
      ],
      cursor: {},
    });
    const counts = ((countsRaw as any)?.cursor?.firstBatch ?? []) as any[];
    const countMap = new Map(counts.map(c => [c._id, c.count]));

    const allUserIds = [...new Set(lastMessages.map(m => m.userId).filter(Boolean))];
    const users = allUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: allUserIds } },
          select: { id: true, name: true, imageUrl: true },
        })
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    const conversations = teams.map(team => {
      const lastMsg = lastMessageMap.get(team.id);
      const msgUser = lastMsg ? userMap.get(lastMsg.userId) : null;
      return {
        id: team.id,
        name: team.name,
        description: team.description,
        membersCount: team._count.members,
        lastMessage: lastMsg ? {
          content: lastMsg.content,
          createdAt: new Date(lastMsg.createdAt).toISOString(),
          userId: lastMsg.userId,
          userName: msgUser?.name || null,
        } : null,
        messageCount: countMap.get(team.id) ?? 0,
      };
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("[Chat Conversations] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
