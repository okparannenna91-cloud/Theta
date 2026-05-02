import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { teamId, workspaceId } = body;

        if (!teamId || !workspaceId) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        const db = getPrismaClient(workspaceId);

        await db.teamMember.update({
            where: {
                teamId_userId: {
                    teamId,
                    userId: user.id
                }
            },
            data: {
                lastReadAt: new Date()
            }
        });

        // Broadcast the read receipt to Ably
        const { publishToChannel, getChatChannel } = await import("@/lib/ably");
        const channelName = `team:${teamId}:chat`;
        await publishToChannel(channelName, "read:updated", {
            userId: user.id,
            teamId,
            timestamp: new Date().toISOString()
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Chat read update error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
