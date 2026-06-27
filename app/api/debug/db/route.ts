import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const count = await prisma.chatMessage.count();
        const latest = await prisma.chatMessage.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            select: { id: true, content: true, teamId: true, workspaceId: true, createdAt: true }
        });
        return NextResponse.json({ count, latest });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
