// Server-side PostHog data API for the analytics dashboard
// PostHog Query API docs: https://posthog.com/docs/api/query

import { prisma } from "@/lib/prisma";

const POSTHOG_PERSONAL_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

type PostHogQueryResponse = {
  results?: unknown[];
  error?: string;
};

async function queryPostHog(query: Record<string, unknown>): Promise<PostHogQueryResponse> {
  if (!POSTHOG_PERSONAL_API_KEY || !POSTHOG_PROJECT_ID) {
    return { results: [] };
  }

  try {
    const res = await fetch(
      `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${POSTHOG_PERSONAL_API_KEY}`,
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!res.ok) {
      console.error("[PostHog Query API]", res.status, await res.text());
      return { error: `PostHog API error: ${res.status}` };
    }

    return await res.json();
  } catch (error) {
    console.error("[PostHog Query API] Network error:", error);
    return { error: "Failed to reach PostHog API" };
  }
}

export type AnalyticsInsight = {
  event: string;
  count: number;
  unique_users: number;
  trend: { date: string; count: number }[];
};

export async function getEventCounts(
  event: string,
  since = "-30d",
  workspaceId?: string
): Promise<AnalyticsInsight | null> {
  const properties = workspaceId
    ? [{ key: "$current_workspace_id", value: workspaceId, operator: "exact" }]
    : [];

  const [totalResponse, uniqueResponse] = await Promise.all([
    queryPostHog({
      kind: "TrendsQuery",
      series: [{ kind: "EventsNode", event, math: "total" }],
      date_range: { date_from: since },
      interval: "day",
      breakdown: null,
      properties,
      filter_test_accounts: true,
    }),
    queryPostHog({
      kind: "TrendsQuery",
      series: [{ kind: "EventsNode", event, math: "dau" }],
      date_range: { date_from: since },
      interval: "day",
      breakdown: null,
      properties,
      filter_test_accounts: true,
    }),
  ]);

  const result = totalResponse.results?.[0] as { count?: number; data?: number[]; dates?: string[]; labels?: string[] } | undefined;
  const uniqueResult = uniqueResponse.results?.[0] as { count?: number } | undefined;

  if (!result) return null;

  return {
    event,
    count: result.count ?? 0,
    unique_users: uniqueResult?.count ?? 0,
    trend: (result.data ?? []).map((v: number, i: number) => ({
      date: result.dates?.[i] || result.labels?.[i] || `day_${i}`,
      count: v,
    })),
  };
}

export async function getWorkspaceMetrics(workspaceId: string, since = "-30d") {
  const [createdTasks, completedTasks, aiUsage, projectCreations] = await Promise.all([
    getEventCounts("task_created", since, workspaceId),
    getEventCounts("task_completed", since, workspaceId),
    getEventCounts("ai_used", since, workspaceId),
    getEventCounts("project_created", since, workspaceId),
  ]);

  return {
    tasks: {
      created: createdTasks?.count ?? 0,
      completed: completedTasks?.count ?? 0,
      completionRate:
        createdTasks?.count && createdTasks.count > 0
          ? Math.round(((completedTasks?.count ?? 0) / createdTasks.count) * 100)
          : 0,
    },
    aiUsage: aiUsage?.count ?? 0,
    projects: projectCreations?.count ?? 0,
  };
}

export type WorkspaceAnalytics = {
  totals: {
    tasks: number;
    completedTasks: number;
    overdueTasks: number;
    pendingTasks: number;
    projects: number;
    projectCompletionRate: number;
  };
  tasksByStatus: { status: string; count: number }[];
  tasksByPriority: { priority: string; count: number }[];
  tasksOverTime: { date: string; created: number; completed: number }[];
  teamProductivity: { userId: string; name: string | null; completed: number; total: number }[];
  mostActiveProjects: { projectId: string; name: string; taskCount: number; completedCount: number }[];
};

function parseDuration(since: string): number {
  const match = since.match(/^-(\d+)([dhm])$/);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case "d": return value * 24 * 60 * 60 * 1000;
    case "h": return value * 60 * 60 * 1000;
    case "m": return value * 60 * 1000;
    default: return 30 * 24 * 60 * 60 * 1000;
  }
}

function calculateTasksOverTime(
  activities: { action: string; createdAt: Date }[]
): { date: string; created: number; completed: number }[] {
  const dateMap = new Map<string, { created: number; completed: number }>();

  for (const activity of activities) {
    const dateStr = activity.createdAt.toISOString().split("T")[0];
    const entry = dateMap.get(dateStr) || { created: 0, completed: 0 };
    if (activity.action === "task_created") entry.created++;
    if (activity.action === "task_completed") entry.completed++;
    dateMap.set(dateStr, entry);
  }

  return Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));
}

