import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { getAccessibleProjectIds } from "@/lib/project-permissions";

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

        // Verify workspace access
        const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied to workspace" }, { status: 403 });
        }

        // Get accessible project IDs for filtering notifications by project access
        const accessibleProjectIds = await getAccessibleProjectIds(user.id, workspaceId);
        
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

        // Fetch take+1 to detect if there are more pages after post-filtering
        const [notifications, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where,
                orderBy: [
                    { pinned: "desc" },
                    { createdAt: "desc" }
                ],
                skip,
                take: take + 1
            }),
            prisma.notification.count({ where: { workspaceId, userId: user.id, read: false, archived: false } })
        ]);

        // Post-filter notifications whose metadata references an inaccessible project
        const allFiltered = notifications.filter((n: any) => {
            if (!n.metadata || !n.metadata.projectId) return true;
            return accessibleProjectIds.includes(n.metadata.projectId);
        });

        const hasMore = allFiltered.length > take;
        const filteredNotifications = allFiltered.slice(0, take);

        return NextResponse.json({ 
            notifications: filteredNotifications, 
            unreadCount,
            hasMore
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

        // Verify workspace access
        const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied to workspace" }, { status: 403 });
        }

        const body = await req.json();
        const { notificationId, markAllAsRead, archived, pinned, read } = body;

        if (markAllAsRead) {
            await prisma.notification.updateMany({
                where: { workspaceId, userId: user.id, read: false, archived: false },
                data: { read: true }
            });
            return NextResponse.json({ success: true });
        }

        if (notificationId) {
            // Verify notification ownership
            const notification = await prisma.notification.findUnique({
                where: { id: notificationId }
            });

            if (!notification) {
                return NextResponse.json({ error: "Notification not found" }, { status: 404 });
            }

            if (notification.userId !== user.id) {
                return NextResponse.json({ error: "Forbidden: You don't own this notification" }, { status: 403 });
            }

            const data: any = {};
            if (read !== undefined) data.read = read;
            if (archived !== undefined) data.archived = archived;
            if (pinned !== undefined) data.pinned = pinned;

            const updated = await prisma.notification.update({
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

        // Verify workspace access
        const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied to workspace" }, { status: 403 });
        }

        // Verify notification ownership
        const notification = await prisma.notification.findUnique({
            where: { id: notificationId }
        });

        if (!notification) {
            return NextResponse.json({ error: "Notification not found" }, { status: 404 });
        }

        if (notification.userId !== user.id) {
            return NextResponse.json({ error: "Forbidden: You don't own this notification" }, { status: 403 });
        }

        await prisma.notification.delete({
            where: { id: notificationId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete notification error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

