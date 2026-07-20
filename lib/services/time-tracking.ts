import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { cacheGet, cacheSet, cacheInvalidate, cacheKey } from "@/lib/cache";

export interface StartTimerInput {
  taskId: string;
  userId: string;
  description?: string;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  taskTitle: string;
  userId: string;
  duration: number;
  description: string | null;
  startedAt: Date;
  endsAt: Date | null;
}

export interface TimeReport {
  totalTracked: number;
  billableHours: number;
  byTask: { taskId: string; taskTitle: string; duration: number }[];
  byUser: { userId: string; userName: string; duration: number }[];
  byDate: { date: string; duration: number }[];
  estimatedVsActual: { taskId: string; taskTitle: string; estimated: number; actual: number }[];
}

export interface BillableReport extends TimeReport {
  hourlyRate: number;
  totalBillable: number;
}

interface TimeReportFilters {
  userId?: string;
  projectId?: string;
  taskId?: string;
}

function mapToTimeEntry(entry: {
  id: string;
  taskId: string;
  duration: number;
  description: string | null;
  userId: string;
  createdAt: Date;
  task: { title: string };
}): TimeEntry {
  const startedAt = entry.createdAt;
  const endsAt = entry.duration > 0
    ? new Date(startedAt.getTime() + entry.duration * 1000)
    : null;

  return {
    id: entry.id,
    taskId: entry.taskId,
    taskTitle: entry.task.title,
    userId: entry.userId,
    duration: entry.duration,
    description: entry.description,
    startedAt,
    endsAt,
  };
}

function reportCacheKey(workspaceId: string, startDate: string, endDate: string, suffix: string): string {
  return cacheKey("time-report", workspaceId, startDate, endDate, suffix);
}

export async function startTimer(input: StartTimerInput): Promise<TimeEntry> {
  const { taskId, userId, description } = input;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new Error("Task not found");
  }

  const existingActive = await prisma.timeLog.findFirst({
    where: { userId, duration: 0 },
  });
  if (existingActive) {
    throw new Error("A timer is already running. Stop it before starting a new one.");
  }

  const timeLog = await prisma.timeLog.create({
    data: {
      taskId,
      userId,
      duration: 0,
      description: description ?? null,
    },
    include: { task: { select: { title: true } } },
  });

  logger.info(`Timer started for task ${taskId} by user ${userId}`);

  await cacheInvalidate(cacheKey("active-timer", userId));

  return mapToTimeEntry(timeLog);
}

export async function stopTimer(timerId: string): Promise<TimeEntry> {
  const timeLog = await prisma.timeLog.findUnique({
    where: { id: timerId },
    include: { task: { select: { title: true } } },
  });

  if (!timeLog) {
    throw new Error("Timer not found");
  }

  if (timeLog.duration > 0) {
    throw new Error("Timer has already been stopped");
  }

  const duration = Math.floor((Date.now() - timeLog.createdAt.getTime()) / 1000);

  const [updated] = await prisma.$transaction([
    prisma.timeLog.update({
      where: { id: timerId },
      data: { duration },
      include: { task: { select: { title: true } } },
    }),
    prisma.task.update({
      where: { id: timeLog.taskId },
      data: { timeSpent: { increment: duration } },
    }),
  ]);

  logger.info(`Timer ${timerId} stopped after ${duration}s`);

  await cacheInvalidate(cacheKey("active-timer", timeLog.userId));
  await cacheInvalidate(cacheKey("task-time", timeLog.taskId));

  return mapToTimeEntry(updated);
}

