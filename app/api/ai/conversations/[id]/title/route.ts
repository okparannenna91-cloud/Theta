import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateConversationTitle } from "@/lib/nova/conversation-title";

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { workspaceId, prompt } = await req.json();

        if (!workspaceId) {
            return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
        }

        const conversation = await prisma.aiConversation.findUnique({
            where: { id: params.id },
            select: { id: true, userId: true },
        });

        if (!conversation || conversation.userId !== user.id) {
            return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
        }

        const title = await generateConversationTitle(prompt || "");
        if (!title) {
            return NextResponse.json({ title: null });
        }

        await prisma.aiConversation.update({
            where: { id: params.id },
            data: { title },
        });

        return NextResponse.json({ title });
    } catch (error: any) {
        console.error("AI Conversation Title POST error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
