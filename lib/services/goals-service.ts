import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface CreateGoalInput {
  title: string;
  description?: string;
  type?: "okr" | "milestone" | "target";
  ownerId: string;
  projectId?: string;
  workspaceId: string;
  startDate: Date;
  endDate: Date;
}

export interface CreateKeyResultInput {
  title: string;
  goalId: string;
  targetValue: number;
  unit?: string;
  taskIds?: string[];
}

export interface GoalWithKeyResults {
  id: string;
  title: string;
  description: string | null;
  type: string;
  ownerId: string;
  ownerName: string | null;
  projectId: string | null;
  projectName: string | null;
  startDate: Date;
  endDate: Date;
  status: string;
  progress: number;
  keyResults: KeyResultWithProgress[];
  daysRemaining: number;
}

export interface KeyResultWithProgress {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string | null;
  progress: number;
  taskCount: number;
  completedTaskCount: number;
}

interface GoalFilters {
  status?: string;
  projectId?: string;
}

function computeDaysRemaining(endDate: Date): number {
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();
  return Math.ceil(diff / 86400000);
}

function buildKeyResultWithProgress(
  kr: { id: string; title: string; targetValue: number; currentValue: number; unit: string | null; taskIds: string[] },
  taskCounts: Map<string, { total: number; completed: number }>,
): KeyResultWithProgress {
  const counts = taskCounts.get(kr.id) ?? { total: 0, completed: 0 };
  const progress =
    kr.targetValue > 0
      ? Math.min(100, Math.round((kr.currentValue / kr.targetValue) * 100))
      : 0;

  return {
    id: kr.id,
    title: kr.title,
    targetValue: kr.targetValue,
    currentValue: kr.currentValue,
    unit: kr.unit,
    progress,
    taskCount: counts.total,
    completedTaskCount: counts.completed,
  };
}

async function getTaskCountsForKRs(
  keyResults: { id: string; taskIds: string[] }[],
): Promise<Map<string, { total: number; completed: number }>> {
  const allTaskIds = [...new Set(keyResults.flatMap((kr) => kr.taskIds.filter(Boolean)))];
  const taskMap = new Map<string, { total: number; completed: number }>();

  if (allTaskIds.length === 0) return taskMap;

  const tasks = await prisma.task.findMany({
    where: { id: { in: allTaskIds } },
    select: { id: true, status: true, completedAt: true },
  });

  const taskIdToStatus = new Map(
    tasks.map((t) => [t.id, { completed: t.completedAt !== null || t.status === "done" || t.status === "completed" }]),
  );

  for (const kr of keyResults) {
    let total = 0;
    let completed = 0;
    for (const tid of kr.taskIds) {
      if (!tid) continue;
      total++;
      const s = taskIdToStatus.get(tid);
      if (s?.completed) completed++;
    }
    taskMap.set(kr.id, { total, completed });
  }

  return taskMap;
}

async function recalculateAndStoreProgress(goalId: string): Promise<number> {
  const keyResults = await prisma.keyResult.findMany({
    where: { goalId },
    select: { id: true, targetValue: true, currentValue: true, taskIds: true },
  });

  if (keyResults.length === 0) {
    await prisma.goal.update({ where: { id: goalId }, data: { progress: 0 } });
    return 0;
  }

  const taskCounts = await getTaskCountsForKRs(keyResults);

  let totalProgress = 0;
  for (const kr of keyResults) {
    const counts = taskCounts.get(kr.id);
    const taskBonus = counts && counts.total > 0 ? (counts.completed / counts.total) * 100 : 0;
    const valueProgress = kr.targetValue > 0 ? (kr.currentValue / kr.targetValue) * 100 : 0;
    totalProgress += Math.min(100, Math.max(valueProgress, taskBonus));
  }

  const avgProgress = Math.round(totalProgress / keyResults.length);

  await prisma.goal.update({ where: { id: goalId }, data: { progress: avgProgress } });
  return avgProgress;
}

