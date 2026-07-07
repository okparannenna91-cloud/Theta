import { prisma } from "./prisma";
import { getAblyServer, getWorkspaceChannel } from "./ably";

export type NotificationType =
    | "task_assigned"
    | "task_updated"
    | "task_completed"
    | "project_created"
    | "project_updated"
    | "project_update"
    | "team_invite"
    | "team_joined"
    | "workspace_invite"
    | "limit_warning"
    | "payment_success"
    | "payment_failed"
    | "mention"
    | "comment"
    | "deadline"
    | "reminder";

interface NotificationMetadata {
    [key: string]: any;
}

export async function createNotification(
    userId: string,
    workspaceId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: NotificationMetadata
) {
    try {
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

        await publishToAbly(workspaceId, notification);

        await triggerSlackNotification(workspaceId, title, message);

        return notification;
    } catch (error) {
        console.error("Failed to create notification:", error);
        throw error;
    }
}

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

export async function triggerSlackNotification(workspaceId: string, title: string, message: string) {
    try {
        const { notifyWorkspace } = await import("./integrations/slack");
        await notifyWorkspace(workspaceId, message, title);
    } catch (error) {
        console.error("Failed to trigger Slack notification:", error);
    }
}

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

export async function markAsRead(notificationId: string, workspaceId: string) {
    return await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
    });
}

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

export async function deleteNotification(notificationId: string, workspaceId: string) {
    return await prisma.notification.delete({
        where: { id: notificationId },
    });
}

export async function getUnreadCount(userId: string, workspaceId: string): Promise<number> {
    return await prisma.notification.count({
        where: {
            userId,
            workspaceId,
            read: false,
        },
    });
}

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
