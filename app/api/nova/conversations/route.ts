import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentWorkspace, verifyWorkspaceAccess } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspace = await getCurrentWorkspace(user.id);
    if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const cursor = searchParams.get("cursor") || undefined;

    const conversations = await prisma.aiConversation.findMany({
      where: { workspaceId: workspace.id, userId: user.id, isArchived: false },
      orderBy: { lastMessageAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        title: true,
        isPinned: true,
        lastMessageAt: true,
        createdAt: true,
        _count: { select: { messages: true } },
      },
    });

    let nextCursor: string | null = null;
    if (conversations.length > limit) {
      const next = conversations.pop();
      nextCursor = next!.id;
    }

    return NextResponse.json({ conversations, nextCursor });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspace = await getCurrentWorkspace(user.id);
    if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const { title } = await req.json();

    const conversation = await prisma.aiConversation.create({
      data: {
        title: title || "New Conversation",
        workspaceId: workspace.id,
        userId: user.id,
      },
      select: { id: true, title: true, isPinned: true, lastMessageAt: true, createdAt: true },
    });

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}