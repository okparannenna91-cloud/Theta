// Canonical status categories
export const StatusCategory = {
  TODO: "TODO" as const,
  IN_PROGRESS: "IN_PROGRESS" as const,
  DONE: "DONE" as const,
  BLOCKED: "BLOCKED" as const,
} as const;

export type StatusCategory = typeof StatusCategory[keyof typeof StatusCategory];

export const STATUS_CATEGORY_VALUES = [
  StatusCategory.TODO,
  StatusCategory.IN_PROGRESS,
  StatusCategory.DONE,
  StatusCategory.BLOCKED,
] as const;

export const ACTIVE_CATEGORIES = [StatusCategory.TODO, StatusCategory.IN_PROGRESS] as const;
export const COMPLETED_CATEGORIES = [StatusCategory.DONE] as const;

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
// These are the traditional "done" status names that count as completed.
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

// Column-name variants of the above for kanban board logic
export function isDoneColumnName(name: string | null | undefined): boolean {
  return isDoneStatus(name);
}

export function isTodoColumnName(name: string | null | undefined): boolean {
  return isTodoStatus(name);
}

/**
 * Check if a status represents a "done" category.
 * Accepts an optional semantic category (e.g. from the Status model's category field).
 * When category is provided it wins; otherwise falls back to name-based detection.
 */
export function isDoneStatus(status: string | null | undefined, category?: string | null): boolean {
  // If category is provided, use semantic category check
  if (category) {
    return category.toUpperCase() === StatusCategory.DONE;
  }

  const s = normalize(status);
  if (!s) return false;
  if (DONE_STATUSES.has(s)) return true;
  return s.includes("done") || s.includes("complete");
}

/**
 * Check if a status represents a "todo" category.
 * Accepts an optional semantic category (e.g. from the Status model's category field).
 * When category is provided it wins; otherwise falls back to name-based detection.
 */
export function isTodoStatus(status: string | null | undefined, category?: string | null): boolean {
  // If category is provided, use semantic category check
  if (category) {
    return category.toUpperCase() === StatusCategory.TODO;
  }

  const s = normalize(status);
  if (!s) return false;
  if (TODO_STATUSES.has(s)) return true;
  return s.includes("todo") || s.includes("backlog") || s.includes("not_started") || s.includes("queued");
}

/**
 * Check if a status represents "in progress" category.
 * Accepts an optional semantic category (e.g. from the Status model's category field).
 * When category is provided it wins; otherwise falls back to name-based detection.
 */
export function isInProgressStatus(status: string | null | undefined, category?: string | null): boolean {
  // If category is provided, use semantic category check
  if (category) {
    return category.toUpperCase() === StatusCategory.IN_PROGRESS;
  }

  const s = normalize(status);
  if (!s) return false;
  // Check against known in-progress variants
  const inProgressKeywords = ["in_progress", "in-progress", "in progress", "working", "review"];
  return inProgressKeywords.some((kw) => s === kw || s.includes(kw));
}

/**
 * Check if a status represents "blocked" category.
 * Accepts an optional semantic category (e.g. from the Status model's category field).
 * When category is provided it wins; otherwise falls back to name-based detection.
 */
export function isBlockedStatus(status: string | null | undefined, category?: string | null): boolean {
  // If category is provided, use semantic category check
  if (category) {
    return category.toUpperCase() === StatusCategory.BLOCKED;
  }

  const s = normalize(status);
  if (!s) return false;
  return s === "blocked" || s.includes("block");
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