async function mapGoalWithKeyResults(
  goal: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    ownerId: string;
    projectId: string | null;
    startDate: Date;
    endDate: Date;
    status: string;
    progress: number;
    owner: { name: string | null };
    project: { name: string } | null;
    keyResults: { id: string; title: string; targetValue: number; currentValue: number; unit: string | null; taskIds: string[] }[];
  },
): Promise<GoalWithKeyResults> {
  const taskCounts = await getTaskCountsForKRs(goal.keyResults);

  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    type: goal.type,
    ownerId: goal.ownerId,
    ownerName: goal.owner.name,
    projectId: goal.projectId,
    projectName: goal.project?.name ?? null,
    startDate: goal.startDate,
    endDate: goal.endDate,
    status: goal.status,
    progress: goal.progress,
    keyResults: goal.keyResults.map((kr) => buildKeyResultWithProgress(kr, taskCounts)),
    daysRemaining: computeDaysRemaining(goal.endDate),
  };
}

export async function createGoal(input: CreateGoalInput): Promise<GoalWithKeyResults> {
  const goal = await prisma.goal.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      type: input.type ?? "okr",
      ownerId: input.ownerId,
      projectId: input.projectId ?? null,
      workspaceId: input.workspaceId,
      startDate: input.startDate,
      endDate: input.endDate,
    },
    include: {
      owner: { select: { name: true } },
      project: { select: { name: true } },
      keyResults: true,
    },
  });

  logger.info(`Goal created: ${goal.id} in workspace ${input.workspaceId}`);

  return mapGoalWithKeyResults(goal);
}

export async function getGoal(goalId: string): Promise<GoalWithKeyResults | null> {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: {
      owner: { select: { name: true } },
      project: { select: { name: true } },
      keyResults: true,
    },
  });

  if (!goal) return null;

  return mapGoalWithKeyResults(goal);
}