async function calculateTeamProductivity(
  workspaceId: string
): Promise<{ userId: string; name: string | null; completed: number; total: number }[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const tasksByUser = await prisma.task.groupBy({
    by: ["userId"],
    where: { workspaceId, createdAt: { gte: thirtyDaysAgo } },
    _count: true,
  });

  const completedByUser = await prisma.task.groupBy({
    by: ["userId"],
    where: {
      workspaceId,
      status: "completed",
      updatedAt: { gte: thirtyDaysAgo },
    },
    _count: true,
  });

  const completedMap = new Map(completedByUser.map((r) => [r.userId, r._count]));

  const userIds = tasksByUser.map((r) => r.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  return tasksByUser
    .map((r) => ({
      userId: r.userId,
      name: userMap.get(r.userId) ?? null,
      completed: completedMap.get(r.userId) ?? 0,
      total: r._count,
    }))
    .sort((a, b) => b.completed - a.completed);
}

async function getMostActiveProjects(
  workspaceId: string
): Promise<{ projectId: string; name: string; taskCount: number; completedCount: number }[]> {
  const projects = await prisma.project.findMany({
    where: { workspaceId },
    select: {
      id: true,
      name: true,
      tasks: {
        select: { status: true },
      },
    },
  });

  return projects
    .map((p) => ({
      projectId: p.id,
      name: p.name,
      taskCount: p.tasks.length,
      completedCount: p.tasks.filter((t) => t.status === "completed").length,
    }))
    .filter((p) => p.taskCount > 0)
    .sort((a, b) => b.taskCount - a.taskCount)
    .slice(0, 10);
}

export async function getWorkspaceAnalytics(
  workspaceId: string,
  since = "-30d"
): Promise<WorkspaceAnalytics> {
  const now = new Date();
  const sinceDate = new Date(now.getTime() - parseDuration(since));

  const [totalTasks, completedTasks, overdueTasks, tasksByStatus, tasksByPriority, recentActivity] =
    await Promise.all([
      prisma.task.count({ where: { workspaceId, createdAt: { gte: sinceDate } } }),
      prisma.task.count({
        where: { workspaceId, status: "completed", updatedAt: { gte: sinceDate } },
      }),
      prisma.task.count({
        where: {
          workspaceId,
          dueDate: { lt: now },
          status: { notIn: ["completed", "cancelled"] },
        },
      }),
      prisma.task.groupBy({ by: ["status"], where: { workspaceId }, _count: true }),
      prisma.task.groupBy({ by: ["priority"], where: { workspaceId }, _count: true }),
      prisma.activity.findMany({
        where: { workspaceId, createdAt: { gte: sinceDate } },
        orderBy: { createdAt: "desc" },
        take: 500,
        select: { action: true, createdAt: true },
      }),
    ]);

  return {
    totals: {
      tasks: totalTasks,
      completedTasks,
      overdueTasks,
      pendingTasks: totalTasks - completedTasks,
      projects: await prisma.project.count({ where: { workspaceId } }),
      projectCompletionRate:
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    },
    tasksByStatus: tasksByStatus.map((s) => ({ status: s.status, count: s._count })),
    tasksByPriority: tasksByPriority.map((p) => ({ priority: p.priority, count: p._count })),
    tasksOverTime: calculateTasksOverTime(recentActivity),
    teamProductivity: await calculateTeamProductivity(workspaceId),
    mostActiveProjects: await getMostActiveProjects(workspaceId),
  };
}

export async function getTopEvents(since = "-30d", limit = 10) {
  const query = {
    kind: "TrendsQuery",
    series: [{ kind: "EventsNode", math: "total" } as Record<string, unknown>],
    date_range: { date_from: since },
    breakdown: "$event_type",
    filter_test_accounts: true,
  };

  const response = await queryPostHog(query);
  if (response.error || !response.results?.length) return [];

  const uniqueResponse = await queryPostHog({
    kind: "TrendsQuery",
    series: [{ kind: "EventsNode", math: "dau" } as Record<string, unknown>],
    date_range: { date_from: since },
    breakdown: "$event_type",
    filter_test_accounts: true,
  });

  const uniqueMap = new Map<string, number>();
  if (uniqueResponse.results) {
    (uniqueResponse.results as Array<{ label?: string; event?: string; count?: number }>).forEach((r) => {
      uniqueMap.set(r.label ?? r.event ?? "unknown", r.count ?? 0);
    });
  }

  const events = (response.results as Array<{ label?: string; event?: string; count?: number }>)
    .map((r) => ({
      event: r.label ?? r.event ?? "unknown",
      count: r.count ?? 0,
      uniqueUsers: uniqueMap.get(r.label ?? r.event ?? "unknown") ?? 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  return events;
}

export async function getActiveUsers(since = "-7d") {
  const query = {
    kind: "TrendsQuery",
    series: [{ kind: "EventsNode", math: "dau" } as Record<string, unknown>],
    date_range: { date_from: since },
    interval: "day",
    filter_test_accounts: true,
  };

  const response = await queryPostHog(query);
  if (response.error || !response.results?.length) return [];

  const result = response.results[0] as { data?: number[]; dates?: string[] } | undefined;
  if (!result) return [];

  return (result.data ?? []).map((count: number, i: number) => ({
    date: result.dates?.[i] || `day_${i}`,
    active_users: count,
  }));
}
