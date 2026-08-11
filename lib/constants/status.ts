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

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// Terminal states. Tasks' statuses are slugified from kanban column names
// (e.g. "Complete" -> "complete"), so custom columns must be recognized here too.
const DONE_STATUSES = new Set([
  "done",
  "completed",
  "complete",
  "closed",
  "resolved",
  "fixed",
  "finished",
  "shipped",
  "archived",
  "approved",
  "merged",
  "released",
  "verified",
  "delivered",
]);

export function isDoneStatus(status: string | null | undefined): boolean {
  const s = normalize(status);
  if (!s) return false;
  if (DONE_STATUSES.has(s)) return true;
  return s.includes("done") || s.includes("complete");
}

// Initial states. Same slugification caveat as above ("Not Started" -> "not_started").
const TODO_STATUSES = new Set([
  "todo",
  "to_do",
  "backlog",
  "not_started",
  "unstarted",
  "open",
  "planned",
  "ready",
  "queued",
  "queue",
  "new",
]);

export function isTodoStatus(status: string | null | undefined): boolean {
  const s = normalize(status);
  if (!s) return false;
  if (TODO_STATUSES.has(s)) return true;
  return s.includes("todo") || s.includes("backlog") || s.includes("not_started") || s.includes("queued");
}

// Column-name variants of the above for kanban board logic
export function isDoneColumnName(name: string | null | undefined): boolean {
  return isDoneStatus(name);
}

export function isTodoColumnName(name: string | null | undefined): boolean {
  return isTodoStatus(name);
}

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
