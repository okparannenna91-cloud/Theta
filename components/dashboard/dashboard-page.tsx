"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, CheckSquare, Users, TrendingUp, Target, Activity, Clock, ArrowRight, ArrowUp, ArrowDown, Minus, Sparkles, Brain } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useI18n } from "@/lib/i18n";
import { useWorkspace } from "@/hooks/use-workspace";
import { useRouter } from "next/navigation";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { usePopups } from "@/components/popups/popup-manager";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const AreaChart = dynamic(() => import("recharts").then(m => m.AreaChart), { ssr: false });
const Area = dynamic(() => import("recharts").then(m => m.Area), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });

export default function DashboardPage() {
  const { t } = useI18n();
  const { activeWorkspaceId } = useWorkspace();
  const router = useRouter();
  const { showAISuggestion } = usePopups();
  const [timeRange, setTimeRange] = useState<"7" | "30">("7");
  const hasSuggested = useRef(false);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["dashboard", activeWorkspaceId, timeRange],
    queryFn: async () => {
      const url = activeWorkspaceId ? `/api/dashboard?workspaceId=${activeWorkspaceId}&days=${timeRange}` : "/api/dashboard";
      const res = await fetch(url);
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.details || errorBody.error || `Request failed with status ${res.status}`);
      }
      return res.json();
    },
    enabled: !!activeWorkspaceId,
  });

  useEffect(() => {
    if (!data || hasSuggested.current) return;
    if (data.tasksCount === 0 && data.projectsCount === 0) {
      showAISuggestion("Your workspace is empty. Would you like Nova to help you create a project?", {
        type: "workspace_empty",
        workspaceId: activeWorkspaceId,
      });
    } else if (data.tasksCount > 0 && data.completionRate < 30) {
      showAISuggestion("I notice several tasks are still open. I can help prioritize and organize them.", {
        type: "task_backlog",
        tasksCount: data.tasksCount,
      });
    } else if (data.recentProjects?.length > 0) {
      showAISuggestion("Your team has been productive! I can generate a sprint summary or suggest next steps.", {
        type: "productivity_tip",
        projectsCount: data.recentProjects.length,
      });
    }
    hasSuggested.current = true;
  }, [data, showAISuggestion, activeWorkspaceId]);

  if (!activeWorkspaceId) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">No workspace selected</h2>
          <p className="text-sm text-muted-foreground mb-4">Select or create a workspace to get started</p>
          <Button variant="outline" onClick={() => router.push("/workspaces")}>
            Manage Workspaces
          </Button>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <TrendingUp className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Failed to load dashboard</h2>
          <p className="text-sm text-muted-foreground mb-4">{(error as Error)?.message || "An unexpected error occurred"}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>Try again</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-5 space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>
        <div className="border rounded-lg p-6 space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-6 space-y-4">
              <Skeleton className="h-5 w-36" />
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const trendPercent = (key: string) => data?.trends?.[key] ?? 0;
  const TrendIcon = ({ value }: { value: number }) => {
    if (value > 0) return <ArrowUp className="w-3 h-3" />;
    if (value < 0) return <ArrowDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };
  const trendColor = (value: number) =>
    value > 0 ? "text-emerald-600" : value < 0 ? "text-red-500" : "text-muted-foreground";

  const stats = [
    {
      title: t("projects"),
      value: data?.projectsCount || 0,
      icon: FolderKanban,
      color: "text-primary",
      bg: "bg-primary/10",
      trend: trendPercent("projects"),
    },
    {
      title: t("active_tasks"),
      value: data?.tasksCount || 0,
      icon: CheckSquare,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      trend: trendPercent("tasks"),
    },
    {
      title: t("team_members"),
      value: data?.membersCount || 0,
      icon: Users,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
      trend: 0,
    },
    {
      title: t("completion_rate"),
      value: `${data?.completionRate || 0}%`,
      icon: Target,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      trend: trendPercent("completionRate"),
    },
  ];

  return (
    <div className="pb-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">{t("dashboard")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("welcome_back")}
          </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <Card key={i} className="border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{stat.title}</span>
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", stat.bg, stat.color)}>
                  <stat.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className={cn("flex items-center gap-1 mt-2 text-xs", trendColor(stat.trend))}>
                <TrendIcon value={stat.trend} />
                {stat.trend > 0 ? `+${stat.trend}%` : stat.trend === 0 ? "No change" : `${stat.trend}%`}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border shadow-sm mb-8">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Activity Overview</CardTitle>
                <p className="text-xs text-muted-foreground">Track your team&apos;s performance over time</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant={timeRange === "7" ? "default" : "outline"} size="sm" className="h-8 text-xs rounded-md" onClick={() => setTimeRange("7")}>7 Days</Button>
              <Button variant={timeRange === "30" ? "default" : "outline"} size="sm" className="h-8 text-xs rounded-md" onClick={() => setTimeRange("30")}>30 Days</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            {Array.isArray(data?.activityTrends) && data.activityTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.activityTrends}>
                  <defs>
                    <linearGradient id="colorActivities" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6C5CE7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6C5CE7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    dx={-10}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      padding: "12px",
                    }}
                    itemStyle={{
                      fontSize: "12px",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="activities"
                    stroke="#6C5CE7"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorActivities)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{t("no_activity_data")}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="border shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">{t("recent_projects")}</CardTitle>
                <p className="text-xs text-muted-foreground">Active workspace workstreams</p>
              </div>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-primary rounded-md">
                {t("view_all")}
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {data?.recentProjects?.length > 0 ? (
              data.recentProjects.map((project: { id: string; name: string; tasksCount: number }) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {project.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{project.name}</p>
                      <p className="text-xs text-muted-foreground">{project.tasksCount} tasks</p>
                    </div>
                  </div>
                  <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min((project.tasksCount / Math.max(...(data?.recentProjects || []).map((p: { tasksCount: number }) => p.tasksCount), 1)) * 100, 100)}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <FolderKanban className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{t("no_projects")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">{t("priority_tasks")}</CardTitle>
                <p className="text-xs text-muted-foreground">Tasks requiring attention</p>
              </div>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-primary rounded-md">
                {t("manage")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {data?.recentTasks?.length > 0 ? (
              data.recentTasks.map((task: { id: string; title: string; status: string; priority: string; project?: { name: string } }) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-1.5 h-10 rounded-full",
                      task.priority === 'high' ? 'bg-red-500' : 'bg-primary'
                    )} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.project?.name || "No project"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "rounded-md h-7 px-3 text-xs font-medium",
                      (task.status === "done")
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                        : "bg-primary/10 text-primary border border-primary/20"
                    )}
                  >
                    {task.status.replace(/[_-]/g, " ")}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <CheckSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{t("no_tasks")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="border shadow-sm lg:col-span-2">
          <CardHeader className="pb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
                <p className="text-xs text-muted-foreground">Live workspace activity feed</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ActivityTimeline
              activities={data?.recentActivities || []}
              emptyMessage="No recent activity"
            />
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Brain className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Nova Brief</CardTitle>
                <p className="text-xs text-muted-foreground">AI-powered workspace insights</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-muted/50 border border-primary/10">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Workspace Snapshot</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {data?.projectsCount || 0} projects, {data?.tasksCount || 0} tasks, {data?.membersCount || 0} members
                      &mdash; {data?.completionRate || 0}% completion rate.
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start text-xs h-10 rounded-xl" onClick={() => window.dispatchEvent(new CustomEvent("nova:open", { detail: { prompt: "Summarize what happened this week in my workspace" } }))}>
                  <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" />
                  Summarize this week
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs h-10 rounded-xl" onClick={() => window.dispatchEvent(new CustomEvent("nova:open", { detail: { prompt: "Suggest next actions for my workspace based on recent activity" } }))}>
                  <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" />
                  Suggest next actions
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs h-10 rounded-xl" onClick={() => window.dispatchEvent(new CustomEvent("nova:open", { detail: { prompt: "Generate a status report for my workspace" } }))}>
                  <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" />
                  Generate status report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
