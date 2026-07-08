import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/super-admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!(await isSuperAdmin(user.id))) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const count = await prisma.chatMessage.count();
        const latest = await prisma.chatMessage.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            select: { id: true, content: true, teamId: true, workspaceId: true, createdAt: true }
        });
        return NextResponse.json({ count, latest });
    } catch (e: any) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
