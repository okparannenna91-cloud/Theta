import { prisma } from "./prisma";
import { getAblyServer, getWorkspaceChannel } from "./ably";
import {
  NotificationType,
  NotificationPriority,
  NotificationMetadata,
  NotificationAction,
  getNotificationCategory,
  getNotificationPriority,
} from "./notification-types";
import { sendNotificationEmail } from "@/lib/email/notification-email";
import { sendPushNotification } from "@/lib/push-notifications";

export type { NotificationType, NotificationPriority, NotificationMetadata };

function isDndActive(dndEnabled: boolean, dndStart: string | null, dndEnd: string | null): boolean {
  if (!dndEnabled || !dndStart || !dndEnd) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = dndStart.split(":").map(Number);
  const [endH, endM] = dndEnd.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

export async function createNotification(
  userId: string,
  workspaceId: string,
  type: NotificationType,
  title: string,
  message: string,
  metadata?: NotificationMetadata,
  groupKey?: string
) {
  const priority = getNotificationPriority(type);
  const category = getNotificationCategory(type);

  try {
    const preference = await prisma.userPreference.findUnique({ where: { userId } });
    const dndActive = isDndActive(
      preference?.dndEnabled || false,
      preference?.dndStart || null,
      preference?.dndEnd || null
    );

    let notification: any;

    if (groupKey) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          workspaceId,
          groupKey,
          read: false,
          archived: false,
        },
        orderBy: { createdAt: "desc" },
      });

      if (existing) {
        notification = await prisma.notification.update({
          where: { id: existing.id },
          data: {
            message,
            groupCount: { increment: 1 },
            metadata: metadata || {},
            updatedAt: new Date(),
          },
        });
      } else {
        notification = await prisma.notification.create({
          data: {
            userId,
            workspaceId,
            type,
            title,
            message,
            priority,
            metadata: metadata || {},
            read: false,
            archived: false,
            groupKey,
            groupCount: 1,
          },
        });
      }
    } else {
      notification = await prisma.notification.create({
        data: {
          userId,
          workspaceId,
          type,
          title,
          message,
          priority,
          metadata: metadata || {},
          read: false,
          archived: false,
          groupCount: 1,
        },
      });
    }

    if (!dndActive) {
      await publishToAbly(workspaceId, notification);
      try {
        const { notifyWorkspace } = await import("./integrations/slack");
        await notifyWorkspace(workspaceId, message, title);
      } catch {}

      if (preference?.emailNotifications !== false) {
        const actionUrl = (metadata as any)?.taskId
          ? `https://www.thetapm.site/tasks`
          : undefined;
        sendNotificationEmail(userId, title, message, actionUrl).catch(() => {});
      }

      if (preference?.pushNotifications !== false) {
        sendPushNotification(userId, title, message).catch(() => {});
      }
    }

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

    const unreadCount = await prisma.notification.count({
      where: { workspaceId, userId: notification.userId, read: false },
    });
    await channel.publish("notification:count", {
      userId: notification.userId,
      count: unreadCount,
    });
  } catch (error) {
    console.error("Failed to publish to Ably:", error);
  }
}

export async function createNotificationWithActions(
  userId: string,
  workspaceId: string,
  type: NotificationType,
  title: string,
  message: string,
  actions: NotificationAction[],
  metadata?: NotificationMetadata
) {
  return createNotification(userId, workspaceId, type, title, message, {
    ...metadata,
    actions,
  });
}

