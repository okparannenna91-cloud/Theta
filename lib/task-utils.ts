import { prisma } from "@/lib/prisma";
import { publishToChannel, getWorkspaceChannel } from "@/lib/ably";

export async function recalculateTaskProgress(taskId: string) {
  const [subtasks, completedCount] = await Promise.all([
    prisma.subtask.count({ where: { taskId } }),
    prisma.subtask.count({ where: { taskId, completed: true } }),
  ]);
  const progress = subtasks > 0 ? Math.round((completedCount / subtasks) * 100) : 0;
  await prisma.task.update({
    where: { id: taskId },
    data: { progress },
  });
}

export async function updateParentTask(parentId: string, workspaceId: string) {
  const children = await prisma.task.findMany({
    where: { parentId },
    select: { progress: true, startDate: true, dueDate: true }
  });

  if (children.length === 0) return;

  const avgProgress = Math.round(
    children.reduce((acc: number, child: any) => acc + (child.progress || 0), 0) / children.length
  );

  let minStart = children[0].startDate;
  let maxEnd = children[0].dueDate;

  for (const child of children) {
    if (child.startDate && (!minStart || child.startDate < minStart)) minStart = child.startDate;
    if (child.dueDate && (!maxEnd || child.dueDate > maxEnd)) maxEnd = child.dueDate;
  }

  const updatedParent = await prisma.task.update({
    where: { id: parentId },
    data: {
      progress: avgProgress,
      startDate: minStart,
      dueDate: maxEnd,
      isSummary: true
    }
  });

  const workspaceChannel = getWorkspaceChannel(workspaceId);
  await publishToChannel(workspaceChannel, "task:updated", updatedParent);

  if (updatedParent.parentId) {
    await updateParentTask(updatedParent.parentId, workspaceId);
  }
}
