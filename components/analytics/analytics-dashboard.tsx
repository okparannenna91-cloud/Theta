"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

const LineChart = dynamic(() => import("recharts").then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then(m => m.Line), { ssr: false });
const BarChart = dynamic(() => import("recharts").then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderKanban, ListTodo, CheckCircle2, AlertCircle, Clock, Activity, Users, Lock, Sparkles, Download } from "lucide-react";
import { usePopups } from "@/components/popups/popup-manager";
import { Button } from "@/components/ui/button";

export default function AnalyticsDashboard() {
    const { activeWorkspaceId } = useWorkspace();
    const { showUpgradePrompt } = usePopups();
    const [days, setDays] = useState("30");

    const { data: analytics, isLoading, error: analyticsError } = useQuery({
        queryKey: ["analytics", activeWorkspaceId, days],
        queryFn: async () => {
            const res = await fetch(`/api/analytics?workspaceId=${activeWorkspaceId}&days=${days}`);
            if (!res.ok) throw new Error("Failed to fetch analytics");
            return res.json();
        },
        enabled: !!activeWorkspaceId
    });

    if (analyticsError) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
                <div className="h-16 w-16 bg-red-100 dark:bg-red-900/20 rounded-3xl flex items-center justify-center mb-4 text-red-500">
                    <AlertCircle className="h-8 w-8" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Analytics Error</h2>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                    Failed to load analytics data. Please try refreshing the page or check your workspace connection.
                </p>
            </div>
        );
    }

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

    const hasAccess = analytics.limits?.hasAccess !== false;

    if (!hasAccess) {
        return (
            <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto">
                <Card className="border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl py-20 flex flex-col items-center justify-center text-center shadow-xl shadow-primary/5">
                    <div className="h-20 w-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6 text-primary shadow-inner">
                        <Lock className="h-10 w-10" />
                    </div>
                    <Badge className="bg-primary mb-4 px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">Premium Feature</Badge>
                    <h2 className="text-3xl font-black tracking-tight mb-3">Enterprise Velocity Data</h2>
                    <p className="text-muted-foreground text-sm max-w-md mb-10 leading-relaxed font-medium">
                        Advanced analytics, team productivity mapping, and growth velocity charts are available on Growth plans and above.
                    </p>
                    <Button 
                        size="lg" 
                        className="bg-primary hover:bg-primary/90 h-14 px-10 rounded-2xl shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-xs translate-y-0 hover:-translate-y-1 active:translate-y-0 transition-all duration-300"
                        onClick={() => showUpgradePrompt("advanced_analytics")}
                    >
                        <Sparkles className="h-5 w-5 mr-3" />
                        Upgrade to Growth
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto space-y-12 relative selection:bg-primary/30">
            {/* Background */}
            <div className="absolute top-0 right-0 -z-10 w-[800px] h-[800px] bg-primary/5 blur-[120px] rounded-full pointer-events-none animate-pulse" />
            <div className="absolute bottom-0 left-0 -z-10 w-[600px] h-[600px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-10">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight text-foreground leading-none">
                        Analytics
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className="h-1 w-12 bg-primary rounded-full" />
                        <p className="text-xs text-muted-foreground">
                            Workspace performance and activity
                        </p>
                    </div>
                </motion.div>
                
                <div className="flex items-center gap-3">
                    <Select value={days} onValueChange={setDays}>
                        <SelectTrigger className="w-44 h-10 rounded-lg">
                            <SelectValue placeholder="Timeframe" />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg">
                            <SelectItem value="7">Last 7 days</SelectItem>
                            <SelectItem value="30">Last 30 days</SelectItem>
                            <SelectItem value="90">Last 90 days</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="h-10 gap-2" onClick={() => window.open(`/api/export?workspaceId=${activeWorkspaceId}&format=csv`, "_blank")}>
                        <Download className="h-4 w-4" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-card shadow-sm rounded-lg">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Projects</p>
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <FolderKanban className="h-4 w-4 text-primary" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-foreground">{analytics?.totals?.projects || 0}</p>
                    </CardContent>
                </Card>

                <Card className="bg-card shadow-sm rounded-lg">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tasks Completed</p>
                            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-emerald-500">{analytics?.totals?.completedTasks || 0}</p>
                            <span className="text-sm text-muted-foreground">/ {analytics?.totals?.tasks || 0}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card shadow-sm rounded-lg">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending Tasks</p>
                            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                <ListTodo className="h-4 w-4 text-amber-500" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-foreground">{analytics?.totals?.pendingTasks || 0}</p>
                    </CardContent>
                </Card>

                <Card className="bg-card shadow-sm rounded-lg">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Overdue</p>
                            <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                                <AlertCircle className="h-4 w-4 text-red-500" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-red-500">{analytics?.totals?.overdueTasks || 0}</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tasks Created vs Completed Chart */}
                <Card className="bg-card shadow-sm rounded-lg">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Activity className="h-4 w-4 text-primary" />
                            Task Activity
                        </CardTitle>
                        <CardDescription>Tasks created vs completed over time</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={Array.isArray(analytics?.tasksOverTime) ? analytics.tasksOverTime : []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} dx={-10} />
                                <Tooltip />
                                <Line type="monotone" dataKey="created" name="Created" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Team Productivity */}
                <Card className="bg-card shadow-sm rounded-lg">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            Team Productivity
                        </CardTitle>
                        <CardDescription>Tasks completed per team member</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={Array.isArray(analytics?.teamProductivity) ? analytics.teamProductivity : []} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" opacity={0.1} />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} dy={10} />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} width={80} />
                                <Tooltip />
                                <Bar dataKey="tasksCompleted" name="Completed" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Most Active Projects */}
                <Card className="bg-card shadow-sm rounded-lg">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <FolderKanban className="h-4 w-4 text-primary" />
                            Most Active Projects
                        </CardTitle>
                        <CardDescription>Projects sorted by activity level</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {Array.isArray(analytics?.mostActiveProjects) && analytics.mostActiveProjects.length > 0 ? (
                            analytics.mostActiveProjects.map((project: any, i: number) => (
                                <div key={project.id} className="flex items-center justify-between py-3 border-b last:border-0">
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-muted-foreground w-6">{i + 1}</span>
                                        <p className="text-sm font-medium">{project.name}</p>
                                    </div>
                                    <Badge variant="secondary">{project.activityCount} activities</Badge>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground py-8 text-center">No activity data available.</p>
                        )}
                    </CardContent>
                </Card>

                {/* Completion Rate */}
                <Card className="bg-card shadow-sm rounded-lg">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Completion Rate</CardTitle>
                        <CardDescription>Overall project completion rate</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center py-8">
                        <div className="text-center">
                            <div className="text-6xl font-bold text-primary">
                                {analytics?.totals?.projectCompletionRate}%
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">of tasks completed</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