export async function notifyTaskAssignees(
  workspaceId: string,
  actorId: string,
  assigneeIds: string[],
  type: NotificationType,
  title: string,
  message: string,
  metadata?: NotificationMetadata
) {
  const otherAssigneeIds = assigneeIds.filter((id) => id !== actorId);
  if (otherAssigneeIds.length === 0) return;

  await Promise.all(
    otherAssigneeIds.map((userId) =>
      createNotification(userId, workspaceId, type, title, message, metadata)
    )
  );
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

    let otherMembers = members.filter((m: any) => m.userId !== actorId);

    const projectId = metadata?.projectId;
    if (projectId) {
      const { canAccessProject } = await import("./project-permissions");
      const accessResults = await Promise.all(
        otherMembers.map(async (m: any) => ({
          userId: m.userId,
          hasAccess: (
            await canAccessProject(m.userId, projectId, workspaceId)
          ).hasAccess,
        }))
      );
      const accessibleUserIds = new Set(
        accessResults.filter((r) => r.hasAccess).map((r) => r.userId)
      );
      otherMembers = otherMembers.filter((m: any) =>
        accessibleUserIds.has(m.userId)
      );
    }

    await Promise.all(
      otherMembers.map((m: any) =>
        createNotification(m.userId, workspaceId, type, title, message, metadata)
      )
    );
  } catch (error) {
    console.error("Failed to notify workspace members:", error);
  }
}

export async function getNotifications(
  userId: string,
  workspaceId: string,
  options?: {
    filter?: string;
    skip?: number;
    take?: number;
    search?: string;
  }
) {
  const { filter = "all", skip = 0, take = 50, search } = options || {};

  const where: any = { userId, workspaceId, archived: false };

  if (filter === "unread") where.read = false;
  if (filter === "archived") {
    where.archived = true;
    delete where.archived;
    where.archived = true;
  }
  if (filter === "mentions") where.type = { in: ["mention", "task_mentioned"] };
  if (filter === "tasks") {
    where.type = {
      in: [
        "task_assigned", "task_unassigned", "task_mentioned", "task_completed",
        "task_reopened", "task_due_soon", "task_overdue", "task_status_changed",
        "priority_changed", "dependency_blocked", "dependency_unblocked",
        "recurring_task_created", "comment_reply",
      ],
    };
  }
  if (filter === "calendar") {
    where.type = {
      in: [
        "calendar_event_created", "calendar_event_updated",
        "calendar_event_starting_soon", "calendar_event_missed",
      ],
    };
  }
  if (filter === "alerts") {
    where.type = { in: ["smart_alert", "nova_suggestion", "limit_warning"] };
  }
  if (filter === "digest") {
    where.type = { in: ["daily_summary", "weekly_summary"] };
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { message: { contains: search, mode: "insensitive" } },
    ];
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.notification.count({ where }),
  ]);

  const unreadCount = await prisma.notification.count({
    where: { userId, workspaceId, read: false, archived: false },
  });

  return { notifications, unreadCount, hasMore: skip + take < total };
}

export async function markAsRead(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
}

export async function markAllAsRead(userId: string, workspaceId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, workspaceId, read: false, archived: false },
    data: { read: true },
  });

  try {
    const ably = getAblyServer();
    const channelName = getWorkspaceChannel(workspaceId);
    const channel = ably.channels.get(channelName);
    await channel.publish("notification:count", { userId, count: 0 });
  } catch {}

  return result;
}

export async function archiveNotification(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { archived: true },
  });
}

export async function deleteNotification(notificationId: string) {
  return prisma.notification.delete({ where: { id: notificationId } });
}

export async function getUnreadCount(
  userId: string,
  workspaceId: string
): Promise<number> {
  return prisma.notification.count({
    where: { userId, workspaceId, read: false, archived: false },
  });
}

export async function getUnreadCountByPriority(
  userId: string,
  workspaceId: string
) {
  const counts = await prisma.notification.groupBy({
    by: ["priority"],
    where: { userId, workspaceId, read: false, archived: false },
    _count: true,
  });
  return {
    critical: counts.find((c: any) => c.priority === "critical")?._count || 0,
    medium: counts.find((c: any) => c.priority === "medium")?._count || 0,
    low: counts.find((c: any) => c.priority === "low")?._count || 0,
    total: counts.reduce((s: number, c: any) => s + c._count, 0),
  };
}
