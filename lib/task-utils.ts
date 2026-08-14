import { prisma } from "@/lib/prisma";
import { publishToChannel, getWorkspaceChannel, getTaskChannel } from "@/lib/ably";
import {
  isDoneStatus,
  isTodoStatus,
  isInProgressStatus,
  isBlockedStatus,
  StatusCategory,
} from "@/lib/constants/status";

const COMPLETION_KEYWORDS = ["done", "complete", "finished", "approved"];

function isCompletedStatus(status: string | null | undefined, category?: string | null): boolean {
  // If category is provided, use semantic category check
  if (category) {
    return category.toUpperCase() === StatusCategory.DONE;
  }

  return COMPLETION_KEYWORDS.some((kw) => (status || "").toLowerCase().includes(kw));
}

/**
 * Get the semantic category for a task's status.
 * Looks up the Status model via statusId, falls back to name-based detection.
 */
export async function getTaskStatusCategory(
  task: any,
  prismaClient: any
): Promise<StatusCategory | null> {
  // Try to get category from the Status model via statusId
  if (task.statusId) {
    const status = await prismaClient.status.findUnique({
      where: { id: task.statusId },
      select: { category: true },
    });
    if (status?.category) {
      return status.category as StatusCategory;
    }
  }
  
  // Fall back to name-based detection from the raw status string
  const status = task.status || "";
  if (isTodoStatus(status)) return StatusCategory.TODO;
  if (isInProgressStatus(status)) return StatusCategory.IN_PROGRESS;
  if (isDoneStatus(status)) return StatusCategory.DONE;
  if (isBlockedStatus(status)) return StatusCategory.BLOCKED;
  
  return null;
}

/**
 * Recalculates a parent task from its child tasks (subtasks):
 * - progress = average of children progress (0/100 per completed child → completed ratio)
 * - startDate/dueDate = min/max across children
 * - estimatedHours/timeSpent = sum across children (parent totals aggregate subtask values)
 * - subtaskCount / subtaskCompletedCount = direct children stats for "Subtasks (3/7)" display
 *
 * Publishes `task:updated` to the workspace channel (boards, lists, dashboards) and to the
 * parent's per-task channel (open dialogs), then cascades up the hierarchy.
 */
export async function updateParentTask(parentId: string, workspaceId: string) {
  const parent = await prisma.task.findUnique({
    where: { id: parentId },
    select: { syncParentDates: true },
  });

  const children = await prisma.task.findMany({
    where: { parentId },
    select: {
      progress: true,
      status: true,
      statusId: true,
      startDate: true,
      dueDate: true,
      estimatedHours: true,
      timeSpent: true,
    },
  });

  if (children.length === 0) return;

  const avgProgress = Math.round(
    children.reduce((acc: number, child: any) => acc + (child.progress || 0), 0) / children.length
  );

  // Get the semantic category for each child's status (from Status model, name-based fallback)
  const childStatusIds = Array.from(
    new Set(children.map((c: any) => c.statusId).filter((id): id is string => Boolean(id)))
  );
  const statusCategories = childStatusIds.length > 0
    ? await prisma.status.findMany({
        where: { id: { in: childStatusIds } },
        select: { id: true, category: true },
      })
    : [];
  const categoryById = new Map(statusCategories.map((s) => [s.id, s.category]));

  const completedCount = children.filter(
    (c: any) => isCompletedStatus(c.status, categoryById.get(c.statusId || "") || null)
  ).length;

  const totalEstimated = children.reduce((acc: number, child: any) => acc + (child.estimatedHours || 0), 0);
  const totalLogged = children.reduce((acc: number, child: any) => acc + (child.timeSpent || 0), 0);

  const data: any = {
    progress: avgProgress,
    estimatedHours: totalEstimated,
    timeSpent: totalLogged,
    isSummary: true,
    subtaskCount: children.length,
    subtaskCompletedCount: completedCount,
  };

  // When syncParentDates is enabled (default), the parent's dates roll up from its
  // subtasks (min start / max due). When disabled, parent dates stay independent.
  if (parent?.syncParentDates !== false) {
    let minStart = children[0].startDate;
    let maxEnd = children[0].dueDate;

    for (const child of children) {
      if (child.startDate && (!minStart || child.startDate < minStart)) minStart = child.startDate;
      if (child.dueDate && (!maxEnd || child.dueDate > maxEnd)) maxEnd = child.dueDate;
    }

    data.startDate = minStart;
    data.dueDate = maxEnd;
  }

  const updatedParent = await prisma.task.update({
    where: { id: parentId },
    data,
  });

  // Workspace channel keeps boards, lists and dashboards in sync (non-blocking)
  const workspaceChannel = getWorkspaceChannel(workspaceId);
  void publishToChannel(workspaceChannel, "task:updated", updatedParent);

  // Per-task channel keeps any open parent dialog in sync instantly
  const taskChannel = getTaskChannel(workspaceId, parentId);
  void publishToChannel(taskChannel, "task:updated", updatedParent);

  if (updatedParent.parentId) {
    await updateParentTask(updatedParent.parentId, workspaceId);
  }
}
