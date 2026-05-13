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
    enabled: !!activeWorkspaceId,
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-10 space-y-10 max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="space-y-3">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-10 w-48 rounded-full" />
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-10 w-10 rounded-2xl" />
              </div>
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>

        {/* Chart skeleton */}
        <div className="glass-card rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-3 w-72" />
            </div>
          </div>
          <Skeleton className="h-[350px] w-full rounded-xl" />
        </div>

        {/* Two-column skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-6 space-y-5">
              <div className="flex justify-between items-center">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-9 w-24 rounded-xl" />
              </div>
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center gap-5 p-5 rounded-2xl bg-muted/30">
                  <Skeleton className="h-12 w-12 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-2 w-32 rounded-full" />
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
    <MotionWrapper className="p-4 sm:p-12 space-y-12 max-w-7xl mx-auto relative selection:bg-indigo-500/30">
      {/* Neural Mesh Background */}
      <div className="absolute top-0 right-0 -z-20 w-[800px] h-[800px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 left-0 -z-20 w-[600px] h-[600px] bg-purple-600/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8">
        <div className="space-y-2">
          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
            {t("dashboard")}
          </h1>
          <div className="flex items-center gap-4">
            <div className="h-1 w-12 bg-indigo-600 rounded-full" />
            <p className="text-sm font-black text-slate-500 uppercase tracking-[0.4em] opacity-80">
              Workspace Neural Core
            </p>
          </div>
        </div>
        <div className="px-6 py-3 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl rounded-2xl border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-4 shadow-2xl shadow-indigo-500/10 transition-all hover:scale-105 cursor-default group">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
          Neural Link Synchronized
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <ScaleIn key={i} delay={i * 0.1}>
            <Card className="glass-card group border-none relative overflow-hidden p-8 hover:scale-[1.02] transition-all duration-500">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 group-hover:text-indigo-500 transition-colors">
                  {stat.title}
                </span>
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-2xl group-hover:rotate-12",
                  stat.bg, stat.color
                )}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white">{stat.value}</div>
                <div className="flex items-center gap-2 text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-3 py-1.5 rounded-xl w-fit">
                  <TrendingUp className="w-3.5 h-3.5" />
                  +12.5% Velocity
                </div>
              </div>
            </Card>
          </ScaleIn>
        ))}
      </div>

      <FadeIn delay={0.4}>
        <Card className="glass-card border-none overflow-hidden relative p-10">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 via-transparent to-transparent pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-indigo-600" />
                </div>
                Performance synthesis
              </h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] ml-14">Temporal activity analysis across active workstreams</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="h-10 rounded-xl border-slate-200 dark:border-slate-800 font-black text-[10px] uppercase tracking-widest px-6">7 Days</Button>
              <Button variant="outline" className="h-10 rounded-xl border-slate-200 dark:border-slate-800 font-black text-[10px] uppercase tracking-widest px-6">30 Days</Button>
            </div>
          </div>
          
          <div className="h-[400px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={Array.isArray(data?.activityTrends) ? data.activityTrends : []}>
                <defs>
                  <linearGradient id="colorActivities" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.03} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fontWeight: 900, fill: "#94a3b8", textAnchor: "middle" }}
                  dy={15}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fontWeight: 900, fill: "#94a3b8" }}
                  dx={-10}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    borderRadius: "20px",
                    border: "1px solid rgba(99, 102, 241, 0.2)",
                    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
                    backdropBlur: "12px",
                    padding: "16px",
                  }}
                  itemStyle={{
                    fontSize: "10px",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "#fff"
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="activities"
                  stroke="#6366f1"
                  strokeWidth={6}
                  fillOpacity={1}
                  fill="url(#colorActivities)"
                  animationDuration={2500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <FadeIn delay={0.6}>
          <Card className="glass-card border-none p-10">
            <div className="flex items-center justify-between pb-10">
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{t("recent_projects")}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active workspace workstreams</p>
              </div>
              <Button variant="ghost" className="h-10 rounded-xl font-black text-[10px] uppercase tracking-widest text-indigo-600 hover:bg-indigo-600/5 px-6 transition-all group">
                {t("view_all")}
                <TrendingUp className="w-3.5 h-3.5 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </Button>
            </div>
            <div className="space-y-4">
              {data?.recentProjects?.length > 0 ? (
                data.recentProjects.map((project: any) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-6 bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 rounded-[2rem] hover:bg-white dark:hover:bg-slate-900 hover:border-indigo-500/30 transition-all duration-500 group cursor-pointer relative overflow-hidden"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 flex items-center justify-center text-xl font-black text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-sm relative z-10">
                        {project.name.charAt(0)}
                      </div>
                      <div className="relative z-10">
                        <p className="font-black text-lg tracking-tight uppercase group-hover:text-indigo-600 transition-colors">{project.name}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                          {project.tasksCount} ACTIVE PROTOCOLS
                        </p>
                      </div>
                    </div>
                    <div className="h-1.5 w-32 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative z-10">
                      <div className="h-full bg-indigo-600 rounded-full w-[65%] group-hover:w-[85%] transition-all duration-1000" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20">
                  <div className="p-6 bg-slate-100 dark:bg-slate-800/50 rounded-3xl w-fit mx-auto mb-6">
                    <FolderKanban className="w-10 h-10 text-slate-300 dark:text-slate-700" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("no_projects")}</p>
                </div>
              )}
            </div>
          </Card>
        </FadeIn>

        <FadeIn delay={0.7}>
          <Card className="glass-card border-none p-10">
            <div className="flex items-center justify-between pb-10">
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{t("priority_tasks")}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Immediate neural intervention required</p>
              </div>
              <Button variant="ghost" className="h-10 rounded-xl font-black text-[10px] uppercase tracking-widest text-indigo-600 hover:bg-indigo-600/5 px-6 transition-all">
                {t("manage")}
              </Button>
            </div>
            <div className="space-y-4">
              {data?.recentTasks?.length > 0 ? (
                data.recentTasks.map((task: any) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-6 bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 rounded-[2rem] hover:border-indigo-500/50 transition-all duration-500 cursor-pointer group relative overflow-hidden"
                  >
                    <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-6 relative z-10">
                      <div className={`w-2 h-12 rounded-full ${task.priority === 'high' ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]' : 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]'} transition-all group-hover:h-14`} />
                      <div>
                        <p className="font-black text-lg tracking-tight uppercase group-hover:text-indigo-600 transition-colors">{task.title}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                          {task.project?.name || "Global Protocol"}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "rounded-xl h-10 px-6 font-black uppercase tracking-widest text-[9px] relative z-10 transition-all duration-500 group-hover:scale-105",
                        (task.status === "done" || task.status === "completed")
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          : "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20"
                      )}
                    >
                      {task.status.replace(/[_-]/g, " ")}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-20">
                  <div className="p-6 bg-slate-100 dark:bg-slate-800/50 rounded-3xl w-fit mx-auto mb-6">
                    <CheckSquare className="w-10 h-10 text-slate-300 dark:text-slate-700" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("no_tasks")}</p>
                </div>
              )}
            </div>
          </Card>
        </FadeIn>
      </div>

      <FadeIn delay={0.8}>
        <Card className="glass-card border-none p-10 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/5 to-transparent pointer-events-none" />
          <div className="flex items-center gap-6 pb-12">
            <div className="p-4 bg-indigo-600/10 rounded-2xl shadow-xl neural-glow">
              <Activity className="h-8 w-8 text-indigo-600" />
            </div>
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Neural Event Log</h2>
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Live workspace telemetry diagnostics</p>
            </div>
          </div>
          
          <div className="space-y-10 relative">
            <div className="absolute left-7 top-4 bottom-10 w-1 bg-slate-100 dark:bg-slate-800/50 rounded-full" />

            {data?.recentActivities?.length > 0 ? (
              data.recentActivities.map((activity: any) => (
                <div key={activity.id} className="flex gap-10 relative group">
                  <div className="relative z-10 flex-shrink-0">
                    <Avatar className="h-14 w-14 ring-8 ring-white dark:ring-slate-950 shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
                      <AvatarImage src={activity.user?.imageUrl || ""} />
                      <AvatarFallback className="bg-indigo-600 text-white font-black uppercase text-xs">
                        {activity.user?.name?.[0] || 'N'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 space-y-4 bg-white/40 dark:bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800/50 group-hover:bg-white dark:group-hover:bg-slate-900 group-hover:border-indigo-500/30 transition-all duration-500 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/5 blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <p className="text-lg font-medium leading-tight">
                        <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight">
                          {activity.user?.name || "Nova Core"}
                        </span>
                        {" "}
                        <span className="text-slate-400 font-bold lowercase tracking-wide mx-2">
                          {activity.action === "created" ? "initialized" :
                            activity.action === "updated" ? "reconfigured" :
                              activity.action === "deleted" ? "purged" :
                                activity.action}
                        </span>
                        {" "}
                        <span className="font-black text-indigo-500 uppercase tracking-[0.2em] text-[9px] bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                          {activity.entityType}
                        </span>
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-black uppercase tracking-widest whitespace-nowrap bg-slate-100 dark:bg-slate-800/50 px-4 py-2 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                        <Clock className="h-3.5 w-3.5 text-indigo-500" />
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                    {activity.metadata?.taskTitle && (
                      <div className="relative">
                        <div className="absolute left-0 top-0 w-1 h-full bg-indigo-500/30 rounded-full" />
                        <p className="text-sm font-black p-5 pl-8 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 text-slate-500 dark:text-slate-400 italic leading-relaxed">
                          &quot;{activity.metadata.taskTitle}&quot;
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-24">
                <Activity className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-8 floating" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">System diagnostics clear. <br/> No recent telemetry recorded.</p>
              </div>
            )}
          </div>
        </Card>
      </FadeIn>
    </MotionWrapper>
  );
}


