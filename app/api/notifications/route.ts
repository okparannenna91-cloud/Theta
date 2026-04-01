import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get("workspaceId");

        if (!workspaceId) return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });

        const db = getPrismaClient(workspaceId);
        
        const notifications = await db.notification.findMany({
            where: {
                workspaceId,
                userId: user.id
            },
            orderBy: { createdAt: "desc" },
            take: 100 // Limit to 100 latest
        });

        return NextResponse.json(notifications);
    } catch (error) {
        console.error("Fetch notifications error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get("workspaceId");

        if (!workspaceId) return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });

        const body = await req.json();
        const { notificationId, markAllAsRead } = body;

        const db = getPrismaClient(workspaceId);

        if (markAllAsRead) {
            await db.notification.updateMany({
                where: { workspaceId, userId: user.id, read: false },
                data: { read: true }
            });
            return NextResponse.json({ success: true });
        }

        if (notificationId) {
            const updated = await db.notification.update({
                where: { id: notificationId },
                data: { read: true }
            });
            return NextResponse.json(updated);
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Update notifications error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get("workspaceId");
        const notificationId = searchParams.get("id");

        if (!workspaceId || !notificationId) return NextResponse.json({ error: "Missing params" }, { status: 400 });

        const db = getPrismaClient(workspaceId);

        await db.notification.delete({
            where: { id: notificationId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete notification error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
