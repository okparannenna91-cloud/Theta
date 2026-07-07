"use client";

import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type PostHogData = {
  configured: boolean;
  metrics: {
    tasks: { created: number; completed: number; completionRate: number };
    aiUsage: number;
    projects: number;
  } | null;
  topEvents: { event: string; count: number; uniqueUsers: number }[];
  activeUsers: { date: string; active_users: number }[];
};

export function PostHogInsights() {
  const { activeWorkspaceId } = useWorkspace();

  const { data, isLoading, error } = useQuery<PostHogData>({
    queryKey: ["posthog-analytics", activeWorkspaceId],
    queryFn: async () => {
      const res = await fetch(
        `/api/analytics/posthog?workspaceId=${activeWorkspaceId}&since=-30d`
      );
      if (!res.ok) throw new Error("Failed to fetch PostHog analytics");
      return res.json();
    },
    enabled: !!activeWorkspaceId,
    refetchInterval: 120_000, // 2 min – analytics data doesn't change rapidly
  });

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-xs text-red-500">Failed to load analytics insights</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data?.configured || !data?.metrics) {
    return (
      <div className="p-4 text-center">
        <p className="text-xs text-slate-400">PostHog is not configured. Set NEXT_PUBLIC_POSTHOG_KEY to enable insights.</p>
      </div>
    );
  }

  const { metrics, topEvents, activeUsers } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Tasks Created (30d)"
          value={metrics.tasks.created}
        />
        <MetricCard
          title="Tasks Completed (30d)"
          value={metrics.tasks.completed}
        />
        <MetricCard
          title="Completion Rate"
          value={`${metrics.tasks.completionRate}%`}
        />
        <MetricCard
          title="AI Interactions"
          value={metrics.aiUsage}
        />
        <MetricCard
          title="Projects Created"
          value={metrics.projects}
        />
        <MetricCard
          title="Active Days (7d)"
          value={activeUsers?.length ?? 0}
        />
      </div>

      {topEvents && topEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Top Tracked Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topEvents.map((evt) => (
                <div
                  key={evt.event}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-600 dark:text-slate-400">
                    {evt.event}
                  </span>
                  <span className="font-medium">{evt.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-slate-500 mb-1">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
