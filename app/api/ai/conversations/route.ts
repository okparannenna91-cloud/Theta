import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

        const conversations = await prisma.aiConversation.findMany({
            where: {
                workspaceId,
                userId: user.id,
                isArchived: false,
            },
            orderBy: {
                lastMessageAt: "desc",
            },
            take: 50,
        });

        return NextResponse.json(conversations);
    } catch (error: any) {
        console.error("AI Conversations GET error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { workspaceId, title } = await req.json();

        if (!workspaceId) {
            return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
        }

        const conversation = await prisma.aiConversation.create({
            data: {
                workspaceId,
                userId: user.id,
                title: title || "New Conversation",
            },
        });

        return NextResponse.json(conversation);
    } catch (error: any) {
        console.error("AI Conversations POST error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
