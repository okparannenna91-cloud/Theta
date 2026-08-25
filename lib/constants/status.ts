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

/**
 * Infer a status's semantic category from its display name (name-based detection).
 * Used when a status is created without an explicit category (default statuses,
 * imported statuses, board columns, backfill).
 */
export function inferStatusCategory(name: string | null | undefined): StatusCategory | null {
  if (isDoneStatus(name)) return StatusCategory.DONE;
  if (isBlockedStatus(name)) return StatusCategory.BLOCKED;
  if (isInProgressStatus(name)) return StatusCategory.IN_PROGRESS;
  if (isTodoStatus(name)) return StatusCategory.TODO;
  return null;
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

// ── Prisma category-aware query helpers ──────────────────────────────────────

/**
 * Get all Status IDs that belong to a given category.
 * Optionally scoped to a workspace.
 */
export async function getStatusIdsByCategory(
  prismaClient: any,
  category: StatusCategory,
  workspaceId?: string,
): Promise<string[]> {
  const where: any = { category };
  if (workspaceId) where.workspaceId = workspaceId;
  const statuses = await prismaClient.status.findMany({ where, select: { id: true } });
  return statuses.map((s: any) => s.id);
}

/**
 * Build a Prisma where clause for tasks whose statusId belongs to a category.
 * Includes a fallback for tasks with no statusId but matching the name.
 */
export async function taskCategoryWhere(
  prismaClient: any,
  category: StatusCategory,
  workspaceId?: string,
) {
  const ids = await getStatusIdsByCategory(prismaClient, category, workspaceId);
  const nameFallbacks = category === StatusCategory.DONE
    ? ["done", "completed", "complete", "closed", "resolved"]
    : category === StatusCategory.TODO
    ? ["todo", "backlog", "to_do", "not_started", "open", "new"]
    : category === StatusCategory.IN_PROGRESS
    ? ["in_progress", "in-progress"]
    : category === StatusCategory.BLOCKED
    ? ["blocked"]
    : [];

  if (ids.length === 0 && nameFallbacks.length === 0) {
    return { statusId: { in: ["__NONE__"] } };
  }

  return {
    OR: [
      ...(ids.length > 0 ? [{ statusId: { in: ids } }] : []),
      ...(nameFallbacks.length > 0 ? [{ statusId: null, status: { in: nameFallbacks } }] : []),
    ],
  };
}

/**
 * Negated version — tasks NOT in a given category.
 */
export async function taskCategoryWhereNot(
  prismaClient: any,
  category: StatusCategory,
  workspaceId?: string,
) {
  const ids = await getStatusIdsByCategory(prismaClient, category, workspaceId);
  const nameFallbacks = category === StatusCategory.DONE
    ? ["done", "completed", "complete", "closed", "resolved"]
    : category === StatusCategory.TODO
    ? ["todo", "backlog", "to_do", "not_started", "open", "new"]
    : category === StatusCategory.IN_PROGRESS
    ? ["in_progress", "in-progress"]
    : category === StatusCategory.BLOCKED
    ? ["blocked"]
    : [];

  const conditions: any[] = [];
  if (ids.length > 0) conditions.push({ statusId: { notIn: ids } });
  if (nameFallbacks.length > 0) conditions.push({ statusId: null, status: { notIn: nameFallbacks } });

  if (conditions.length === 0) return {};
  if (conditions.length === 1) return conditions[0];
  return { AND: conditions };
}

/**
 * Build a Prisma where clause for tasks matching ANY of multiple categories.
 */
export async function taskCategoriesWhere(
  prismaClient: any,
  categories: StatusCategory[],
  workspaceId?: string,
) {
  const allIds: string[] = [];
  for (const cat of categories) {
    const ids = await getStatusIdsByCategory(prismaClient, cat, workspaceId);
    allIds.push(...ids);
  }
  const uniqueIds = Array.from(new Set(allIds));
  if (uniqueIds.length === 0) return { statusId: { in: ["__NONE__"] } };
  return { statusId: { in: uniqueIds } };
}
