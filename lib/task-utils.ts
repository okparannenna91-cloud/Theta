import { prisma } from "@/lib/prisma";
import { publishToChannel, getWorkspaceChannel, getTaskChannel } from "@/lib/ably";

const COMPLETION_KEYWORDS = ["done", "complete", "finished", "approved"];

function isCompletedStatus(status: string): boolean {
  return COMPLETION_KEYWORDS.some((kw) => (status || "").toLowerCase().includes(kw));
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
  const children = await prisma.task.findMany({
    where: { parentId },
    select: {
      progress: true,
      status: true,
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

  const completedCount = children.filter((c: any) => isCompletedStatus(c.status)).length;

  let minStart = children[0].startDate;
  let maxEnd = children[0].dueDate;

  for (const child of children) {
    if (child.startDate && (!minStart || child.startDate < minStart)) minStart = child.startDate;
    if (child.dueDate && (!maxEnd || child.dueDate > maxEnd)) maxEnd = child.dueDate;
  }

  const totalEstimated = children.reduce((acc: number, child: any) => acc + (child.estimatedHours || 0), 0);
  const totalLogged = children.reduce((acc: number, child: any) => acc + (child.timeSpent || 0), 0);

  const updatedParent = await prisma.task.update({
    where: { id: parentId },
    data: {
      progress: avgProgress,
      startDate: minStart,
      dueDate: maxEnd,
      estimatedHours: totalEstimated,
      timeSpent: totalLogged,
      isSummary: true,
      subtaskCount: children.length,
      subtaskCompletedCount: completedCount,
    },
  });

  // Workspace channel keeps boards, lists and dashboards in sync
  const workspaceChannel = getWorkspaceChannel(workspaceId);
  await publishToChannel(workspaceChannel, "task:updated", updatedParent);

  // Per-task channel keeps any open parent dialog in sync instantly
  const taskChannel = getTaskChannel(workspaceId, parentId);
  await publishToChannel(taskChannel, "task:updated", updatedParent);

  if (updatedParent.parentId) {
    await updateParentTask(updatedParent.parentId, workspaceId);
  }
}