export async function getActiveTimer(userId: string): Promise<TimeEntry | null> {
  const cacheK = cacheKey("active-timer", userId);
  const cached = await cacheGet<TimeEntry>(cacheK);
  if (cached) return cached;

  const timeLog = await prisma.timeLog.findFirst({
    where: { userId, duration: 0 },
    include: { task: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
  });

  if (!timeLog) return null;

  const entry = mapToTimeEntry(timeLog);
  await cacheSet(cacheK, entry, 10);
  return entry;
}

export async function logTimeManual(
  taskId: string,
  userId: string,
  durationSeconds: number,
  description?: string,
): Promise<TimeEntry> {
  if (durationSeconds <= 0) {
    throw new Error("Duration must be a positive number of seconds");
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new Error("Task not found");
  }

  const [timeLog] = await prisma.$transaction([
    prisma.timeLog.create({
      data: {
        taskId,
        userId,
        duration: durationSeconds,
        description: description ?? null,
      },
      include: { task: { select: { title: true } } },
    }),
    prisma.task.update({
      where: { id: taskId },
      data: { timeSpent: { increment: durationSeconds } },
    }),
  ]);

  logger.info(`Manual time logged: ${durationSeconds}s for task ${taskId} by user ${userId}`);

  await cacheInvalidate(cacheKey("task-time", taskId));

  return mapToTimeEntry(timeLog);
}

export async function getTimeEntries(taskId: string): Promise<TimeEntry[]> {
  const cacheK = cacheKey("task-time", taskId);
  const cached = await cacheGet<TimeEntry[]>(cacheK);
  if (cached) return cached;

  const entries = await prisma.timeLog.findMany({
    where: { taskId },
    include: { task: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
  });

  const mapped = entries.map(mapToTimeEntry);
  await cacheSet(cacheK, mapped, 30);
  return mapped;
}

export async function getTimeReport(
  workspaceId: string,
  startDate: Date,
  endDate: Date,
  filters?: TimeReportFilters,
): Promise<TimeReport> {
  const startKey = startDate.toISOString().split("T")[0];
  const endKey = endDate.toISOString().split("T")[0];
  const filterKey = filters?.userId ?? filters?.projectId ?? filters?.taskId ?? "all";
  const cacheK = reportCacheKey(workspaceId, startKey, endKey, filterKey);

  const cached = await cacheGet<TimeReport>(cacheK);
  if (cached) return cached;

  const where: any = {
    duration: { gt: 0 },
    createdAt: { gte: startDate, lte: endDate },
    task: { workspaceId },
  };

  if (filters?.userId) where.userId = filters.userId;
  if (filters?.projectId) where.task = { ...where.task, projectId: filters.projectId };
  if (filters?.taskId) where.taskId = filters.taskId;

  const timeLogs = await prisma.timeLog.findMany({
    where,
    include: {
      task: { select: { id: true, title: true, estimatedHours: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  let totalTracked = 0;
  const taskMap = new Map<string, { taskTitle: string; duration: number }>();
  const userMap = new Map<string, { userName: string; duration: number }>();
  const dateMap = new Map<string, number>();
  const estimatedMap = new Map<string, { taskTitle: string; estimated: number; actual: number }>();

  for (const log of timeLogs) {
    totalTracked += log.duration;

    const taskEntry = taskMap.get(log.taskId);
    if (taskEntry) {
      taskEntry.duration += log.duration;
    } else {
      taskMap.set(log.taskId, { taskTitle: log.task.title, duration: log.duration });
    }

    const userEntry = userMap.get(log.userId);
    if (userEntry) {
      userEntry.duration += log.duration;
    } else {
      userMap.set(log.userId, { userName: log.user.name ?? "Unknown", duration: log.duration });
    }

    const dateStr = log.createdAt.toISOString().split("T")[0];
    dateMap.set(dateStr, (dateMap.get(dateStr) ?? 0) + log.duration);

    const existing = estimatedMap.get(log.taskId);
    if (existing) {
      existing.actual += log.duration;
    } else {
      estimatedMap.set(log.taskId, {
        taskTitle: log.task.title,
        estimated: (log.task.estimatedHours ?? 0) * 3600,
        actual: log.duration,
      });
    }
  }

  const report: TimeReport = {
    totalTracked,
    billableHours: Math.round(totalTracked / 3600 * 100) / 100,
    byTask: Array.from(taskMap.entries()).map(([taskId, v]) => ({ taskId, ...v })),
    byUser: Array.from(userMap.entries()).map(([userId, v]) => ({ userId, ...v })),
    byDate: Array.from(dateMap.entries())
      .map(([date, duration]) => ({ date, duration }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    estimatedVsActual: Array.from(estimatedMap.entries()).map(([taskId, v]) => ({ taskId, ...v })),
  };

  await cacheSet(cacheK, report, 60);
  return report;
}

export async function getBillableReport(
  workspaceId: string,
  startDate: Date,
  endDate: Date,
  hourlyRate: number,
): Promise<BillableReport> {
  const baseReport = await getTimeReport(workspaceId, startDate, endDate);

  return {
    ...baseReport,
    hourlyRate,
    totalBillable: Math.round(baseReport.totalTracked / 3600 * hourlyRate * 100),
  };
}

export async function getUserTimeSummary(
  workspaceId: string,
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<{
  totalTracked: number;
  entriesCount: number;
  averagePerDay: number;
  byTask: { taskId: string; taskTitle: string; duration: number }[];
  byDate: { date: string; duration: number }[];
}> {
  const report = await getTimeReport(workspaceId, startDate, endDate, { userId });

  const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000));

  return {
    totalTracked: report.totalTracked,
    entriesCount: report.byTask.reduce((sum, t) => {
      return sum + (t.duration > 0 ? 1 : 0);
    }, 0),
    averagePerDay: Math.round(report.totalTracked / days),
    byTask: report.byTask,
    byDate: report.byDate,
  };
}

export async function deleteTimeEntry(entryId: string): Promise<void> {
  const timeLog = await prisma.timeLog.findUnique({ where: { id: entryId } });
  if (!timeLog) {
    throw new Error("Time entry not found");
  }

  await prisma.$transaction([
    prisma.timeLog.delete({ where: { id: entryId } }),
    prisma.task.update({
      where: { id: timeLog.taskId },
      data: { timeSpent: { decrement: timeLog.duration } },
    }),
  ]);

  logger.info(`Time entry ${entryId} deleted (${timeLog.duration}s removed from task ${timeLog.taskId})`);

  await cacheInvalidate(cacheKey("task-time", timeLog.taskId));
}
