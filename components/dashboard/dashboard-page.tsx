"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, CheckSquare, Users, TrendingUp, Activity, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

import { useWorkspace } from "@/hooks/use-workspace";
import { cn } from "@/lib/utils";

async function fetchDashboardData(workspaceId: string | null) {
  const url = workspaceId ? `/api/dashboard?workspaceId=${workspaceId}` : "/api/dashboard";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch dashboard data");
  return res.json();
}

import { PostHogChart } from "@/components/analytics/posthog-chart";

import { useI18n } from "@/lib/i18n";

export default function DashboardPage() {
  const { t } = useI18n();
  const { activeWorkspaceId } = useWorkspace();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", activeWorkspaceId],
    queryFn: () => fetchDashboardData(activeWorkspaceId),
    enabled: !!activeWorkspaceId,
  });

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

  const stats = [
    {
      title: t("projects"),
      value: data?.projectsCount || 0,
      icon: FolderKanban,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: t("active_tasks"),
      value: data?.tasksCount || 0,
      icon: CheckSquare,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: t("team_members"),
      value: data?.teamsCount || 0,
      icon: Users,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
    {
      title: t("completion_rate"),
      value: `${data?.completionRate || 0}%`,
      icon: TrendingUp,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="pb-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">{t("dashboard")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back to your workspace
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
              <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600">
                <TrendingUp className="w-3 h-3" />
                +12.5%
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
              <Button variant="outline" size="sm" className="h-8 text-xs rounded-md">7 Days</Button>
              <Button variant="outline" size="sm" className="h-8 text-xs rounded-md">30 Days</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <PostHogChart event="task_created" since="-30d" type="area" height={280} />
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
                <TrendingUp className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {data?.recentProjects?.length > 0 ? (
              data.recentProjects.map((project: any) => (
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
                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(project.tasksCount * 10, 100)}%` }} />
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
              data.recentTasks.map((task: any) => (
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
                      (task.status === "done" || task.status === "completed")
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

      <Card className="border shadow-sm">
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
          <div className="space-y-6">
            <div className="absolute left-[17px] top-0 bottom-0 w-px bg-border" />

            {data?.recentActivities?.length > 0 ? (
              data.recentActivities.map((activity: any) => (
                <div key={activity.id} className="flex gap-4 relative pl-8">
                  <div className="absolute left-0 top-1.5 w-[10px] h-[10px] rounded-full bg-primary border-2 border-background z-10" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">
                        {activity.user?.name || "System"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {activity.action === "created" ? "created" :
                         activity.action === "updated" ? "updated" :
                         activity.action === "deleted" ? "deleted" :
                         activity.action}
                      </span>
                      <Badge variant="outline" className="text-xs rounded-md px-2 py-0 h-5">
                        {activity.entityType}
                      </Badge>
                    </div>
                    {activity.metadata?.taskTitle && (
                      <p className="text-sm text-muted-foreground mt-1 italic">
                        &ldquo;{activity.metadata.taskTitle}&rdquo;
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
