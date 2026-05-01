import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get("workspaceId");
        const filter = searchParams.get("filter") || "all";
        const skip = parseInt(searchParams.get("skip") || "0");
        const take = parseInt(searchParams.get("take") || "20");

        if (!workspaceId) return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });

        const db = getPrismaClient(workspaceId);
        
        const where: any = {
            workspaceId,
            userId: user.id
        };

        // Filter logic
        switch (filter) {
            case "unread":
                where.read = false;
                where.archived = false;
                break;
            case "mentions":
                where.type = "mention";
                where.archived = false;
                break;
            case "assigned":
                where.type = "task_assigned";
                where.archived = false;
                break;
            case "reminders":
                where.type = "reminder";
                where.archived = false;
                break;
            case "archived":
                where.archived = true;
                break;
            default:
                where.archived = false;
                break;
        }

        const [notifications, total, unreadCount] = await Promise.all([
            db.notification.findMany({
                where,
                orderBy: [
                    { pinned: "desc" },
                    { createdAt: "desc" }
                ],
                skip,
                take
            }),
            db.notification.count({ where }),
            db.notification.count({ where: { workspaceId, userId: user.id, read: false, archived: false } })
        ]);

        return NextResponse.json({ 
            notifications, 
            total,
            unreadCount,
            hasMore: skip + take < total
        });
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
        const { notificationId, markAllAsRead, archived, pinned, read } = body;

        const db = getPrismaClient(workspaceId);

        if (markAllAsRead) {
            await db.notification.updateMany({
                where: { workspaceId, userId: user.id, read: false, archived: false },
                data: { read: true }
            });
            return NextResponse.json({ success: true });
        }

        if (notificationId) {
            const data: any = {};
            if (read !== undefined) data.read = read;
            if (archived !== undefined) data.archived = archived;
            if (pinned !== undefined) data.pinned = pinned;

            const updated = await db.notification.update({
                where: { id: notificationId },
                data
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
