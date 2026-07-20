import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notification-engine";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

async function findExistingReminder(userId: string, type: string, reminderKey: string, windowMinutes: number = 60) {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  const recent = await prisma.notification.findMany({
    where: { userId, type, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return recent.find((n) => (n.metadata as any)?.reminderKey === reminderKey) || null;
}

// ──────────────────────────────────────────────
//  TASK DEADLINE REMINDERS (every 30 minutes)
// ──────────────────────────────────────────────

export const taskDeadlineReminders = inngest.createFunction(
  { id: "notif-task-deadline-reminders", triggers: [{ cron: "TZ(UTC) */30 * * * *" }] },
  async ({ step }) => {
    logger.info("[Notif] Task deadline reminder check started");
    const now = new Date();
    const reminders: { label: string; ms: number }[] = [
      { label: "7d", ms: 7 * 24 * 60 * 60 * 1000 },
      { label: "3d", ms: 3 * 24 * 60 * 60 * 1000 },
      { label: "1d", ms: 24 * 60 * 60 * 1000 },
      { label: "6h", ms: 6 * 60 * 60 * 1000 },
      { label: "1h", ms: 60 * 60 * 1000 },
      { label: "30m", ms: 30 * 60 * 1000 },
    ];

    let totalSent = 0;

    for (const reminder of reminders) {
      const windowStart = new Date(now.getTime() + reminder.ms - 5 * 60 * 1000);
      const windowEnd = new Date(now.getTime() + reminder.ms + 5 * 60 * 1000);

      const tasks = await prisma.task.findMany({
        where: {
          dueDate: { gte: windowStart, lte: windowEnd },
          status: { notIn: ["done", "completed", "cancelled"] },
        },
        include: { project: { select: { name: true, workspaceId: true } } },
      });

      for (const task of tasks) {
        const workspaceId = task.project?.workspaceId;
        if (!workspaceId) continue;

        for (const assigneeId of task.assigneeIds) {
          const reminderKey = `task-deadline-${task.id}-${assigneeId}-${reminder.label}`;

          const existing = await findExistingReminder(assigneeId, "task_due_soon", reminderKey);
          if (existing) continue;

          await createNotification(
            assigneeId,
            workspaceId,
            "task_due_soon",
            `Task due ${reminder.label === "30m" ? "in 30 minutes" : `in ${reminder.label}`}`,
            `"${task.title}" is due ${reminder.label === "30m" ? "in 30 minutes" : `in ${reminder.label}`}`,
            {
              taskId: task.id,
              projectId: task.projectId || undefined,
              dueDate: task.dueDate?.toISOString(),
              deepLink: `/tasks/${task.id}`,
              reminderKey,
              actions: [{ label: "Open Task", href: `/tasks/${task.id}`, variant: "primary" }],
            }
          );
          totalSent++;
        }
      }
    }

    logger.info("[Notif] Task deadline reminders completed", { sent: totalSent });
    return { sent: totalSent };
  }
);

// ──────────────────────────────────────────────
//  OVERDUE TASK DETECTION (every 15 minutes)
// ──────────────────────────────────────────────

export const overdueTaskDetection = inngest.createFunction(
  { id: "notif-overdue-tasks", triggers: [{ cron: "TZ(UTC) */15 * * * *" }] },
  async ({ step }) => {
    logger.info("[Notif] Overdue task check started");
    const now = new Date();
    let totalSent = 0;

    const overdueTasks = await prisma.task.findMany({
      where: {
        dueDate: { lt: now },
        status: { notIn: ["done", "completed", "cancelled"] },
      },
      include: { project: { select: { name: true, workspaceId: true } } },
    });

    for (const task of overdueTasks) {
      const workspaceId = task.project?.workspaceId;
      if (!workspaceId) continue;

      for (const assigneeId of task.assigneeIds) {
        const todayKey = `task-overdue-${task.id}-${assigneeId}-${now.toISOString().slice(0, 10)}`;
        const existing = await findExistingReminder(assigneeId, "task_overdue", todayKey);
        if (existing) continue;

        await createNotification(
          assigneeId,
          workspaceId,
          "task_overdue",
          `Task overdue: "${task.title}"`,
          `"${task.title}" was due ${task.dueDate ? Math.ceil((now.getTime() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24)) : ""} days ago`,
          {
            taskId: task.id,
            projectId: task.projectId || undefined,
            dueDate: task.dueDate?.toISOString(),
            deepLink: `/tasks/${task.id}`,
            reminderKey: todayKey,
            actions: [{ label: "Open Task", href: `/tasks/${task.id}`, variant: "primary" }],
          }
        );
        totalSent++;
      }
    }

    logger.info("[Notif] Overdue task check completed", { sent: totalSent });
    return { sent: totalSent };
  }
);

// ──────────────────────────────────────────────
//  CALENDAR EVENT REMINDERS (every 15 minutes)
// ──────────────────────────────────────────────

export const calendarEventReminders = inngest.createFunction(
  { id: "notif-calendar-reminders", triggers: [{ cron: "TZ(UTC) */15 * * * *" }] },
  async ({ step }) => {
    logger.info("[Notif] Calendar event reminder check started");
    const now = new Date();
    const reminderWindows = [
      { label: "24h", ms: 24 * 60 * 60 * 1000 },
      { label: "1h", ms: 60 * 60 * 1000 },
      { label: "15m", ms: 15 * 60 * 1000 },
    ];

    let totalSent = 0;

    for (const rw of reminderWindows) {
      const windowStart = new Date(now.getTime() + rw.ms - 2 * 60 * 1000);
      const windowEnd = new Date(now.getTime() + rw.ms + 2 * 60 * 1000);

      const events = await prisma.calendarEvent.findMany({
        where: {
          start: { gte: windowStart, lte: windowEnd },
          type: { not: "task" },
        },
      });

      for (const event of events) {
        const reminderKey = `cal-reminder-${event.id}-${rw.label}`;
        const existing = await findExistingReminder(event.userId, "calendar_event_starting_soon", reminderKey);
        if (existing) continue;

        await createNotification(
          event.userId,
          event.workspaceId,
          "calendar_event_starting_soon",
          `Event starting ${rw.label === "15m" ? "in 15 minutes" : `in ${rw.label}`}`,
          `"${event.title}" starts ${rw.label === "15m" ? "in 15 minutes" : `in ${rw.label}`}`,
          {
            calendarEventId: event.id,
            projectId: event.projectId || undefined,
            deepLink: `/calendar`,
            reminderKey,
            actions: [{ label: "View Event", href: "/calendar", variant: "primary" }],
          }
        );
        totalSent++;
      }
    }

    logger.info("[Notif] Calendar event reminders completed", { sent: totalSent });
    return { sent: totalSent };
  }
);

// ──────────────────────────────────────────────
//  MISSED CALENDAR EVENTS (every 15 minutes)
// ──────────────────────────────────────────────

export const missedCalendarEvents = inngest.createFunction(
  { id: "notif-missed-events", triggers: [{ cron: "TZ(UTC) */15 * * * *" }] },
  async ({ step }) => {
    logger.info("[Notif] Missed calendar events check started");
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    let totalSent = 0;

    const missedEvents = await prisma.calendarEvent.findMany({
      where: {
        end: { gte: twoHoursAgo, lte: tenMinutesAgo },
        type: { not: "task" },
      },
    });

    for (const event of missedEvents) {
      const todayKey = `cal-missed-${event.id}-${now.toISOString().slice(0, 10)}`;
      const existing = await findExistingReminder(event.userId, "calendar_event_missed", todayKey);
      if (existing) continue;

      await createNotification(
        event.userId,
        event.workspaceId,
        "calendar_event_missed",
        `Missed event: "${event.title}"`,
        `"${event.title}" ended at ${event.end?.toLocaleTimeString()}. You may want to follow up.`,
        {
          calendarEventId: event.id,
          deepLink: "/calendar",
          reminderKey: todayKey,
          actions: [{ label: "View Calendar", href: "/calendar", variant: "primary" }],
        }
      );
      totalSent++;
    }

    logger.info("[Notif] Missed calendar events completed", { sent: totalSent });
    return { sent: totalSent };
  }
);

// ──────────────────────────────────────────────
//  SMART ALERTS (every hour)
// ──────────────────────────────────────────────

export const smartAlerts = inngest.createFunction(
  { id: "notif-smart-alerts", triggers: [{ cron: "TZ(UTC) 0 * * * *" }] },
  async ({ step }) => {
    logger.info("[Notif] Smart alerts check started");
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const alerts: { workspaceId: string; userId: string; title: string; message: string; metadata: any }[] = [];

    // Tasks with no assignee
    const unassignedTasks = await prisma.task.findMany({
      where: {
        assigneeIds: { equals: [] },
        status: { notIn: ["done", "completed", "cancelled"] },
        createdAt: { gte: sevenDaysAgo },
      },
      include: { project: { select: { name: true, workspaceId: true } } },
    });

    const byWorkspace: Record<string, { tasks: typeof unassignedTasks; members: any[] }> = {};

    for (const task of unassignedTasks) {
      const wsId = task.project?.workspaceId;
      if (!wsId) continue;
      if (!byWorkspace[wsId]) byWorkspace[wsId] = { tasks: [], members: [] };
      byWorkspace[wsId].tasks.push(task);
    }

    for (const [wsId, data] of Object.entries(byWorkspace)) {
      const { getWorkspaceMembers } = await import("@/lib/workspace");
      const members = await getWorkspaceMembers(wsId);
      const adminIds = members.filter((m: any) => m.role === "admin").map((m: any) => m.userId);
      for (const adminId of adminIds) {
        alerts.push({
          workspaceId: wsId,
          userId: adminId,
          title: `${data.tasks.length} task(s) have no assignee`,
          message: `${data.tasks.length} tasks are unassigned. Consider assigning them to keep work moving.`,
          metadata: {
            smartAlert: "unassigned_tasks",
            count: data.tasks.length,
            deepLink: "/tasks",
            actions: [{ label: "View Tasks", href: "/tasks" }],
          },
        });
      }
    }

    // Tasks with no due date
    const noDueDate = await prisma.task.findMany({
      where: {
        dueDate: null,
        status: { notIn: ["done", "completed", "cancelled"] },
        createdAt: { gte: sevenDaysAgo },
      },
      include: { project: { select: { workspaceId: true } } },
    });

    const noDueByWs: Record<string, number> = {};
    for (const t of noDueDate) {
      const wsId = t.project?.workspaceId;
      if (!wsId) continue;
      noDueByWs[wsId] = (noDueByWs[wsId] || 0) + 1;
    }

    for (const [wsId, count] of Object.entries(noDueByWs)) {
      const { getWorkspaceMembers } = await import("@/lib/workspace");
      const members = await getWorkspaceMembers(wsId);
      const adminIds = members.filter((m: any) => m.role === "admin").map((m: any) => m.userId);
      for (const adminId of adminIds) {
        alerts.push({
          workspaceId: wsId,
          userId: adminId,
          title: `${count} task(s) missing due dates`,
          message: `${count} tasks have no due date. Setting deadlines helps teams prioritize.`,
          metadata: {
            smartAlert: "no_due_date",
            count,
            deepLink: "/tasks",
            actions: [{ label: "View Tasks", href: "/tasks" }],
          },
        });
      }
    }

    // Stuck tasks (same status for 7+ days)
    const stuckTasks = await prisma.task.findMany({
      where: {
        status: { notIn: ["done", "completed", "cancelled"] },
        updatedAt: { lt: sevenDaysAgo },
      },
      include: { project: { select: { name: true, workspaceId: true } } },
    });

    const stuckByAssignees: Record<string, { workspaceId: string; tasks: typeof stuckTasks }> = {};
    for (const task of stuckTasks) {
      const wsId = task.project?.workspaceId;
      if (!wsId) continue;
      for (const assigneeId of task.assigneeIds) {
        if (!stuckByAssignees[assigneeId]) stuckByAssignees[assigneeId] = { workspaceId: wsId, tasks: [] };
        stuckByAssignees[assigneeId].tasks.push(task);
      }
    }

    for (const [userId, data] of Object.entries(stuckByAssignees)) {
      const todayKey = `smart-stuck-${now.toISOString().slice(0, 10)}-${userId}`;
      alerts.push({
        workspaceId: data.workspaceId,
        userId,
        title: `${data.tasks.length} task(s) haven't moved in 7+ days`,
        message: `${data.tasks.length} tasks have been in the same status for over a week. A gentle nudge may help.`,
        metadata: {
          smartAlert: "stuck_tasks",
          count: data.tasks.length,
          reminderKey: todayKey,
          actions: [{ label: "View Tasks", href: "/tasks" }],
        },
      });
    }

    let totalSent = 0;
    for (const alert of alerts) {
      if (alert.metadata?.reminderKey) {
        const existing = await findExistingReminder(alert.userId, "smart_alert", alert.metadata.reminderKey);
        if (existing) continue;
      }
      await createNotification(
        alert.userId,
        alert.workspaceId,
        "smart_alert",
        alert.title,
        alert.message,
        alert.metadata
      );
      totalSent++;
    }

    logger.info("[Notif] Smart alerts completed", { alertsSent: totalSent });
    return { alertsSent: totalSent };
  }
);

// ──────────────────────────────────────────────
//  DAILY DIGEST (every morning at 7 AM local-ish)
// ──────────────────────────────────────────────

export const dailyDigest = inngest.createFunction(
  { id: "notif-daily-digest", triggers: [{ cron: "TZ(UTC) 6 7 * * *" }] },
  async ({ step }) => {
    logger.info("[Notif] Daily digest started");
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    let totalSent = 0;

    const workspaces = await prisma.workspace.findMany({
      where: { plan: { not: undefined } },
      select: { id: true, name: true },
    });

    for (const ws of workspaces) {
      const { getWorkspaceMembers } = await import("@/lib/workspace");
      const members = await getWorkspaceMembers(ws.id);

      for (const member of members) {
        const todayKey = `digest-daily-${member.userId}-${now.toISOString().slice(0, 10)}`;
        const existing = await findExistingReminder(member.userId, "daily_summary", todayKey);
        if (existing) continue;

        const [tasksDueToday, overdueTasks, todaysEvents, blockedTasks, unreadNotifs, pendingMentions] =
          await Promise.all([
            prisma.task.count({
              where: { dueDate: { gte: todayStart, lte: todayEnd }, assigneeIds: { has: member.userId }, status: { notIn: ["done", "completed", "cancelled"] } },
            }),
            prisma.task.count({
              where: { dueDate: { lt: now }, assigneeIds: { has: member.userId }, status: { notIn: ["done", "completed", "cancelled"] } },
            }),
            prisma.calendarEvent.count({
              where: { start: { gte: todayStart, lte: todayEnd }, userId: member.userId },
            }),
            prisma.task.count({
              where: {
                status: "blocked",
                assigneeIds: { has: member.userId },
              },
            }),
            prisma.notification.count({
              where: { userId: member.userId, workspaceId: ws.id, read: false, archived: false, type: { notIn: ["daily_summary", "weekly_summary"] } },
            }),
            prisma.notification.count({
              where: { userId: member.userId, workspaceId: ws.id, read: false, type: { in: ["mention", "task_mentioned"] } },
            }),
          ]);

        if (tasksDueToday === 0 && overdueTasks === 0 && todaysEvents === 0 && blockedTasks === 0) continue;

        const parts: string[] = [];
        if (tasksDueToday > 0) parts.push(`${tasksDueToday} task(s) due today`);
        if (overdueTasks > 0) parts.push(`${overdueTasks} overdue`);
        if (todaysEvents > 0) parts.push(`${todaysEvents} meeting(s)`);
        if (blockedTasks > 0) parts.push(`${blockedTasks} blocked`);
        if (pendingMentions > 0) parts.push(`${pendingMentions} mention(s)`);

        await createNotification(
          member.userId,
          ws.id,
          "daily_summary",
          `Good morning — ${parts.join(", ")}`,
          `You have ${parts.join(", ")} needing attention today.`,
          {
            reminderKey: todayKey,
            deepLink: "/notifications",
            actions: [{ label: "View Notifications", href: "/notifications" }],
          }
        );
        totalSent++;
      }
    }

    logger.info("[Notif] Daily digest completed", { sent: totalSent });
    return { sent: totalSent };
  }
);

// ──────────────────────────────────────────────
//  WEEKLY DIGEST (every Monday at 8 AM UTC)
// ──────────────────────────────────────────────

export const weeklyDigest = inngest.createFunction(
  { id: "notif-weekly-digest", triggers: [{ cron: "TZ(UTC) 0 8 * * 1" }] },
  async ({ step }) => {
    logger.info("[Notif] Weekly digest started");
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1);
    const weekKey = `digest-weekly-${weekStart.toISOString().slice(0, 10)}`;
    let totalSent = 0;

    const workspaces = await prisma.workspace.findMany({
      select: { id: true, name: true },
    });

    for (const ws of workspaces) {
      const { getWorkspaceMembers } = await import("@/lib/workspace");
      const members = await getWorkspaceMembers(ws.id);

      for (const member of members) {
        const existing = await findExistingReminder(member.userId, "weekly_summary", `${weekKey}-${member.userId}`);
        if (existing) continue;

        const [completedTasks, overdueTasks, projectsBehind, projectsAhead, upcomingDeadlines] =
          await Promise.all([
            prisma.task.count({
              where: { completedAt: { gte: weekAgo }, assigneeIds: { has: member.userId } },
            }),
            prisma.task.count({
              where: { dueDate: { lt: now }, status: { notIn: ["done", "completed", "cancelled"] }, assigneeIds: { has: member.userId } },
            }),
            prisma.project.count({
              where: { workspaceId: ws.id, updatedAt: { lt: weekAgo } },
            }),
            prisma.project.count({
              where: { workspaceId: ws.id, updatedAt: { gte: weekAgo } },
            }),
            prisma.task.count({
              where: { dueDate: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) }, status: { notIn: ["done", "completed", "cancelled"] } },
            }),
          ]);

        const parts: string[] = [];
        if (completedTasks > 0) parts.push(`${completedTasks} completed`);
        if (overdueTasks > 0) parts.push(`${overdueTasks} overdue`);
        if (upcomingDeadlines > 0) parts.push(`${upcomingDeadlines} deadlines this week`);

        if (parts.length === 0 && projectsBehind === 0) continue;

        let message = `This week: ${parts.join(", ")}.`;
        if (projectsBehind > 0) message += ` ${projectsBehind} project(s) behind schedule.`;

        await createNotification(
          member.userId,
          ws.id,
          "weekly_summary",
          `Your weekly recap — ${parts.join(", ") || "all clear"}`,
          message,
          {
            reminderKey: `${weekKey}-${member.userId}`,
            deepLink: "/notifications",
            actions: [{ label: "View Dashboard", href: "/dashboard" }],
          }
        );
        totalSent++;
      }
    }

    logger.info("[Notif] Weekly digest completed", { sent: totalSent });
    return { sent: totalSent };
  }
);

