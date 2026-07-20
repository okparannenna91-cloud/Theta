import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis/client";
import { executeWithProvider } from "@/lib/langraph/model-router";
import { logger } from "@/lib/logger";
import { createNotification } from "@/lib/notification-engine";
import type { NotificationType } from "@/lib/notification-types";

const NOTIFICATION_TTL_SECONDS = 86400;

export interface SmartNotification {
  id: string;
  type: string;
  priority: "urgent" | "high" | "medium" | "low";
  title: string;
  message: string;
  context: string;
  actionLinks: Array<{ label: string; href: string }>;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export class SmartNotifications {
  static async generateContextualNotifications(
    workspaceId: string,
    userId: string,
  ): Promise<SmartNotification[]> {
    const notifications: SmartNotification[] = [];

    try {
      const [
        userTasks,
        blockedTasks,
        overdueTasks,
        upcomingTasks,
        recentActivity,
      ] = await Promise.all([
        prisma.task.findMany({
          where: {
            workspaceId,
            assigneeIds: { has: userId },
            status: { notIn: ["done", "completed", "cancelled"] },
          },
          include: {
            predecessors: {
              select: { predecessorId: true, task: { select: { title: true, status: true, dueDate: true } } },
            },
            project: { select: { name: true } },
          },
        }),
        prisma.task.findMany({
          where: {
            workspaceId,
            assigneeIds: { has: userId },
            status: "blocked",
          },
          include: {
            predecessors: {
              select: { predecessorId: true, task: { select: { title: true, status: true, dueDate: true } } },
            },
          },
        }),
        prisma.task.findMany({
          where: {
            workspaceId,
            assigneeIds: { has: userId },
            status: { notIn: ["done", "completed", "cancelled"] },
            dueDate: { lt: new Date() },
          },
        }),
        prisma.task.findMany({
          where: {
            workspaceId,
            assigneeIds: { has: userId },
            status: { notIn: ["done", "completed", "cancelled"] },
            dueDate: {
              gte: new Date(),
              lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.activity.findMany({
          where: {
            workspaceId,
            userId,
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
      ]);

      // Dependency risk notifications
      for (const task of blockedTasks) {
        const blockingDeps = task.predecessors.filter(
          (p: { task: { status: string } }) => !["done", "completed"].includes(p.task.status)
        );

        for (const dep of blockingDeps) {
          notifications.push({
            id: `dep-risk-${task.id}-${dep.predecessorId}`,
            type: "dependency_risk",
            priority: "high",
            title: `Task "${task.title}" is at risk`,
            message: `It depends on "${dep.task.title}" which is ${dep.task.status}${dep.task.dueDate ? ` (due ${new Date(dep.task.dueDate).toLocaleDateString()})` : ""}`,
            context: `Dependency chain: ${dep.task.title} → ${task.title}`,
            actionLinks: [
              { label: "View Task", href: `/tasks/${task.id}` },
              { label: "View Blocker", href: `/tasks/${dep.predecessorId}` },
            ],
            metadata: { taskId: task.id, blockerId: dep.predecessorId },
            createdAt: new Date(),
          });
        }
      }

      // Capacity overload notifications
      const now = new Date();
      const daysUntilEndOfWeek = 7 - now.getDay();
      const upcomingHours = upcomingTasks.reduce(
        (sum, t) => sum + (t.estimatedHours || 4),
        0
      );
      const estimatedDaysAvailable = daysUntilEndOfWeek * 0.8;
      const estimatedHoursAvailable = estimatedDaysAvailable * 8;

      if (upcomingTasks.length > 0 && upcomingHours > estimatedHoursAvailable) {
        notifications.push({
          id: `capacity-overload-${userId}-${workspaceId}`,
          type: "capacity_overload",
          priority: "high",
          title: "Capacity overload detected",
          message: `You have ${upcomingTasks.length} tasks due this week (~${upcomingHours}h) but only ~${Math.round(estimatedHoursAvailable)}h of capacity based on your schedule`,
          context: `${upcomingTasks.length} tasks, ~${upcomingHours}h estimated, ${Math.round(estimatedHoursAvailable)}h available`,
          actionLinks: [
            { label: "View My Tasks", href: "/tasks" },
          ],
          metadata: {
            taskCount: upcomingTasks.length,
            estimatedHours: upcomingHours,
            availableHours: estimatedHoursAvailable,
          },
          createdAt: new Date(),
        });
      }

      // Overdue task notifications
      if (overdueTasks.length > 0) {
        const maxOverdueDays = Math.max(
          ...overdueTasks.map((t) =>
            Math.ceil(
              (now.getTime() - new Date(t.dueDate!).getTime()) / (1000 * 60 * 60 * 24)
            )
          )
        );

        notifications.push({
          id: `overdue-summary-${userId}-${workspaceId}`,
          type: "overdue_tasks",
          priority: maxOverdueDays > 7 ? "urgent" : "high",
          title: `${overdueTasks.length} overdue task(s)`,
          message: `You have ${overdueTasks.length} task(s) past their due date. The most overdue is ${maxOverdueDays} day(s) late.`,
          context: overdueTasks.map((t) => t.title).join(", "),
          actionLinks: [
            { label: "View Overdue Tasks", href: "/tasks?filter=overdue" },
          ],
          metadata: {
            overdueCount: overdueTasks.length,
            maxOverdueDays,
            taskIds: overdueTasks.map((t) => t.id),
          },
          createdAt: new Date(),
        });
      }

      // Use LLM for deeper contextual analysis
      if (userTasks.length > 3) {
        try {
          const taskSummary = userTasks
            .map(
              (t) =>
                `- "${t.title}" [${t.status}] priority:${t.priority} due:${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "none"}`
            )
            .join("\n");

          const activitySummary = recentActivity
            .slice(0, 10)
            .map((a) => `- ${a.action} ${a.entityType} at ${new Date(a.createdAt).toLocaleDateString()}`)
            .join("\n");

          const prompt = `You are a project management assistant. Analyze this user's task situation and identify any contextual risks or insights not already captured.

Tasks:
${taskSummary}

Recent activity:
${activitySummary || "No recent activity"}

Identify 1-2 specific, actionable insights. Respond with JSON:
[
  {
    "title": "concise title",
    "message": "detailed explanation with specific task references",
    "priority": "urgent|high|medium|low"
  }
]

Be specific. Reference actual task names. Return ONLY the JSON array, or an empty array if nothing notable.`;

          const response = await executeWithProvider(
            "gemini",
            "gemini-2.5-flash",
            "You are a JSON-only parser. Respond with a valid JSON array only.",
            prompt
          );

          const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();
          const parsed = JSON.parse(cleaned);

          if (Array.isArray(parsed)) {
            for (const item of parsed.slice(0, 2)) {
              if (item.title && item.message) {
                notifications.push({
                  id: `llm-insight-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  type: "ai_insight",
                  priority: item.priority || "medium",
                  title: item.title,
                  message: item.message,
                  context: "AI-generated insight",
                  actionLinks: [{ label: "View Tasks", href: "/tasks" }],
                  metadata: { source: "llm" },
                  createdAt: new Date(),
                });
              }
            }
          }
        } catch (error) {
          logger.warn("[SmartNotifications] LLM insight generation failed:", error);
        }
      }

      // Store notifications in Redis
      for (const notification of notifications) {
        try {
          const cacheKey = `smart-notif:${workspaceId}:${userId}:${notification.id}`;
          await redis.set(cacheKey, JSON.stringify(notification), { ex: NOTIFICATION_TTL_SECONDS });
        } catch (error) {
          logger.warn("[SmartNotifications] Redis cache failed:", error);
        }
      }

      return notifications.sort((a, b) => {
        const priorityOrder: Record<string, number> = {
          urgent: 0,
          high: 1,
          medium: 2,
          low: 3,
        };
        return (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3);
      });
    } catch (error) {
      logger.error("[SmartNotifications] Generation failed:", error);
      return [];
    }
  }

  static getNotificationPriority(
    notification: SmartNotification,
  ): SmartNotification["priority"] {
    const { type, metadata } = notification;

    if (type === "dependency_risk") {
      const blocker = metadata as { blockerDueDate?: string };
      if (blocker.blockerDueDate) {
        const daysUntilDue = Math.ceil(
          (new Date(blocker.blockerDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilDue < 0) return "urgent";
        if (daysUntilDue <= 2) return "high";
      }
      return "high";
    }

    if (type === "capacity_overload") {
      const meta = metadata as { estimatedHours?: number; availableHours?: number };
      if (meta.estimatedHours && meta.availableHours) {
        const ratio = meta.estimatedHours / meta.availableHours;
        if (ratio > 1.5) return "urgent";
        if (ratio > 1.2) return "high";
        if (ratio > 1) return "medium";
      }
      return "medium";
    }

    if (type === "overdue_tasks") {
      const meta = metadata as { maxOverdueDays?: number };
      if (meta.maxOverdueDays && meta.maxOverdueDays > 7) return "urgent";
      if (meta.maxOverdueDays && meta.maxOverdueDays > 3) return "high";
      return "medium";
    }

    if (type === "ai_insight") {
      return notification.priority;
    }

    return notification.priority;
  }

  static formatNotificationForDisplay(
    notification: SmartNotification,
  ): {
    title: string;
    message: string;
    priorityBadge: string;
    priorityColor: string;
    icon: string;
    actionLinks: Array<{ label: string; href: string }>;
    timestamp: string;
    groupKey: string;
  } {
    const priorityConfig: Record<string, { badge: string; color: string; icon: string }> = {
      urgent: { badge: "URGENT", color: "#dc2626", icon: "!" },
      high: { badge: "HIGH", color: "#ea580c", icon: "!" },
      medium: { badge: "MEDIUM", color: "#ca8a04", icon: "~" },
      low: { badge: "LOW", color: "#16a34a", icon: "-" },
    };

    const config = priorityConfig[notification.priority] || priorityConfig.medium;

    const iconMap: Record<string, string> = {
      dependency_risk: "~",
      capacity_overload: "!",
      overdue_tasks: "#",
      ai_insight: "*",
    };

    const timestamp = notification.createdAt.toLocaleString();

    return {
      title: notification.title,
      message: notification.message,
      priorityBadge: config.badge,
      priorityColor: config.color,
      icon: iconMap[notification.type] || config.icon,
      actionLinks: notification.actionLinks,
      timestamp,
      groupKey: `${notification.type}-${notification.metadata?.taskId || "general"}`,
    };
  }
}
