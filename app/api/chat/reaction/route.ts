import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { publishToChannel } from "@/lib/ably";

const reactionSchema = z.object({
  messageId: z.string(),
  reactionId: z.string().min(1).max(50),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = reactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 });
    }

    const { messageId, reactionId } = parsed.data;

    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, reactions: true, teamId: true, workspaceId: true },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const reactions = (message.reactions as Record<string, string[]>) || {};

    if (reactions[reactionId]?.includes(user.id)) {
      reactions[reactionId] = reactions[reactionId].filter((uid: string) => uid !== user.id);
      if (reactions[reactionId].length === 0) {
        delete reactions[reactionId];
      }
    } else {
      if (!reactions[reactionId]) {
        reactions[reactionId] = [];
      }
      reactions[reactionId].push(user.id);
    }

    await prisma.chatMessage.update({
      where: { id: messageId },
      data: { reactions: reactions as any },
    });

    if (message.teamId) {
      publishToChannel(`team:${message.teamId}:chat`, "message:updated", {
        id: messageId,
        reactions,
      });
    }

    return NextResponse.json({ reactions });
  } catch (error) {
    console.error("[REACTION_ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