// ──────────────────────────────────────────────
//  NOVA SUGGESTIONS (every 6 hours)
// ──────────────────────────────────────────────

export const novaSuggestions = inngest.createFunction(
  { id: "notif-nova-suggestions", triggers: [{ cron: "TZ(UTC) 0 */6 * * *" }] },
  async ({ step }) => {
    logger.info("[Notif] Nova suggestions started");
    const now = new Date();
    let totalSent = 0;

    const workspaces = await prisma.workspace.findMany({
      select: { id: true },
    });

    for (const ws of workspaces) {
      const { getWorkspaceMembers } = await import("@/lib/workspace");
      const members = await getWorkspaceMembers(ws.id);

      for (const member of members) {
        const suggestionKey = `nova-suggestion-${member.userId}-${now.toISOString().slice(0, 10)}-${Math.floor(now.getHours() / 6)}`;
        const existing = await findExistingReminder(member.userId, "nova_suggestion", suggestionKey);
        if (existing) continue;

        const [overdueCount, blockedCount, unassignedCount, projectIdleCount] = await Promise.all([
          prisma.task.count({
            where: { dueDate: { lt: now }, status: { notIn: ["done", "completed", "cancelled"] }, assigneeIds: { has: member.userId } },
          }),
          prisma.task.count({
            where: { status: "blocked", assigneeIds: { has: member.userId } },
          }),
          prisma.task.count({
            where: { assigneeIds: { equals: [] }, status: { notIn: ["done", "completed", "cancelled"] }, project: { workspaceId: ws.id } },
          }),
          prisma.project.count({
            where: { workspaceId: ws.id, updatedAt: { lt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000) } },
          }),
        ]);

        const suggestions: string[] = [];
        if (overdueCount >= 3) suggestions.push(`You have ${overdueCount} overdue tasks.`);
        if (blockedCount > 0) suggestions.push(`${blockedCount} task(s) are blocked.`);
        if (unassignedCount > 0) suggestions.push(`${unassignedCount} task(s) have no owner.`);
        if (projectIdleCount > 0) suggestions.push(`${projectIdleCount} project(s) haven't moved in 4+ days.`);

        if (suggestions.length === 0) continue;

        await createNotification(
          member.userId,
          ws.id,
          "nova_suggestion",
          "Nova suggests",
          suggestions.join(" "),
          {
            reminderKey: suggestionKey,
            deepLink: "/dashboard",
            actions: [{ label: "View Dashboard", href: "/dashboard", variant: "primary" }],
          }
        );
        totalSent++;
      }
    }

    logger.info("[Notif] Nova suggestions completed", { sent: totalSent });
    return { sent: totalSent };
  }
);

