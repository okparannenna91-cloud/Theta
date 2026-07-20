import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { cacheGet, cacheSet, cacheInvalidate, cacheKey } from "@/lib/cache";

export interface CreateSprintInput {
  name: string;
  projectId: string;
  workspaceId: string;
  startDate: Date;
  endDate: Date;
  goal?: string;
}

export interface SprintWithStats {
  id: string;
  name: string;
  projectId: string;
  startDate: Date;
  endDate: Date;
  goal: string | null;
  status: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  completionRate: number;
  estimatedHours: number;
  actualHours: number;
  daysRemaining: number;
}

export interface SprintBurndownPoint {
  date: string;
  ideal: number;
  actual: number;
}

export interface SprintVelocityData {
  sprintId: string;
  sprintName: string;
  committed: number;
  completed: number;
  velocity: number;
}

export interface SprintRetrospective {
  sprint: SprintWithStats;
  burndown: SprintBurndownPoint[];
  velocity: SprintVelocityData[];
  completedTasks: { id: string; title: string; completedAt: Date }[];
  incompleteTasks: { id: string; title: string; status: string }[];
}

type SprintRecord = {
  id: string;
  name: string;
  projectId: string;
  startDate: Date;
  endDate: Date;
  goal: string | null;
  status: string;
};

function sprintCacheKey(...parts: string[]): string {
  return cacheKey("sprint", ...parts);
}

async function getSprintTasks(sprintId: string) {
  return prisma.task.findMany({
    where: { sprintId },
    select: {
      id: true,
      title: true,
      status: true,
      estimatedHours: true,
      timeSpent: true,
      completedAt: true,
    },
  });
}

function buildSprintStats(sprint: SprintRecord, tasks: Awaited<ReturnType<typeof getSprintTasks>>): SprintWithStats {
  const now = new Date();
  const msRemaining = sprint.endDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / 86400000));

  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
  const todoTasks = tasks.filter((t) => t.status === "todo").length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const estimatedHours = tasks.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0);
  const actualHours = tasks.reduce((sum, t) => sum + Math.round((t.timeSpent ?? 0) / 3600 * 100) / 100, 0);

  return {
    id: sprint.id,
    name: sprint.name,
    projectId: sprint.projectId,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    goal: sprint.goal,
    status: sprint.status,
    totalTasks,
    completedTasks,
    inProgressTasks,
    todoTasks,
    completionRate,
    estimatedHours,
    actualHours,
    daysRemaining,
  };
}

export async function createSprint(input: CreateSprintInput): Promise<SprintWithStats> {
  const { name, projectId, workspaceId, startDate, endDate, goal } = input;

  if (endDate <= startDate) {
    throw new Error("End date must be after start date");
  }

  const overlappingActive = await prisma.sprint.findFirst({
    where: {
      projectId,
      status: "active",
      OR: [
        { startDate: { lte: endDate }, endDate: { gte: startDate } },
      ],
    },
  });

  if (overlappingActive) {
    throw new Error(
      `Cannot create sprint: project already has active sprint "${overlappingActive.name}" ` +
      `(${overlappingActive.startDate.toISOString().split("T")[0]} to ${overlappingActive.endDate.toISOString().split("T")[0]})`
    );
  }

  const sprint = await prisma.sprint.create({
    data: {
      name,
      projectId,
      workspaceId,
      startDate,
      endDate,
      goal: goal ?? null,
      status: "planned",
    },
  });

  logger.info(`Sprint created: ${sprint.id} "${name}" for project ${projectId}`);

  await cacheInvalidate(sprintCacheKey("project", projectId));

  return buildSprintStats(sprint, []);
}

