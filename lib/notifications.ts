import { prisma } from "./prisma";
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
        // Create notification in database
        const notification = await prisma.notification.create({
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
    return await prisma.notification.findMany({
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
export async function markAsRead(notificationId: string) {
    return await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
    });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string, workspaceId: string) {
    return await prisma.notification.updateMany({
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
export async function deleteNotification(notificationId: string) {
    return await prisma.notification.delete({
        where: { id: notificationId },
    });
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string, workspaceId: string): Promise<number> {
    return await prisma.notification.count({
        where: {
            userId,
            workspaceId,
            read: false,
        },
    });
}
