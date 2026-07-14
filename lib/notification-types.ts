export type NotificationType =
  | "task_assigned"
  | "task_unassigned"
  | "task_mentioned"
  | "comment_reply"
  | "task_completed"
  | "task_reopened"
  | "task_due_soon"
  | "task_overdue"
  | "project_deadline_approaching"
  | "sprint_ending"
  | "workspace_invite"
  | "member_joined"
  | "member_removed"
  | "task_status_changed"
  | "priority_changed"
  | "dependency_blocked"
  | "dependency_unblocked"
  | "recurring_task_created"
  | "calendar_event_created"
  | "calendar_event_updated"
  | "calendar_event_starting_soon"
  | "calendar_event_missed"
  | "daily_summary"
  | "weekly_summary"
  | "nova_suggestion"
  | "smart_alert"
  | "task_updated"
  | "project_created"
  | "project_updated"
  | "team_invite"
  | "team_joined"
  | "limit_warning"
  | "payment_success"
  | "payment_failed"
  | "mention"
  | "comment"
  | "deadline"
  | "reminder";

export type NotificationPriority = "critical" | "medium" | "low";

export const PRIORITY_ORDER: NotificationPriority[] = ["critical", "medium", "low"];

export const NOTIFICATION_PRIORITY: Record<string, NotificationPriority> = {
  task_overdue: "critical",
  dependency_blocked: "critical",
  calendar_event_missed: "critical",
  task_mentioned: "critical",
  task_assigned: "medium",
  task_due_soon: "medium",
  project_deadline_approaching: "medium",
  sprint_ending: "medium",
  calendar_event_starting_soon: "medium",
  calendar_event_created: "medium",
  calendar_event_updated: "medium",
  dependency_unblocked: "medium",
  comment_reply: "medium",
  task_reopened: "medium",
  task_status_changed: "medium",
  priority_changed: "medium",
  smart_alert: "medium",
  daily_summary: "low",
  weekly_summary: "low",
  nova_suggestion: "low",
  task_completed: "low",
  task_unassigned: "low",
  member_joined: "low",
  member_removed: "low",
  recurring_task_created: "low",
  workspace_invite: "medium",
  team_invite: "medium",
  team_joined: "medium",
  limit_warning: "medium",
  payment_failed: "critical",
  payment_success: "medium",
};

export interface NotificationAction {
  label: string;
  href?: string;
  action?: string;
  variant?: "default" | "primary" | "secondary" | "ghost";
}

export interface NotificationMetadata {
  taskId?: string;
  projectId?: string;
  commentId?: string;
  calendarEventId?: string;
  workspaceId?: string;
  teamId?: string;
  inviteId?: string;
  actorId?: string;
  actorName?: string;
  actorAvatar?: string;
  priority?: string;
  dueDate?: string;
  status?: string;
  oldStatus?: string;
  newStatus?: string;
  oldPriority?: string;
  newPriority?: string;
  link?: string;
  deepLink?: string;
  actions?: NotificationAction[];
  [key: string]: any;
}

export const NOTIFICATION_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "mentions", label: "Mentions" },
  { id: "tasks", label: "Tasks" },
  { id: "calendar", label: "Calendar" },
  { id: "alerts", label: "Alerts" },
  { id: "digest", label: "Digests" },
  { id: "archived", label: "Archived" },
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number]["id"];

export function getNotificationCategory(type: NotificationType): NotificationCategory {
  if (["task_assigned", "task_unassigned", "task_mentioned", "task_completed", "task_reopened", "task_due_soon", "task_overdue", "task_status_changed", "priority_changed", "dependency_blocked", "dependency_unblocked", "recurring_task_created", "comment_reply"].includes(type)) return "tasks";
  if (["calendar_event_created", "calendar_event_updated", "calendar_event_starting_soon", "calendar_event_missed"].includes(type)) return "calendar";
  if (["daily_summary", "weekly_summary"].includes(type)) return "digest";
  if (["smart_alert", "nova_suggestion", "limit_warning"].includes(type)) return "alerts";
  if (["mention", "task_mentioned"].includes(type)) return "mentions";
  return "all";
}

export function getNotificationPriority(type: NotificationType): NotificationPriority {
  return NOTIFICATION_PRIORITY[type] || "medium";
}