export async function getSprint(sprintId: string): Promise<SprintWithStats> {
  const cacheK = sprintCacheKey("detail", sprintId);
  const cached = await cacheGet<SprintWithStats>(cacheK);
  if (cached) return cached;

  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
  if (!sprint) {
    throw new Error("Sprint not found");
  }

  const tasks = await getSprintTasks(sprintId);
  const stats = buildSprintStats(sprint, tasks);

  await cacheSet(cacheK, stats, 30);
  return stats;
}

export async function getSprintsForProject(projectId: string): Promise<SprintWithStats[]> {
  const cacheK = sprintCacheKey("project", projectId);
  const cached = await cacheGet<SprintWithStats[]>(cacheK);
  if (cached) return cached;

  const sprints = await prisma.sprint.findMany({
    where: { projectId },
    orderBy: { startDate: "desc" },
  });

  const results: SprintWithStats[] = [];
  for (const sprint of sprints) {
    const tasks = await getSprintTasks(sprint.id);
    results.push(buildSprintStats(sprint, tasks));
  }

  await cacheSet(cacheK, results, 30);
  return results;
}

export async function getActiveSprint(projectId: string): Promise<SprintWithStats | null> {
  const cacheK = sprintCacheKey("active", projectId);
  const cached = await cacheGet<SprintWithStats>(cacheK);
  if (cached) return cached;

  const sprint = await prisma.sprint.findFirst({
    where: { projectId, status: "active" },
  });

  if (!sprint) return null;

  const tasks = await getSprintTasks(sprint.id);
  const stats = buildSprintStats(sprint, tasks);

  await cacheSet(cacheK, stats, 15);
  return stats;
}

export async function startSprint(sprintId: string): Promise<SprintWithStats> {
  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
  if (!sprint) {
    throw new Error("Sprint not found");
  }

  if (sprint.status === "active") {
    throw new Error("Sprint is already active");
  }

  if (sprint.status === "completed") {
    throw new Error("Cannot start a completed sprint");
  }

  const existingActive = await prisma.sprint.findFirst({
    where: {
      projectId: sprint.projectId,
      status: "active",
      id: { not: sprintId },
    },
  });

  if (existingActive) {
    throw new Error(
      `Cannot start sprint: project already has active sprint "${existingActive.name}"`
    );
  }

  const updated = await prisma.sprint.update({
    where: { id: sprintId },
    data: { status: "active" },
  });

  logger.info(`Sprint started: ${sprintId} "${sprint.name}"`);

  await cacheInvalidate(sprintCacheKey("project", sprint.projectId));
  await cacheInvalidate(sprintCacheKey("active", sprint.projectId));
  await cacheInvalidate(sprintCacheKey("detail", sprintId));

  const tasks = await getSprintTasks(sprintId);
  return buildSprintStats(updated, tasks);
}

export async function completeSprint(sprintId: string): Promise<SprintWithStats> {
  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
  if (!sprint) {
    throw new Error("Sprint not found");
  }

  if (sprint.status === "completed") {
    throw new Error("Sprint is already completed");
  }

  const incompleteTasks = await prisma.task.findMany({
    where: { sprintId, status: { not: "completed" } },
    select: { id: true, title: true },
  });

  if (incompleteTasks.length > 0) {
    const nextSprint = await prisma.sprint.findFirst({
      where: {
        projectId: sprint.projectId,
        status: "planned",
        startDate: { gt: sprint.endDate },
      },
      orderBy: { startDate: "asc" },
    });

    const targetSprintId = nextSprint?.id ?? null;

    await prisma.task.updateMany({
      where: { sprintId, status: { not: "completed" } },
      data: { sprintId: targetSprintId },
    });

    if (targetSprintId) {
      logger.info(
        `Moved ${incompleteTasks.length} incomplete tasks from sprint ${sprintId} to sprint ${targetSprintId}`
      );
    } else {
      logger.info(
        `Moved ${incompleteTasks.length} incomplete tasks from sprint ${sprintId} to backlog (no next sprint)`
      );
    }
  }

  const updated = await prisma.sprint.update({
    where: { id: sprintId },
    data: { status: "completed" },
  });

  logger.info(`Sprint completed: ${sprintId} "${sprint.name}"`);

  await cacheInvalidate(sprintCacheKey("project", sprint.projectId));
  await cacheInvalidate(sprintCacheKey("active", sprint.projectId));
  await cacheInvalidate(sprintCacheKey("detail", sprintId));

  const tasks = await getSprintTasks(sprintId);
  return buildSprintStats(updated, tasks);
}