// ──────────────────────────────────────────────
//  INSIGHT DIGEST EMAIL (weekly)
//  Sends a summary of all Nova agent insights to workspace admins
// ──────────────────────────────────────────────

export const insightDigestEmail = inngest.createFunction(
  { id: "notif-insight-digest-email", triggers: [{ cron: "TZ(UTC) 8 * * 1" }] }, // Monday 8am UTC
  async ({ step }) => {
    logger.info("[Notif] Insight digest email started");

    const workspaces = await prisma.workspace.findMany({
      where: { subscriptionStatus: { notIn: ["canceled", "deactivated"] } },
      include: {
        members: { where: { role: { in: ["owner", "admin"] } }, include: { user: true } },
      },
    });

    let emailsSent = 0;

    for (const ws of workspaces) {
      try {
        // Gather last 7 days of insights
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const insights = await prisma.proactiveInsight.findMany({
          where: { workspaceId: ws.id, createdAt: { gte: weekAgo } },
          orderBy: { createdAt: "desc" },
          take: 50,
        });

        if (insights.length === 0) continue;

        const critical = insights.filter((i) => i.severity === "critical");
        const high = insights.filter((i) => i.severity === "high");
        const medium = insights.filter((i) => i.severity === "medium");
        const low = insights.filter((i) => i.severity === "low");

        const rows = insights
          .slice(0, 20)
          .map((i) => {
            const severityColor = i.severity === "critical" ? "#dc2626" : i.severity === "high" ? "#ea580c" : i.severity === "medium" ? "#ca8a04" : "#16a34a";
            return `<tr>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">
                <span style="color:${severityColor};font-weight:600">${i.severity.toUpperCase()}</span>
              </td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">
                <strong>${i.title}</strong><br/>
                <span style="color:#6b7280;font-size:13px">${i.message}</span>
              </td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280">
                ${i.suggestedAction || "—"}
              </td>
            </tr>`;
          })
          .join("");

        const html = `
          <div style="font-family:sans-serif;max-width:640px;margin:0 auto">
            <h2 style="color:#1e40af">Nova Weekly Insight Digest</h2>
            <p>Here's what Nova found in <strong>${ws.name}</strong> this week:</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <tr style="background:#f8fafc">
                <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb">Level</th>
                <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb">Insight</th>
                <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb">Suggested Action</th>
              </tr>
              ${rows}
            </table>
            <p style="font-size:14px;color:#374151">
              <strong>${critical.length}</strong> critical · 
              <strong>${high.length}</strong> high · 
              <strong>${medium.length}</strong> medium · 
              <strong>${low.length}</strong> low
            </p>
            <p><a href="https://app.theta.so/dashboard" style="color:#1e40af">View Full Dashboard →</a></p>
          </div>`;

        for (const member of ws.members) {
          if (!member.user.email) continue;
          await sendEmail({ to: member.user.email, subject: `[Theta] Weekly Nova Insight Digest — ${ws.name}`, html });
          emailsSent++;
        }
      } catch (error: any) {
        logger.warn(`[Notif] Insight digest failed for workspace ${ws.id}: ${error.message}`);
      }
    }

    logger.info("[Notif] Insight digest emails completed", { sent: emailsSent });
    return { sent: emailsSent };
  }
);
