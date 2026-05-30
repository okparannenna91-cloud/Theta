// ─── Event Names ─────────────────────────────────────────
export const AnalyticsEvents = {
  // Auth
  SIGNED_UP: "signed_up",
  SIGNED_IN: "signed_in",
  SIGNED_OUT: "signed_out",

  // Workspace
  WORKSPACE_CREATED: "workspace_created",
  WORKSPACE_UPDATED: "workspace_updated",
  WORKSPACE_DELETED: "workspace_deleted",
  WORKSPACE_MEMBER_INVITED: "workspace_member_invited",
  WORKSPACE_MEMBER_JOINED: "workspace_member_joined",
  WORKSPACE_MEMBER_REMOVED: "workspace_member_removed",

  // Project
  PROJECT_CREATED: "project_created",
  PROJECT_UPDATED: "project_updated",
  PROJECT_DELETED: "project_deleted",
  PROJECT_VIEWED: "project_viewed",

  // Task
  TASK_CREATED: "task_created",
  TASK_UPDATED: "task_updated",
  TASK_COMPLETED: "task_completed",
  TASK_DELETED: "task_deleted",
  TASK_VIEWED: "task_viewed",
  TASK_REOPENED: "task_reopened",

  // Board
  BOARD_CREATED: "board_created",
  BOARD_UPDATED: "board_updated",
  BOARD_VIEWED: "board_viewed",

  // Team
  TEAM_CREATED: "team_created",
  TEAM_UPDATED: "team_updated",

  // AI
  AI_USED: "ai_used",
  AI_CONVERSATION_STARTED: "ai_conversation_started",
  AI_MODEL_CHANGED: "ai_model_changed",

  // Automation
  AUTOMATION_CREATED: "automation_created",
  AUTOMATION_TRIGGERED: "automation_triggered",
  AUTOMATION_DELETED: "automation_deleted",

  // Integration
  INTEGRATION_CONNECTED: "integration_connected",
  INTEGRATION_DISCONNECTED: "integration_disconnected",

  // Dashboard
  DASHBOARD_OPENED: "dashboard_opened",
  DASHBOARD_WIDGET_CUSTOMIZED: "dashboard_widget_customized",

  // Billing
  BILLING_SUBSCRIBED: "billing_subscribed",
  BILLING_PLAN_CHANGED: "billing_plan_changed",
  BILLING_CANCELLED: "billing_cancelled",

  // Calendar / Timeline / Gantt
  CALENDAR_VIEWED: "calendar_viewed",
  TIMELINE_VIEWED: "timeline_viewed",
  GANTT_VIEWED: "gantt_viewed",

  // Portfolio
  PORTFOLIO_VIEWED: "portfolio_viewed",

  // Settings
  SETTINGS_VIEWED: "settings_viewed",
  PROFILE_UPDATED: "profile_updated",

  // Comments
  COMMENT_CREATED: "comment_created",
  COMMENT_DELETED: "comment_deleted",

  // Notifications
  NOTIFICATIONS_OPENED: "notifications_opened",
  NOTIFICATION_CLICKED: "notification_clicked",

  // Search
  SEARCH_PERFORMED: "search_performed",

  // File
  FILE_UPLOADED: "file_uploaded",
  FILE_DELETED: "file_deleted",

  // Onboarding
  ONBOARDING_STARTED: "onboarding_started",
  ONBOARDING_COMPLETED: "onboarding_completed",

  // Error
  ERROR_OCCURRED: "error_occurred",
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

// ─── Event Properties Schemas ────────────────────────────
export function createEventProperties(
  overrides?: Record<string, unknown>
): Record<string, unknown> {
  return {
    timestamp: new Date().toISOString(),
    url: typeof window !== "undefined" ? window.location.href : undefined,
    ...overrides,
  };
}

export function createWorkspaceEventProperties(
  workspaceId: string,
  overrides?: Record<string, unknown>
): Record<string, unknown> {
  return createEventProperties({
    workspace_id: workspaceId,
    ...overrides,
  });
}

export function createProjectEventProperties(
  workspaceId: string,
  projectId: string,
  overrides?: Record<string, unknown>
): Record<string, unknown> {
  return createEventProperties({
    workspace_id: workspaceId,
    project_id: projectId,
    ...overrides,
  });
}

export function createTaskEventProperties(
  workspaceId: string,
  projectId: string | undefined,
  taskId: string,
  overrides?: Record<string, unknown>
): Record<string, unknown> {
  return createEventProperties({
    workspace_id: workspaceId,
    project_id: projectId || null,
    task_id: taskId,
    ...overrides,
  });
}

export function createAIEventProperties(
  workspaceId: string,
  source: string,
  model: string,
  overrides?: Record<string, unknown>
): Record<string, unknown> {
  return createEventProperties({
    workspace_id: workspaceId,
    ai_source: source,
    ai_model: model,
    ...overrides,
  });
}