export async function assignTaskToSprint(taskId: string, sprintId: string): Promise<void> {
  const [task, sprint] = await Promise.all([
    prisma.task.findUnique({ where: { id: taskId }, select: { id: true, projectId: true } }),
    prisma.sprint.findUnique({ where: { id: sprintId }, select: { id: true, projectId: true, status: true } }),
  ]);

  if (!task) {
    throw new Error("Task not found");
  }

  if (!sprint) {
    throw new Error("Sprint not found");
  }

  if (task.projectId !== sprint.projectId) {
    throw new Error("Task and sprint must belong to the same project");
  }

  if (sprint.status === "completed") {
    throw new Error("Cannot assign tasks to a completed sprint");
  }

  const currentActiveSprint = await prisma.sprint.findFirst({
    where: { projectId: task.projectId, status: "active", id: { not: sprintId } },
  });

  if (currentActiveSprint) {
    await prisma.task.update({
      where: { id: taskId },
      data: { sprintId },
    });
    logger.info(`Task ${taskId} reassigned from active sprint to sprint ${sprintId}`);
  } else {
    await prisma.task.update({
      where: { id: taskId },
      data: { sprintId },
    });
    logger.info(`Task ${taskId} assigned to sprint ${sprintId}`);
  }

  await cacheInvalidate(sprintCacheKey("detail", sprintId));
  await cacheInvalidate(sprintCacheKey("project", sprint.projectId));
}

export async function removeTaskFromSprint(taskId: string): Promise<void> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, sprintId: true, projectId: true },
  });

  if (!task) {
    throw new Error("Task not found");
  }

  if (!task.sprintId) {
    throw new Error("Task is not assigned to any sprint");
  }

  await prisma.task.update({
    where: { id: taskId },
    data: { sprintId: null },
  });

  logger.info(`Task ${taskId} removed from sprint ${task.sprintId}`);

  await cacheInvalidate(sprintCacheKey("detail", task.sprintId));
  await cacheInvalidate(sprintCacheKey("project", task.projectId));
}

export async function getSprintBurndown(sprintId: string): Promise<SprintBurndownPoint[]> {
  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
  if (!sprint) {
    throw new Error("Sprint not found");
  }

  const cacheK = sprintCacheKey("burndown", sprintId);
  const cached = await cacheGet<SprintBurndownPoint[]>(cacheK);
  if (cached) return cached;

  const tasks = await prisma.task.findMany({
    where: { sprintId },
    select: { id: true, status: true, createdAt: true },
  });

  const totalTasks = tasks.length;
  if (totalTasks === 0) {
    return [];
  }

  const startDate = new Date(sprint.startDate);
  const endDate = new Date(sprint.endDate);
  const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000));

  const completedTaskDates = new Map<string, number>();
  for (const task of tasks) {
    if (task.status === "completed" && task.createdAt) {
      const dateStr = task.createdAt.toISOString().split("T")[0];
      completedTaskDates.set(dateStr, (completedTaskDates.get(dateStr) ?? 0) + 1);
    }
  }

  const points: SprintBurndownPoint[] = [];
  let remainingTasks = totalTasks;
  let completedSoFar = 0;

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  for (let day = 0; day <= totalDays; day++) {
    const pointDate = new Date(startDate.getTime() + day * 86400000);
    const dateStr = pointDate.toISOString().split("T")[0];
    const idealRemaining = Math.round(totalTasks * (1 - day / totalDays));

    if (dateStr <= todayStr) {
      const completedOnDay = completedTaskDates.get(dateStr) ?? 0;
      completedSoFar += completedOnDay;
      remainingTasks = totalTasks - completedSoFar;
    }

    points.push({
      date: dateStr,
      ideal: idealRemaining,
      actual: dateStr <= todayStr ? remainingTasks : idealRemaining,
    });
  }

  await cacheSet(cacheK, points, 60);
  return points;
}

