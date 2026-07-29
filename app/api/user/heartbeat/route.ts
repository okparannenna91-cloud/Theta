import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { lastActiveAt: new Date() },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Heartbeat error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