export async function getGoalsForWorkspace(
  workspaceId: string,
  filters?: GoalFilters,
): Promise<GoalWithKeyResults[]> {
  const where: any = { workspaceId };

  if (filters?.status) {
    where.status = filters.status;
  }
  if (filters?.projectId) {
    where.projectId = filters.projectId;
  }

  const goals = await prisma.goal.findMany({
    where,
    include: {
      owner: { select: { name: true } },
      project: { select: { name: true } },
      keyResults: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(goals.map(mapGoalWithKeyResults));
}

export async function getGoalsForProject(projectId: string): Promise<GoalWithKeyResults[]> {
  const goals = await prisma.goal.findMany({
    where: { projectId },
    include: {
      owner: { select: { name: true } },
      project: { select: { name: true } },
      keyResults: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(goals.map(mapGoalWithKeyResults));
}

export async function updateGoal(
  goalId: string,
  updates: Partial<Pick<CreateGoalInput, "title" | "description" | "type" | "startDate" | "endDate" | "projectId">>,
): Promise<GoalWithKeyResults> {
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) throw new Error("Goal not found");

  const updated = await prisma.goal.update({
    where: { id: goalId },
    data: {
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.type !== undefined && { type: updates.type }),
      ...(updates.startDate !== undefined && { startDate: updates.startDate }),
      ...(updates.endDate !== undefined && { endDate: updates.endDate }),
      ...(updates.projectId !== undefined && { projectId: updates.projectId }),
    },
    include: {
      owner: { select: { name: true } },
      project: { select: { name: true } },
      keyResults: true,
    },
  });

  logger.info(`Goal updated: ${goalId}`);

  return mapGoalWithKeyResults(updated);
}

export async function completeGoal(goalId: string): Promise<GoalWithKeyResults> {
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) throw new Error("Goal not found");
  if (goal.status === "completed") throw new Error("Goal is already completed");
  if (goal.status === "cancelled") throw new Error("Cannot complete a cancelled goal");

  const updated = await prisma.goal.update({
    where: { id: goalId },
    data: { status: "completed", progress: 100 },
    include: {
      owner: { select: { name: true } },
      project: { select: { name: true } },
      keyResults: true,
    },
  });

  logger.info(`Goal completed: ${goalId}`);

  return mapGoalWithKeyResults(updated);
}

export async function cancelGoal(goalId: string): Promise<GoalWithKeyResults> {
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) throw new Error("Goal not found");
  if (goal.status === "cancelled") throw new Error("Goal is already cancelled");

  const updated = await prisma.goal.update({
    where: { id: goalId },
    data: { status: "cancelled" },
    include: {
      owner: { select: { name: true } },
      project: { select: { name: true } },
      keyResults: true,
    },
  });

  logger.info(`Goal cancelled: ${goalId}`);

  return mapGoalWithKeyResults(updated);
}

export async function createKeyResult(input: CreateKeyResultInput): Promise<KeyResultWithProgress> {
  const goal = await prisma.goal.findUnique({ where: { id: input.goalId } });
  if (!goal) throw new Error("Goal not found");

  if (input.taskIds && input.taskIds.length > 0) {
    const taskCount = await prisma.task.count({
      where: { id: { in: input.taskIds } },
    });
    if (taskCount !== input.taskIds.length) {
      throw new Error("One or more tasks not found");
    }
  }

  const keyResult = await prisma.keyResult.create({
    data: {
      title: input.title,
      goalId: input.goalId,
      targetValue: input.targetValue,
      unit: input.unit ?? null,
      taskIds: input.taskIds ?? [],
    },
  });

  await recalculateAndStoreProgress(input.goalId);

  logger.info(`Key result created: ${keyResult.id} for goal ${input.goalId}`);

  const taskCounts = await getTaskCountsForKRs([{ id: keyResult.id, taskIds: keyResult.taskIds }]);
  return buildKeyResultWithProgress(keyResult, taskCounts);
}

export async function updateKeyResult(
  keyResultId: string,
  currentValue: number,
): Promise<KeyResultWithProgress> {
  const existing = await prisma.keyResult.findUnique({ where: { id: keyResultId } });
  if (!existing) throw new Error("Key result not found");

  const keyResult = await prisma.keyResult.update({
    where: { id: keyResultId },
    data: { currentValue },
  });

  await recalculateAndStoreProgress(keyResult.goalId);

  logger.info(`Key result updated: ${keyResultId} -> currentValue: ${currentValue}`);

  const taskCounts = await getTaskCountsForKRs([{ id: keyResult.id, taskIds: keyResult.taskIds }]);
  return buildKeyResultWithProgress(keyResult, taskCounts);
}

export async function linkTaskToKeyResult(
  keyResultId: string,
  taskId: string,
): Promise<KeyResultWithProgress> {
  const keyResult = await prisma.keyResult.findUnique({ where: { id: keyResultId } });
  if (!keyResult) throw new Error("Key result not found");

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");

  if (keyResult.taskIds.includes(taskId)) {
    throw new Error("Task is already linked to this key result");
  }

  const updated = await prisma.keyResult.update({
    where: { id: keyResultId },
    data: { taskIds: { push: taskId } },
  });

  await recalculateAndStoreProgress(keyResult.goalId);

  logger.info(`Task ${taskId} linked to key result ${keyResultId}`);

  const taskCounts = await getTaskCountsForKRs([{ id: updated.id, taskIds: updated.taskIds }]);
  return buildKeyResultWithProgress(updated, taskCounts);
}

export async function unlinkTaskFromKeyResult(
  keyResultId: string,
  taskId: string,
): Promise<KeyResultWithProgress> {
  const keyResult = await prisma.keyResult.findUnique({ where: { id: keyResultId } });
  if (!keyResult) throw new Error("Key result not found");

  if (!keyResult.taskIds.includes(taskId)) {
    throw new Error("Task is not linked to this key result");
  }

  const updated = await prisma.keyResult.update({
    where: { id: keyResultId },
    data: { taskIds: keyResult.taskIds.filter((id) => id !== taskId) },
  });

  await recalculateAndStoreProgress(keyResult.goalId);

  logger.info(`Task ${taskId} unlinked from key result ${keyResultId}`);

  const taskCounts = await getTaskCountsForKRs([{ id: updated.id, taskIds: updated.taskIds }]);
  return buildKeyResultWithProgress(updated, taskCounts);
}

export async function recalculateGoalProgress(goalId: string): Promise<number> {
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) throw new Error("Goal not found");

  const progress = await recalculateAndStoreProgress(goalId);

  logger.info(`Goal ${goalId} progress recalculated: ${progress}%`);

  return progress;
}

export async function getGoalDashboard(workspaceId: string, projectId?: string): Promise<{
  goals: GoalWithKeyResults[];
  totalGoals: number;
  averageProgress: number;
  atRiskCount: number;
  completedCount: number;
  activeCount: number;
  byType: { type: string; count: number; averageProgress: number }[];
}> {
  const goals = await prisma.goal.findMany({
    where: {
      workspaceId,
      status: { not: "cancelled" },
      ...(projectId ? { projectId } : {}),
    },
    include: {
      owner: { select: { name: true } },
      project: { select: { name: true } },
      keyResults: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const mappedGoals = await Promise.all(goals.map(mapGoalWithKeyResults));

  let totalProgress = 0;
  let atRiskCount = 0;

  for (const goal of mappedGoals) {
    totalProgress += goal.progress;
    const daysLeft = computeDaysRemaining(goal.endDate);
    if (goal.status === "active" && daysLeft <= 14 && goal.progress < 70) {
      atRiskCount++;
    }
  }

  const completedCount = mappedGoals.filter((g) => g.status === "completed").length;
  const activeCount = mappedGoals.filter((g) => g.status === "active").length;

  const typeMap = new Map<string, { count: number; totalProgress: number }>();
  for (const goal of mappedGoals) {
    const entry = typeMap.get(goal.type) ?? { count: 0, totalProgress: 0 };
    entry.count++;
    entry.totalProgress += goal.progress;
    typeMap.set(goal.type, entry);
  }

  const byType = Array.from(typeMap.entries()).map(([type, v]) => ({
    type,
    count: v.count,
    averageProgress: v.count > 0 ? Math.round(v.totalProgress / v.count) : 0,
  }));

  return {
    goals: mappedGoals,
    totalGoals: mappedGoals.length,
    averageProgress: mappedGoals.length > 0 ? Math.round(totalProgress / mappedGoals.length) : 0,
    atRiskCount,
    completedCount,
    activeCount,
    byType,
  };
}

export async function checkGoalDeadlines(workspaceId: string): Promise<{
  overdue: GoalWithKeyResults[];
  approaching: GoalWithKeyResults[];
  deadlineThresholdDays: number;
}> {
  const thresholdDays = 14;

  const goals = await prisma.goal.findMany({
    where: { workspaceId, status: "active" },
    include: {
      owner: { select: { name: true } },
      project: { select: { name: true } },
      keyResults: true,
    },
    orderBy: { endDate: "asc" },
  });

  const mappedGoals = await Promise.all(goals.map(mapGoalWithKeyResults));

  const overdue: GoalWithKeyResults[] = [];
  const approaching: GoalWithKeyResults[] = [];

  for (const goal of mappedGoals) {
    if (goal.daysRemaining < 0) {
      overdue.push(goal);
    } else if (goal.daysRemaining <= thresholdDays) {
      approaching.push(goal);
    }
  }

  if (overdue.length > 0 || approaching.length > 0) {
    logger.info(
      `Deadline check for workspace ${workspaceId}: ${overdue.length} overdue, ${approaching.length} approaching`,
    );
  }

  return { overdue, approaching, deadlineThresholdDays: thresholdDays };
}
