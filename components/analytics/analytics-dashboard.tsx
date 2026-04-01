"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { motion } from "framer-motion";
import { 
    LineChart, Line, BarChart, Bar, 
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderKanban, ListTodo, CheckCircle2, AlertCircle, Clock, Activity, Users } from "lucide-react";

export default function AnalyticsDashboard() {
    const { activeWorkspaceId } = useWorkspace();
    const [days, setDays] = useState("30");

    const { data: analytics, isLoading } = useQuery({
        queryKey: ["analytics", activeWorkspaceId, days],
        queryFn: async () => {
            const res = await fetch(`/api/analytics?workspaceId=${activeWorkspaceId}&days=${days}`);
            if (!res.ok) throw new Error("Failed to fetch analytics");
            return res.json();
        },
        enabled: !!activeWorkspaceId
    });

    if (isLoading) {
        return (
            <div className="p-8 space-y-6">
                <Skeleton className="h-10 w-64 mb-6" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Skeleton className="h-[400px] rounded-3xl" />
                    <Skeleton className="h-[400px] rounded-3xl" />
                </div>
            </div>
        );
    }

    if (!analytics) return <div className="p-8 font-medium">No analytics data available for this workspace.</div>;

    return (
        <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto space-y-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <h1 className="text-3xl font-black uppercase tracking-tight mb-2 flex items-center gap-3">
                        <Activity className="h-8 w-8 text-primary" />
                        Workspace Analytics
                    </h1>
                    <p className="text-muted-foreground font-medium">Simple metrics to keep your team moving forward.</p>
                </motion.div>
                
                <Select value={days} onValueChange={setDays}>
                    <SelectTrigger className="w-48 rounded-xl shadow-sm bg-white dark:bg-slate-900 font-bold uppercase tracking-widest text-xs">
                        <SelectValue placeholder="Timeframe" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7">Last 7 Days</SelectItem>
                        <SelectItem value="30">Last 30 Days</SelectItem>
                        <SelectItem value="90">Last 90 Days</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-none shadow-xl shadow-indigo-500/10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all text-indigo-500"><FolderKanban className="h-12 w-12" /></div>
                    <CardContent className="p-6">
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 mt-4">Total Projects</p>
                        <p className="text-5xl font-black">{analytics?.totals?.projects || 0}</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl shadow-emerald-500/10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all text-emerald-500"><CheckCircle2 className="h-12 w-12" /></div>
                    <CardContent className="p-6">
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 mt-4">Tasks Completed</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-5xl font-black text-emerald-500">{analytics?.totals?.completedTasks || 0}</p>
                            <span className="text-sm font-bold text-muted-foreground">/ {analytics?.totals?.tasks || 0}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl shadow-amber-500/10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all text-amber-500"><ListTodo className="h-12 w-12" /></div>
                    <CardContent className="p-6">
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 mt-4">Pending Tasks</p>
                        <p className="text-5xl font-black">{analytics?.totals?.pendingTasks || 0}</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl shadow-red-500/10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all text-red-500"><AlertCircle className="h-12 w-12" /></div>
                    <CardContent className="p-6">
                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 mt-4">Overdue</p>
                        <p className="text-5xl font-black text-red-500">{analytics?.totals?.overdueTasks || 0}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Tasks Created vs Completed Chart */}
                <Card className="shadow-lg border-slate-200/50 dark:border-slate-800/50 rounded-3xl bg-white dark:bg-slate-900">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                                <Activity className="h-5 w-5 text-primary" />
                                Task Flow Velocity
                            </CardTitle>
                            <CardDescription className="text-xs font-bold uppercase tracking-widest mt-1">Creation vs Completion</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={Array.isArray(analytics?.tasksOverTime) ? analytics.tasksOverTime : []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)" }} />
                                <Line type="monotone" dataKey="created" name="Created" stroke="#8b5cf6" strokeWidth={4} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 8}} />
                                <Line type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={4} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 8}} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Team Productivity */}
                <Card className="shadow-lg border-slate-200/50 dark:border-slate-800/50 rounded-3xl bg-white dark:bg-slate-900">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-500" />
                            Team Top Performers
                        </CardTitle>
                        <CardDescription className="text-xs font-bold uppercase tracking-widest mt-1">Tasks completed per user</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px] p-0 pr-6 pl-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={Array.isArray(analytics?.teamProductivity) ? analytics.teamProductivity : []} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" opacity={0.5} />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} width={80} />
                                <Tooltip contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)" }} />
                                <Bar dataKey="tasksCompleted" name="Completed" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Most Active Projects */}
                <Card className="shadow-lg border-slate-200/50 dark:border-slate-800/50 rounded-3xl bg-white dark:bg-slate-900">
                    <CardHeader className="pb-6">
                        <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                            <FolderKanban className="h-5 w-5 text-amber-500" />
                            Most Active Projects
                        </CardTitle>
                        <CardDescription className="text-xs font-bold uppercase tracking-widest mt-1">Projects with recent task velocity</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {Array.isArray(analytics?.mostActiveProjects) && analytics.mostActiveProjects.length > 0 ? (
                            analytics.mostActiveProjects.map((project: any, i: number) => (
                                <div key={project.id} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center font-black text-slate-500 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30 group-hover:text-amber-600 transition-colors">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm tracking-tight">{project.name}</p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="font-black uppercase tracking-widest text-[10px] px-3">
                                        {project.activityCount} Activities
                                    </Badge>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-muted-foreground font-medium">No activity in the selected timeframe.</div>
                        )}
                    </CardContent>
                </Card>

                {/* Completion Rate Gauge */}
                <Card className="shadow-lg border-slate-200/50 dark:border-slate-800/50 rounded-3xl bg-indigo-600/5 dark:bg-indigo-900/10 border-indigo-200 flex flex-col items-center justify-center p-12 text-center relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 text-indigo-100 dark:text-indigo-900/30 pointer-events-none">
                        <CheckCircle2 className="h-48 w-48" />
                    </div>
                    <div className="relative z-10 w-full max-w-xs">
                        <h3 className="text-3xl font-black tracking-tight mb-2">Completion Rate</h3>
                        <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest mb-8">Overall Project Execution</p>
                        
                        <div className="text-8xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                            {analytics?.totals?.projectCompletionRate}%
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
