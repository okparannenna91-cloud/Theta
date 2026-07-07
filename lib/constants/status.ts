// Canonical status values — "done" is the single terminal value, "completed" removed
export const STATUS_TODO = "todo";
export const STATUS_IN_PROGRESS = "in_progress";
export const STATUS_DONE = "done";
export const STATUS_BACKLOG = "backlog";
export const STATUS_BLOCKED = "blocked";

export const STATUS_VALUES = [
  STATUS_TODO,
  STATUS_IN_PROGRESS,
  STATUS_DONE,
  STATUS_BACKLOG,
  STATUS_BLOCKED,
] as const;

export const ACTIVE_STATUSES = [STATUS_TODO, STATUS_IN_PROGRESS] as const;
export const COMPLETED_STATUSES = [STATUS_DONE] as const;

export const PRIORITY_LOW = "low";
export const PRIORITY_MEDIUM = "medium";
export const PRIORITY_HIGH = "high";
export const PRIORITY_URGENT = "urgent";

export const PRIORITY_VALUES = [
  PRIORITY_LOW,
  PRIORITY_MEDIUM,
  PRIORITY_HIGH,
  PRIORITY_URGENT,
] as const;
