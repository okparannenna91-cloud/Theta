import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentWorkspace, verifyWorkspaceAccess } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getOwnedConversation(conversationId: string, userId: string) {
  return prisma.aiConversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true, title: true, isPinned: true, isArchived: true, lastMessageAt: true, createdAt: true, workspaceId: true },
  });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspace = await getCurrentWorkspace(user.id);
    if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const includeMessages = searchParams.get("messages") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 200);
    const cursor = searchParams.get("cursor") || undefined;

    const conversation = await getOwnedConversation(id, user.id);
    if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let messages: any[] = [];
    let nextCursor: string | null = null;

    if (includeMessages) {
      const msgs = await prisma.aiMessage.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: { id: true, role: true, content: true, metadata: true, createdAt: true },
      });
      if (msgs.length > limit) {
        const next = msgs.pop();
        nextCursor = next!.id;
      }
      messages = msgs.reverse();
    }

    return NextResponse.json({ conversation, messages, nextCursor });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch conversation" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspace = await getCurrentWorkspace(user.id);
    if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const { title, isPinned, isArchived } = body;

    const conversation = await getOwnedConversation(id, user.id);
    if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.aiConversation.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(isPinned !== undefined && { isPinned }),
        ...(isArchived !== undefined && { isArchived }),
      },
      select: { id: true, title: true, isPinned: true, isArchived: true, lastMessageAt: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update conversation" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspace = await getCurrentWorkspace(user.id);
    if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 403 });

    const { id } = await params;
    const conversation = await getOwnedConversation(id, user.id);
    if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.aiConversation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 });
  }
}