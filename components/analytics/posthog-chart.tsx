"use client";

import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { cn } from "@/lib/utils";

type ChartType = "bar" | "line" | "area";

interface PostHogChartProps {
  event: string;
  title?: string;
  since?: string;
  type?: ChartType;
  height?: number;
  className?: string;
}

export function PostHogChart({
  event,
  title,
  since = "-30d",
  type = "bar",
  height = 200,
  className,
}: PostHogChartProps) {
  const { activeWorkspaceId } = useWorkspace();

  const { data, isLoading } = useQuery({
    queryKey: ["posthog-chart", activeWorkspaceId, event, since],
    queryFn: async () => {
      const res = await fetch(
        `/api/analytics/posthog/chart?event=${encodeURIComponent(event)}&since=${since}&workspaceId=${activeWorkspaceId}`
      );
      if (!res.ok) throw new Error("Failed to fetch chart data");
      return res.json();
    },
    enabled: !!activeWorkspaceId,
  });

  if (isLoading) {
    return (
      <div className={cn("animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900", className)} style={{ height }} />
    );
  }

  if (!data?.points?.length || !data.total) {
    return null;
  }

  const values = data.points.map((p: { count: number }) => p.count);
  const max = Math.max(...values, 1);

  return (
    <div className={cn("space-y-2", className)}>
      {title && (
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{title}</p>
      )}
      <div className="flex items-end gap-1" style={{ height }}>
        {data.points.map((point: { date: string; count: number }, i: number) => {
          const pct = (point.count / max) * 100;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end h-full"
            >
              <div
                className={cn(
                  "w-full rounded-t transition-all duration-500",
                  type === "area"
                    ? "bg-gradient-to-t from-indigo-500/40 to-indigo-500/80"
                    : type === "line"
                    ? "bg-indigo-500 min-h-[2px]"
                    : "bg-indigo-500 hover:bg-indigo-600"
                )}
                style={{ height: `${Math.max(pct, type === "line" ? 2 : 3)}%` }}
              />
              {data.points.length <= 14 && (
                <span className="text-[6px] text-slate-400 mt-1 truncate w-full text-center">
                  {point.date?.slice(0, 3)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface PostHogMetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  color?: string;
}

export function PostHogMetricCard({
  label,
  value,
  subtitle,
  trend,
  color = "text-indigo-600",
}: PostHogMetricCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm">
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className={cn("text-2xl font-bold", color)}>{value}</p>
      {subtitle && (
        <p className="text-[10px] text-slate-500 mt-1">{subtitle}</p>
      )}
      {trend && (
        <span className={cn(
          "text-[9px] font-bold",
          trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-slate-400"
        )}>
          {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trend}
        </span>
      )}
    </div>
  );
}
