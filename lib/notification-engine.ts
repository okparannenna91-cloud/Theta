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

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return false;
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) return true;
  return false;
}

if (rateLimitMap.size > 10_000) {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
  for (const [key, val] of rateLimitMap) {
    if (val.windowStart < cutoff) rateLimitMap.delete(key);
  }
}

const TYPE_PREFERENCE_MAP: Record<string, keyof { emailNotifications: boolean; pushNotifications: boolean }> = {
  task_assigned: "emailNotifications",
  task_mentioned: "emailNotifications",
  comment_reply: "emailNotifications",
  reminder: "emailNotifications",
};

function shouldSendForType(
  type: string,
  preference: { emailNotifications?: boolean; pushNotifications?: boolean } | null,
): { email: boolean; push: boolean } {
  const emailKey = TYPE_PREFERENCE_MAP[type];
  return {
    email: emailKey ? (preference?.[emailKey] ?? true) : (preference?.emailNotifications !== false),
    push: preference?.pushNotifications !== false,
  };
}

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [5_000, 30_000, 120_000];

async function logDeliveryAttempt(
  notificationId: string,
  channel: string,
  status: string,
  error?: string,
  attempt: number = 1,
): Promise<void> {
  try {
    await prisma.notificationDeliveryLog.create({
      data: {
        notificationId,
        channel,
        status,
        error,
        attempt,
        maxAttempts: MAX_RETRIES,
        nextRetryAt: status === "failed" && attempt < MAX_RETRIES
          ? new Date(Date.now() + RETRY_DELAYS_MS[attempt - 1])
          : null,
      },
    });
  } catch {
    // delivery log failure is non-critical
  }
}

async function updateNotificationDeliveryStatus(
  notificationId: string,
  status: string,
): Promise<void> {
  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { deliveryStatus: status },
    });
  } catch {
    // non-critical
  }
}

export async function retryFailedDeliveries(): Promise<number> {
  try {
    const pending = await prisma.notificationDeliveryLog.findMany({
      where: {
        status: "failed",
        attempt: { lt: MAX_RETRIES },
        nextRetryAt: { lte: new Date() },
      },
      include: { notification: true },
      take: 50,
    });

    let retried = 0;
    for (const log of pending) {
      const { notification, channel } = log;
      try {
        if (channel === "email") {
          const deepLink = (notification.metadata as any)?.deepLink;
          const taskId = (notification.metadata as any)?.taskId;
          const actionUrl = deepLink
            ? `https://www.thetapm.site${deepLink}`
            : taskId
              ? `https://www.thetapm.site/tasks/${taskId}`
              : undefined;
          await sendNotificationEmail(notification.userId, notification.title, notification.message, actionUrl);
        } else if (channel === "push") {
          await sendPushNotification(notification.userId, notification.title, notification.message);
        } else if (channel === "ably") {
          const ably = getAblyServer();
          const channelName = getWorkspaceChannel(notification.workspaceId);
          const ch = ably.channels.get(channelName);
          await ch.publish("notification", notification);
        }
        await logDeliveryAttempt(notification.id, channel, "sent", undefined, log.attempt + 1);
        retried++;
      } catch (err) {
        await logDeliveryAttempt(
          notification.id,
          channel,
          "failed",
          err instanceof Error ? err.message : String(err),
          log.attempt + 1,
        );
      }
    }

    return retried;
  } catch (err) {
    console.error("Failed to retry deliveries:", err);
    return 0;
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
    if (isRateLimited(userId)) {
      console.warn(`[NotificationEngine] Rate limited for user ${userId}`);
      return null;
    }

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
            deliveryStatus: "pending",
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
          deliveryStatus: "pending",
        },
      });
    }

    if (!dndActive) {
      const typePrefs = shouldSendForType(type, preference);

      const deliveryPromises: Promise<void>[] = [];

      deliveryPromises.push(
        publishToAbly(workspaceId, notification)
          .then(() => updateNotificationDeliveryStatus(notification.id, "sent"))
          .catch(async (err) => {
            await logDeliveryAttempt(notification.id, "ably", "failed", err instanceof Error ? err.message : String(err));
            await updateNotificationDeliveryStatus(notification.id, "failed");
          })
      );

      deliveryPromises.push(
        (async () => {
          try {
            const { notifyWorkspace } = await import("./integrations/slack");
            await notifyWorkspace(workspaceId, message, title);
            await logDeliveryAttempt(notification.id, "slack", "sent");
          } catch (err) {
            await logDeliveryAttempt(notification.id, "slack", "failed", err instanceof Error ? err.message : String(err));
          }
        })()
      );

      if (typePrefs.email) {
        deliveryPromises.push(
          (async () => {
            try {
              const deepLink = (metadata as any)?.deepLink || (metadata as any)?.link;
              const taskId = (metadata as any)?.taskId;
              const actionUrl = deepLink
                ? `https://www.thetapm.site${deepLink}`
                : taskId
                  ? `https://www.thetapm.site/tasks/${taskId}`
                  : undefined;
              await sendNotificationEmail(userId, title, message, actionUrl);
              await logDeliveryAttempt(notification.id, "email", "sent");
            } catch (err) {
              await logDeliveryAttempt(notification.id, "email", "failed", err instanceof Error ? err.message : String(err));
            }
          })()
        );
      }

      if (typePrefs.push) {
        deliveryPromises.push(
          (async () => {
            try {
              await sendPushNotification(userId, title, message);
              await logDeliveryAttempt(notification.id, "push", "sent");
            } catch (err) {
              await logDeliveryAttempt(notification.id, "push", "failed", err instanceof Error ? err.message : String(err));
            }
          })()
        );
      }

      void Promise.allSettled(deliveryPromises);
    } else {
      await updateNotificationDeliveryStatus(notification.id, "sent");
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

const ACCESS_CACHE_TTL = 60_000;
const accessCache = new Map<string, { value: boolean; expires: number }>();

async function cachedCanAccessProject(userId: string, projectId: string, workspaceId: string): Promise<boolean> {
  const key = `${userId}:${projectId}`;
  const hit = accessCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const { canAccessProject } = await import("./project-permissions");
  const { hasAccess } = await canAccessProject(userId, projectId, workspaceId);
  accessCache.set(key, { value: hasAccess, expires: Date.now() + ACCESS_CACHE_TTL });
  if (accessCache.size > 500) accessCache.clear();
  return hasAccess;
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
      const accessResults = await Promise.all(
        otherMembers.map(async (m: any) => ({
          userId: m.userId,
          hasAccess: await cachedCanAccessProject(m.userId, projectId, workspaceId),
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
