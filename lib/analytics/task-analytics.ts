import { prisma } from "@/lib/prisma";

export type BurndownPoint = {
  date: string;
  ideal: number;
  actual: number;
};

export type VelocityPoint = {
  week: string;
  completed: number;
  committed: number;
};

export type WorkloadItem = {
  userId: string;
  name: string | null;
  imageUrl: string | null;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  estimatedHours: number;
  actualHours: number;
};

export type CumulativeFlowPoint = {
  date: string;
  todo: number;
  inProgress: number;
  review: number;
  done: number;
};

export async function getBurndownChart(
  workspaceId: string,
  startDate: Date,
  endDate: Date
): Promise<BurndownPoint[]> {
  const tasks = await prisma.task.findMany({
    where: {
      workspaceId,
      createdAt: { lte: endDate },
    },
    select: {
      createdAt: true,
      completedAt: true,
      status: true,
    },
  });

  const totalTasks = tasks.filter((t) => t.createdAt <= startDate).length;
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
  const points: BurndownPoint[] = [];

  for (let i = 0; i <= days; i++) {
    const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = currentDate.toISOString().split("T")[0];

    const createdBeforeOrOn = tasks.filter((t) => t.createdAt <= currentDate).length;
    const completedBeforeOrOn = tasks.filter(
      (t) => t.completedAt && t.completedAt <= currentDate
    ).length;

    const idealRemaining = totalTasks - Math.round((totalTasks * i) / days);
    const actualRemaining = createdBeforeOrOn - completedBeforeOrOn;

    points.push({
      date: dateStr,
      ideal: Math.max(0, idealRemaining),
      actual: Math.max(0, actualRemaining),
    });
  }

  return points;
}

export async function getVelocityChart(
  workspaceId: string,
  weeks: number = 12
): Promise<VelocityPoint[]> {
  const now = new Date();
  const startDate = new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);

  const tasks = await prisma.task.findMany({
    where: {
      workspaceId,
      createdAt: { gte: startDate },
    },
    select: {
      createdAt: true,
      completedAt: true,
      status: true,
    },
  });

  const points: VelocityPoint[] = [];

  for (let i = 0; i < weeks; i++) {
    const weekStart = new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const weekLabel = weekStart.toISOString().split("T")[0];

    const committed = tasks.filter(
      (t) => t.createdAt >= weekStart && t.createdAt < weekEnd
    ).length;

    const completed = tasks.filter(
      (t) =>
        t.completedAt &&
        t.completedAt >= weekStart &&
        t.completedAt < weekEnd
    ).length;

    points.push({
      week: weekLabel,
      completed,
      committed,
    });
  }

  return points;
}

export async function getWorkloadChart(
  workspaceId: string
): Promise<WorkloadItem[]> {
  const tasks = await prisma.task.findMany({
    where: {
      workspaceId,
      status: { notIn: ["completed", "cancelled"] },
    },
    select: {
      assigneeIds: true,
      status: true,
      estimatedHours: true,
      timeSpent: true,
    },
  });

  const workloadMap = new Map<
    string,
    {
      totalTasks: number;
      completedTasks: number;
      inProgressTasks: number;
      todoTasks: number;
      estimatedHours: number;
      actualHours: number;
    }
  >();

  for (const task of tasks) {
    for (const userId of task.assigneeIds) {
      const existing = workloadMap.get(userId) || {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        todoTasks: 0,
        estimatedHours: 0,
        actualHours: 0,
      };

      existing.totalTasks++;
      if (task.status === "completed") existing.completedTasks++;
      else if (task.status === "in_progress") existing.inProgressTasks++;
      else existing.todoTasks++;

      existing.estimatedHours += task.estimatedHours || 0;
      existing.actualHours += (task.timeSpent || 0) / 3600;

      workloadMap.set(userId, existing);
    }
  }

  const userIds = Array.from(workloadMap.keys());
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, imageUrl: true },
  });

  const userMap = new Map(users.map((u) => [u.id, { name: u.name, imageUrl: u.imageUrl }]));

  return Array.from(workloadMap.entries())
    .map(([userId, data]) => ({
      userId,
      name: userMap.get(userId)?.name ?? null,
      imageUrl: userMap.get(userId)?.imageUrl ?? null,
      ...data,
    }))
    .sort((a, b) => b.totalTasks - a.totalTasks);
}

export async function getCumulativeFlow(
  workspaceId: string,
  days: number = 30
): Promise<CumulativeFlowPoint[]> {
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const tasks = await prisma.task.findMany({
    where: {
      workspaceId,
      createdAt: { lte: now },
    },
    select: {
      createdAt: true,
      completedAt: true,
      status: true,
    },
  });

  const points: CumulativeFlowPoint[] = [];

  for (let i = 0; i <= days; i++) {
    const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = currentDate.toISOString().split("T")[0];

    const createdBeforeOrOn = tasks.filter((t) => t.createdAt <= currentDate);

    let todo = 0;
    let inProgress = 0;
    let review = 0;
    let done = 0;

    for (const task of createdBeforeOrOn) {
      const isCompletedByDate =
        task.completedAt && task.completedAt <= currentDate;

      if (isCompletedByDate) {
        done++;
      } else {
        switch (task.status) {
          case "todo":
            todo++;
            break;
          case "in_progress":
            inProgress++;
            break;
          case "review":
            review++;
            break;
          default:
            todo++;
        }
      }
    }

    points.push({
      date: dateStr,
      todo,
      inProgress,
      review,
      done,
    });
  }

  return points;
}

export async function getProjectAnalytics(
  workspaceId: string,
  projectId: string
) {
  const tasks = await prisma.task.findMany({
    where: { workspaceId, projectId },
    select: {
      status: true,
      priority: true,
      createdAt: true,
      completedAt: true,
      dueDate: true,
      estimatedHours: true,
      timeSpent: true,
    },
  });

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const overdue = tasks.filter(
    (t) =>
      t.dueDate &&
      t.dueDate < new Date() &&
      t.status !== "completed" &&
      t.status !== "cancelled"
  ).length;

  const byStatus = tasks.reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const byPriority = tasks.reduce(
    (acc, t) => {
      acc[t.priority] = (acc[t.priority] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const totalEstimated = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  const totalActual = tasks.reduce((sum, t) => sum + (t.timeSpent || 0) / 3600, 0);

  return {
    total,
    completed,
    overdue,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
    byPriority: Object.entries(byPriority).map(([priority, count]) => ({ priority, count })),
    estimatedHours: Math.round(totalEstimated * 100) / 100,
    actualHours: Math.round(totalActual * 100) / 100,
  };
}
