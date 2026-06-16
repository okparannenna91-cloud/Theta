import { prisma, getPrismaClient } from "./prisma";
import { getAblyServer, getWorkspaceChannel } from "./ably";

export type NotificationType =
    | "task_assigned"
    | "task_updated"
    | "project_created"
    | "project_updated"
    | "team_invite"
    | "team_joined"
    | "workspace_invite"
    | "limit_warning"
    | "payment_success"
    | "payment_failed";

interface NotificationMetadata {
    [key: string]: any;
}

/**
 * Create a notification and publish to Ably
 */
export async function createNotification(
    userId: string,
    workspaceId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: NotificationMetadata
) {
    try {
        const db = getPrismaClient(workspaceId);
        // Create notification in database
        const notification = await db.notification.create({
            data: {
                userId,
                workspaceId,
                type,
                title,
                message,
                metadata: metadata || {},
                read: false,
            },
        });

        // Publish to Ably channel
        await publishToAbly(workspaceId, notification);

        // Also trigger Slack
        await triggerSlackNotification(workspaceId, title, message);

        return notification;
    } catch (error) {
        console.error("Failed to create notification:", error);
        throw error;
    }
}

/**
 * Publish notification to Ably channel
 */
async function publishToAbly(workspaceId: string, notification: any) {
    try {
        const ably = getAblyServer();
        const channelName = getWorkspaceChannel(workspaceId);
        const channel = ably.channels.get(channelName);
        await channel.publish("notification", notification);
    } catch (error) {
        console.error("Failed to publish to Ably:", error);
    }
}

/**
 * Trigger Slack notification if integration exists
 */
export async function triggerSlackNotification(workspaceId: string, title: string, message: string) {
    try {
        const { notifyWorkspace } = await import("./integrations/slack");
        await notifyWorkspace(workspaceId, message, title);
    } catch (error) {
        console.error("Failed to trigger Slack notification:", error);
    }
}

/**
 * Get notifications for a user
 */
export async function getNotifications(
    userId: string,
    workspaceId: string,
    limit: number = 50
) {
    const db = getPrismaClient(workspaceId);
    return await db.notification.findMany({
        where: {
            userId,
            workspaceId,
        },
        orderBy: {
            createdAt: "desc",
        },
        take: limit,
    });
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string, workspaceId: string) {
    const db = getPrismaClient(workspaceId);
    return await db.notification.update({
        where: { id: notificationId },
        data: { read: true },
    });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string, workspaceId: string) {
    const db = getPrismaClient(workspaceId);
    return await db.notification.updateMany({
        where: {
            userId,
            workspaceId,
            read: false,
        },
        data: {
            read: true,
        },
    });
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string, workspaceId: string) {
    const db = getPrismaClient(workspaceId);
    return await db.notification.delete({
        where: { id: notificationId },
    });
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string, workspaceId: string): Promise<number> {
    const db = getPrismaClient(workspaceId);
    return await db.notification.count({
        where: {
            userId,
            workspaceId,
            read: false,
        },
    });
}

/**
 * Notify members of a workspace (optionally filtered by project access).
 * If metadata includes a projectId, recipients are filtered to only those with access.
 */
export async function notifyWorkspaceMembers(
    workspaceId: string,
    actorId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: NotificationMetadata
) {
    try {
        const { getWorkspaceMembers } = await import("./workspace");
        const members = await getWorkspaceMembers(workspaceId);
        
        let otherMembers = members.filter(m => m.userId !== actorId);

        // If notification is about a specific project, filter recipients by project access
        const projectId = metadata?.projectId as string | undefined;
        if (projectId) {
            const { canAccessProject } = await import("./project-permissions");
            const accessResults = await Promise.all(
                otherMembers.map(async (m) => ({
                    userId: m.userId,
                    hasAccess: (await canAccessProject(m.userId, projectId, workspaceId)).hasAccess,
                }))
            );
            const accessibleUserIds = new Set(
                accessResults.filter(r => r.hasAccess).map(r => r.userId)
            );
            otherMembers = otherMembers.filter(m => accessibleUserIds.has(m.userId));
        }
        
        await Promise.all(
            otherMembers.map(m => 
                createNotification(m.userId, workspaceId, type, title, message, metadata)
            )
        );
    } catch (error) {
        console.error("Failed to notify workspace members:", error);
    }
}
