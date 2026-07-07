// Server-side PostHog data API for the analytics dashboard
// PostHog Query API docs: https://posthog.com/docs/api/query

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
  since = "-30d"
): Promise<AnalyticsInsight | null> {
  const [totalResponse, uniqueResponse] = await Promise.all([
    queryPostHog({
      kind: "TrendsQuery",
      series: [{ kind: "EventsNode", event, math: "total" }],
      date_range: { date_from: since },
      interval: "day",
      breakdown: null,
      properties: [],
      filter_test_accounts: true,
    }),
    queryPostHog({
      kind: "TrendsQuery",
      series: [{ kind: "EventsNode", event, math: "dau" }],
      date_range: { date_from: since },
      interval: "day",
      breakdown: null,
      properties: [],
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
    getEventCounts("task_created", since),
    getEventCounts("task_completed", since),
    getEventCounts("ai_used", since),
    getEventCounts("project_created", since),
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
