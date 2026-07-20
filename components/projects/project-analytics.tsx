"use client";

import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, TrendingDown, CheckCircle2, Clock, AlertTriangle,
  Users, BarChart3, Activity, Target
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectAnalyticsProps {
  projectId: string;
}

export function ProjectAnalytics({ projectId }: ProjectAnalyticsProps) {
  const { activeWorkspaceId } = useWorkspace();

  const { data, isLoading } = useQuery({
    queryKey: ["project-analytics", activeWorkspaceId, projectId],
    queryFn: async () => {
      const params = new URLSearchParams({
        workspaceId: activeWorkspaceId!,
        projectId,
      });
      const res = await fetch(`/api/analytics/project?${params}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: !!activeWorkspaceId && !!projectId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    {
      label: "Total Tasks",
      value: data.total || 0,
      icon: Target,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Completed",
      value: data.completed || 0,
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      suffix: data.completionRate ? `${data.completionRate}%` : undefined,
    },
    {
      label: "Overdue",
      value: data.overdue || 0,
      icon: AlertTriangle,
      color: data.overdue > 0 ? "text-destructive" : "text-muted-foreground",
      bg: data.overdue > 0 ? "bg-destructive/10" : "bg-muted",
    },
    {
      label: "Est. Hours",
      value: data.estimatedHours || 0,
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      suffix: data.actualHours ? `/ ${data.actualHours}h actual` : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
                <div className={cn("w-7 h-7 rounded-md flex items-center justify-center", stat.bg)}>
                  <stat.icon className={cn("h-3.5 w-3.5", stat.color)} />
                </div>
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.suffix && (
                <span className="text-[10px] text-muted-foreground">{stat.suffix}</span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {(data.byStatus?.length > 0 || data.byPriority?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.byStatus?.length > 0 && (
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  Tasks by Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.byStatus.map((item: any) => {
                  const total = data.total || 1;
                  const pct = Math.round((item.count / total) * 100);
                  return (
                    <div key={item.status} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="capitalize text-muted-foreground">{item.status.replace("_", " ")}</span>
                        <span className="font-medium">{item.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {data.byPriority?.length > 0 && (
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold flex items-center gap-2">
                  <BarChart3 className="h-3.5 w-3.5 text-amber-500" />
                  Tasks by Priority
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.byPriority.map((item: any) => {
                  const total = data.total || 1;
                  const pct = Math.round((item.count / total) * 100);
                  const colorMap: Record<string, string> = {
                    urgent: "bg-red-500",
                    high: "bg-orange-500",
                    medium: "bg-amber-500",
                    low: "bg-emerald-500",
                  };
                  return (
                    <div key={item.priority} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="capitalize text-muted-foreground">{item.priority}</span>
                        <span className="font-medium">{item.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", colorMap[item.priority] || "bg-primary")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
