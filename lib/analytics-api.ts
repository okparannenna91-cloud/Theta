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
        next: { revalidate: 300 },
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
  const query = {
    kind: "TrendsQuery",
    series: [{ kind: "EventsNode", event, math: "total" }],
    date_range: { date_from: since },
    interval: "day",
    breakdown: null,
    properties: [],
    filter_test_accounts: true,
  };

  const response = await queryPostHog(query);
  if (response.error || !response.results?.length) return null;

  const result = response.results[0] as any;
  return {
    event,
    count: result.count ?? 0,
    unique_users: result.count ?? 0,
    trend: (result.data ?? result.timeline ?? []).map((v: number, i: string | number) => ({
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
    series: [{ kind: "EventsNode", event: undefined, math: "total" }],
    date_range: { date_from: since },
    breakdown: "$event_type",
    filter_test_accounts: true,
  };

  const response = await queryPostHog(query);
  if (response.error || !response.results?.length) return [];

  const events = response.results
    .map((r: any) => ({
      event: r.label ?? r.event ?? "unknown",
      count: r.count ?? 0,
      uniqueUsers: r.count ?? 0,
    }))
    .sort((a: { count: number }, b: { count: number }) => b.count - a.count)
    .slice(0, limit);

  return events;
}

export async function getActiveUsers(since = "-7d") {
  const query = {
    kind: "TrendsQuery",
    series: [{ kind: "EventsNode", event: undefined, math: "dau" }],
    date_range: { date_from: since },
    interval: "day",
    filter_test_accounts: true,
  };

  const response = await queryPostHog(query);
  if (response.error || !response.results?.length) return [];

  const result = response.results[0] as any;
  return (result.data ?? []).map((count: number, i: string | number) => ({
    date: result.dates?.[i] || `day_${i}`,
    active_users: count,
  }));
}