export async function getSprintVelocity(
  projectId: string,
  numSprints: number = 5,
): Promise<SprintVelocityData[]> {
  const cacheK = sprintCacheKey("velocity", projectId, String(numSprints));
  const cached = await cacheGet<SprintVelocityData[]>(cacheK);
  if (cached) return cached;

  const completedSprints = await prisma.sprint.findMany({
    where: { projectId, status: "completed" },
    orderBy: { endDate: "desc" },
    take: numSprints,
  });

  const velocityData: SprintVelocityData[] = [];

  for (const sprint of completedSprints) {
    const tasks = await prisma.task.findMany({
      where: { sprintId: sprint.id },
      select: { id: true, status: true },
    });

    const committed = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;

    velocityData.push({
      sprintId: sprint.id,
      sprintName: sprint.name,
      committed,
      completed,
      velocity: committed > 0 ? Math.round((completed / committed) * 100) : 0,
    });
  }

  await cacheSet(cacheK, velocityData, 120);
  return velocityData;
}

export async function getSprintRetrospective(sprintId: string): Promise<SprintRetrospective> {
  const cacheK = sprintCacheKey("retro", sprintId);
  const cached = await cacheGet<SprintRetrospective>(cacheK);
  if (cached) return cached;

  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
  if (!sprint) {
    throw new Error("Sprint not found");
  }

  const tasks = await prisma.task.findMany({
    where: { sprintId },
    select: {
      id: true,
      title: true,
      status: true,
      estimatedHours: true,
      timeSpent: true,
      completedAt: true,
    },
  });

  const sprintStats = buildSprintStats(sprint, tasks);
  const burndown = await getSprintBurndown(sprintId);
  const velocity = await getSprintVelocity(sprint.projectId, 5);

  const completedTasks = tasks
    .filter((t) => t.status === "completed" && t.completedAt)
    .map((t) => ({
      id: t.id,
      title: t.title,
      completedAt: t.completedAt!,
    }));

  const incompleteTasks = tasks
    .filter((t) => t.status !== "completed")
    .map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
    }));

  const retrospective: SprintRetrospective = {
    sprint: sprintStats,
    burndown,
    velocity,
    completedTasks,
    incompleteTasks,
  };

  await cacheSet(cacheK, retrospective, 60);
  return retrospective;
}

export async function autoCompleteSprint(sprintId: string): Promise<SprintWithStats | null> {
  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
  if (!sprint) {
    throw new Error("Sprint not found");
  }

  if (sprint.status !== "active") {
    return null;
  }

  const now = new Date();
  if (sprint.endDate.getTime() > now.getTime()) {
    return null;
  }

  logger.info(`Auto-completing sprint ${sprintId} "${sprint.name}" (end date passed)`);
  return completeSprint(sprintId);
}

export async function autoCompleteExpiredSprints(): Promise<string[]> {
  const expiredActiveSprints = await prisma.sprint.findMany({
    where: {
      status: "active",
      endDate: { lt: new Date() },
    },
  });

  const completedIds: string[] = [];

  for (const sprint of expiredActiveSprints) {
    try {
      await completeSprint(sprint.id);
      completedIds.push(sprint.id);
      logger.info(`Auto-completed expired sprint: ${sprint.id} "${sprint.name}"`);
    } catch (err) {
      logger.error(`Failed to auto-complete sprint ${sprint.id}:`, err);
    }
  }

  return completedIds;
}
