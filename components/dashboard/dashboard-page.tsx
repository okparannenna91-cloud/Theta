"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, CheckSquare, Users, TrendingUp, Activity, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

import { useWorkspace } from "@/hooks/use-workspace";

async function fetchDashboardData(workspaceId: string | null) {
  const url = workspaceId ? `/api/dashboard?workspaceId=${workspaceId}` : "/api/dashboard";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch dashboard data");
  return res.json();
}

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";


import { MotionWrapper, FadeIn, ScaleIn } from "@/components/common/motion-wrapper";
import { useI18n } from "@/lib/i18n";

export default function DashboardPage() {
  const { t } = useI18n();
  const { activeWorkspaceId } = useWorkspace();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", activeWorkspaceId],
    queryFn: () => fetchDashboardData(activeWorkspaceId),
    refetchInterval: 5000,
    enabled: !!activeWorkspaceId,
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-10 space-y-8 max-w-7xl mx-auto">
        <Skeleton className="h-12 w-64 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full rounded-2xl" />
      </div>
    );
  }

  const stats = [
    {
      title: t("projects"),
      value: data?.projectsCount || 0,
      icon: FolderKanban,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
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
    <MotionWrapper className="p-4 sm:p-10 space-y-10 max-w-7xl mx-auto relative">
      {/* Dynamic Background Element */}
      <div className="absolute top-0 right-0 -z-10 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 -z-10 w-[400px] h-[400px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-gradient">
            {t("dashboard")}
          </h1>
          <p className="text-lg text-muted-foreground mt-2 font-medium">
            {t("welcome")}
          </p>
        </div>
        <div className="px-5 py-2.5 glass rounded-full border border-primary/20 text-primary text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3 shadow-lg shadow-primary/5">
          <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          {t("live_updates_active")}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <ScaleIn key={i} delay={i * 0.1}>
            <Card className="glass-card group border-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2.5 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-all duration-300 shadow-sm`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black tracking-tight">{stat.value}</div>
                <div className="flex items-center gap-1.5 mt-2.5 text-[10px] font-black text-emerald-500 uppercase tracking-wider">
                  <TrendingUp className="w-3.5 h-3.5" />
                  +12.5% INCREMENTAL
                </div>
              </CardContent>
            </Card>
          </ScaleIn>
        ))}
      </div>

      <FadeIn delay={0.4}>
        <Card className="glass-card border-none overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl font-black tracking-tight">
              <div className="p-2 bg-primary/10 rounded-xl">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              Project Performance Trends
            </CardTitle>
            <CardDescription className="text-sm font-medium">Daily task completion rate across all workspaces</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.activityTrends}>
                  <defs>
                    <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.05} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 700, fill: "currentColor", opacity: 0.5 }}
                    dy={15}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 700, fill: "currentColor", opacity: 0.5 }}
                    dx={-10}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderRadius: "16px",
                      border: "1px solid hsl(var(--border) / 0.5)",
                      boxShadow: "0 20px 40px -10px rgba(0,0,0,0.1)",
                      fontWeight: 800,
                      fontSize: "12px"
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="tasks"
                    stroke="hsl(var(--primary))"
                    strokeWidth={5}
                    fillOpacity={1}
                    fill="url(#colorTasks)"
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <FadeIn delay={0.6}>
          <Card className="glass-card border-none">
            <CardHeader className="flex flex-row items-center justify-between pb-6">
              <div>
                <CardTitle className="text-xl font-black tracking-tight">{t("recent_projects")}</CardTitle>
                <CardDescription className="font-medium text-xs">Track your active workstreams</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl border-primary/20 text-primary font-black uppercase tracking-wider text-[10px] h-9 px-4 hover:bg-primary/5">
                {t("view_all")}
              </Button>
            </CardHeader>
            <CardContent>
              {data?.recentProjects?.length > 0 ? (
                <div className="space-y-4">
                  {data.recentProjects.map((project: any) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-5 glass rounded-2xl hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all duration-300 group cursor-pointer border-transparent hover:border-primary/20 border"
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-xl font-black group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm">
                          {project.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-lg">{project.name}</p>
                          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                            {project.tasksCount} {t("active_tasks")}
                          </p>
                        </div>
                      </div>
                      <div className="h-2 w-32 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full w-[65%] group-hover:scale-x-105 origin-left transition-transform duration-500" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="p-4 bg-secondary rounded-full w-fit mx-auto mb-6">
                    <FolderKanban className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                  <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">{t("no_projects")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.7}>
          <Card className="glass-card border-none">
            <CardHeader className="flex flex-row items-center justify-between pb-6">
              <div>
                <CardTitle className="text-xl font-black tracking-tight">{t("priority_tasks")}</CardTitle>
                <CardDescription className="font-medium text-xs">Items that require immediate attention</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl border-primary/20 text-primary font-black uppercase tracking-wider text-[10px] h-9 px-4 hover:bg-primary/5">
                {t("manage")}
              </Button>
            </CardHeader>
            <CardContent>
              {data?.recentTasks?.length > 0 ? (
                <div className="space-y-4">
                  {data.recentTasks.map((task: any) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-5 border border-primary/5 glass rounded-2xl hover:border-primary/40 transition-all duration-300 cursor-pointer group"
                    >
                      <div className="flex items-center gap-5">
                        <div className={`w-1.5 h-10 rounded-full ${task.priority === 'high' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]' : 'bg-amber-500'}`} />
                        <div>
                          <p className="font-black text-lg group-hover:text-primary transition-colors">{task.title}</p>
                          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                            {task.project?.name}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`rounded-xl h-8 px-4 font-black uppercase tracking-widest text-[10px] ${task.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-600 border-none"
                          : "bg-amber-500/10 text-amber-600 border-none"
                          }`}
                      >
                        {task.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="p-4 bg-secondary rounded-full w-fit mx-auto mb-6">
                    <CheckSquare className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                  <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">{t("no_tasks")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      <FadeIn delay={0.8}>
        <Card className="glass-card border-none">
          <CardHeader className="flex flex-row items-center gap-4 pb-8">
            <div className="p-3 bg-primary/10 rounded-2xl shadow-sm">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-black tracking-tight">Recent Activity</CardTitle>
              <CardDescription className="text-sm font-medium">Live updates from your workspace</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {data?.recentActivities?.length > 0 ? (
              <div className="space-y-8 relative">
                {/* Timeline Line */}
                <div className="absolute left-6 top-2 bottom-6 w-0.5 bg-secondary -z-0" />

                {data.recentActivities.map((activity: any, idx: number) => (
                  <div key={activity.id} className="flex gap-6 relative group">
                    <Avatar className="h-12 w-12 shrink-0 ring-4 ring-background shadow-xl z-10 group-hover:scale-110 transition-transform duration-300">
                      <AvatarImage src={activity.user?.imageUrl || ""} />
                      <AvatarFallback className="bg-primary text-white font-black">{activity.user?.name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2 bg-secondary/30 p-5 rounded-2xl group-hover:bg-secondary/50 transition-colors duration-300 border border-transparent hover:border-primary/10">
                      <p className="text-base font-medium">
                        <span className="font-black text-foreground">
                          {activity.user?.name || "System"}
                        </span>
                        {" "}
                        <span className="text-muted-foreground font-bold">
                          {activity.action === "created" ? "created a new" :
                            activity.action === "updated" ? "updated a" :
                              activity.action === "deleted" ? "deleted a" :
                                activity.action}
                        </span>
                        {" "}
                        <span className="font-black text-primary uppercase tracking-widest text-xs bg-primary/10 px-2 py-0.5 rounded-md">
                          {activity.entityType}
                        </span>
                      </p>
                      {activity.metadata?.taskTitle && (
                        <p className="text-sm font-black p-3 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-primary/10 shadow-sm text-muted-foreground italic">
                          "{activity.metadata.taskTitle}"
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="p-4 bg-secondary rounded-full w-fit mx-auto mb-6">
                  <Activity className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">No recent activity found.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </MotionWrapper>
  );
}


