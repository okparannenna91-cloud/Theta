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
import { FolderKanban, ListTodo, CheckCircle2, AlertCircle, Clock, Activity, Users, Lock, Sparkles } from "lucide-react";
import { usePopups } from "@/components/popups/popup-manager";
import { Button } from "@/components/ui/button";

export default function AnalyticsDashboard() {
    const { activeWorkspaceId } = useWorkspace();
    const { showUpgradePrompt } = usePopups();
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

    const hasAccess = analytics.limits?.hasAccess !== false;

    if (!hasAccess) {
        return (
            <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto">
                <Card className="border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl py-20 flex flex-col items-center justify-center text-center shadow-xl shadow-indigo-500/5">
                    <div className="h-20 w-20 bg-indigo-100 dark:bg-indigo-900/40 rounded-3xl flex items-center justify-center mb-6 text-indigo-600 shadow-inner">
                        <Lock className="h-10 w-10" />
                    </div>
                    <Badge className="bg-indigo-600 mb-4 px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">Premium Feature</Badge>
                    <h2 className="text-3xl font-black tracking-tight mb-3">Enterprise Velocity Data</h2>
                    <p className="text-muted-foreground text-sm max-w-md mb-10 leading-relaxed font-medium">
                        Advanced analytics, team productivity mapping, and growth velocity charts are available on Growth plans and above.
                    </p>
                    <Button 
                        size="lg" 
                        className="bg-indigo-600 hover:bg-indigo-700 h-14 px-10 rounded-2xl shadow-xl shadow-indigo-500/20 font-black uppercase tracking-widest text-xs translate-y-0 hover:-translate-y-1 active:translate-y-0 transition-all duration-300"
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
        <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto space-y-12 relative selection:bg-indigo-500/30">
            {/* Neural Mesh Background */}
            <div className="absolute top-0 right-0 -z-10 w-[800px] h-[800px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none animate-pulse" />
            <div className="absolute bottom-0 left-0 -z-10 w-[600px] h-[600px] bg-purple-600/5 blur-[100px] rounded-full pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-10">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                    <h1 className="text-5xl sm:text-7xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                        Neural <span className="text-indigo-600">Analytics</span>
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className="h-1.5 w-16 bg-indigo-600 rounded-full" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] opacity-80">
                            Workspace Velocity & Performance Diagnostics
                        </p>
                    </div>
                </motion.div>
                
                <Select value={days} onValueChange={setDays}>
                    <SelectTrigger className="w-56 h-14 rounded-2xl shadow-2xl shadow-indigo-500/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border-indigo-500/20 font-black uppercase tracking-widest text-[10px]">
                        <SelectValue placeholder="Timeframe" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-indigo-500/20 bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl">
                        <SelectItem value="7">Temporal Window: 7D</SelectItem>
                        <SelectItem value="30">Temporal Window: 30D</SelectItem>
                        <SelectItem value="90">Temporal Window: 90D</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <Card className="glass-card border-none shadow-2xl shadow-indigo-500/5 rounded-[2.5rem] relative overflow-hidden group p-8">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 group-hover:scale-110 transition-all text-indigo-600"><FolderKanban className="h-16 w-16" /></div>
                    <CardContent className="p-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6">Total Projects</p>
                        <p className="text-6xl font-black tracking-tighter text-slate-900 dark:text-white">{analytics?.totals?.projects || 0}</p>
                        <div className="mt-4 flex items-center gap-2 text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-3 py-1.5 rounded-xl w-fit">
                            <Activity className="h-3 w-3" />
                            System Active
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-card border-none shadow-2xl shadow-emerald-500/5 rounded-[2.5rem] relative overflow-hidden group p-8">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 group-hover:scale-110 transition-all text-emerald-600"><CheckCircle2 className="h-16 w-16" /></div>
                    <CardContent className="p-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6">Tasks Completed</p>
                        <div className="flex items-baseline gap-3">
                            <p className="text-6xl font-black text-emerald-500 tracking-tighter">{analytics?.totals?.completedTasks || 0}</p>
                            <span className="text-sm font-black text-slate-400">/ {analytics?.totals?.tasks || 0}</span>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-500/10 px-3 py-1.5 rounded-xl w-fit">
                            <Sparkles className="h-3 w-3" />
                            Target Reached
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-card border-none shadow-2xl shadow-amber-500/5 rounded-[2.5rem] relative overflow-hidden group p-8">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 group-hover:scale-110 transition-all text-amber-600"><ListTodo className="h-16 w-16" /></div>
                    <CardContent className="p-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6">Pending Tasks</p>
                        <p className="text-6xl font-black tracking-tighter text-slate-900 dark:text-white">{analytics?.totals?.pendingTasks || 0}</p>
                        <div className="mt-4 flex items-center gap-2 text-[9px] font-black text-amber-600 uppercase tracking-widest bg-amber-500/10 px-3 py-1.5 rounded-xl w-fit">
                            <Clock className="h-3 w-3" />
                            In Progress
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-card border-none shadow-2xl shadow-red-500/5 rounded-[2.5rem] relative overflow-hidden group p-8">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 group-hover:scale-110 transition-all text-red-600"><AlertCircle className="h-16 w-16" /></div>
                    <CardContent className="p-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6">Overdue</p>
                        <p className="text-6xl font-black text-red-500 tracking-tighter">{analytics?.totals?.overdueTasks || 0}</p>
                        <div className="mt-4 flex items-center gap-2 text-[9px] font-black text-red-600 uppercase tracking-widest bg-red-500/10 px-3 py-1.5 rounded-xl w-fit">
                            <AlertCircle className="h-3 w-3" />
                            Intervention
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Tasks Created vs Completed Chart */}
                <Card className="glass-card border-none shadow-2xl shadow-indigo-500/5 rounded-[3rem] p-10">
                    <CardHeader className="p-0 mb-10 flex flex-row items-center justify-between">
                        <div className="space-y-2">
                            <CardTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-4">
                                <div className="h-10 w-10 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-600">
                                    <Activity className="h-5 w-5" />
                                </div>
                                Task Flow Velocity
                            </CardTitle>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-14">Creation vs Completion Analysis</p>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[400px] p-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={Array.isArray(analytics?.tasksOverTime) ? analytics.tasksOverTime : []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.05} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: "#94a3b8" }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: "#94a3b8" }} dx={-10} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: "24px", border: "none", backgroundColor: "rgba(15, 23, 42, 0.9)", backdropFilter: "blur(12px)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)", padding: "16px" }}
                                    itemStyle={{ fontSize: "10px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}
                                />
                                <Line type="monotone" dataKey="created" name="CREATED" stroke="#6366f1" strokeWidth={6} dot={false} activeDot={{r: 8, strokeWidth: 0, fill: "#6366f1"}} />
                                <Line type="monotone" dataKey="completed" name="COMPLETED" stroke="#10b981" strokeWidth={6} dot={false} activeDot={{r: 8, strokeWidth: 0, fill: "#10b981"}} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Team Productivity */}
                <Card className="glass-card border-none shadow-2xl shadow-indigo-500/5 rounded-[3rem] p-10">
                    <CardHeader className="p-0 mb-10">
                        <div className="space-y-2">
                            <CardTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-4">
                                <div className="h-10 w-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-600">
                                    <Users className="h-5 w-5" />
                                </div>
                                Neural Node Productivity
                            </CardTitle>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-14">Tasks completed per synchronized node</p>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[400px] p-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={Array.isArray(analytics?.teamProductivity) ? analytics.teamProductivity : []} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" opacity={0.05} />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: "#94a3b8" }} dy={10} />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: "#94a3b8" }} width={80} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: "24px", border: "none", backgroundColor: "rgba(15, 23, 42, 0.9)", backdropFilter: "blur(12px)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)", padding: "16px" }}
                                    itemStyle={{ fontSize: "10px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}
                                />
                                <Bar dataKey="tasksCompleted" name="COMPLETED" fill="#6366f1" radius={[0, 12, 12, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Most Active Projects */}
                <Card className="glass-card border-none shadow-2xl shadow-indigo-500/5 rounded-[3rem] p-10">
                    <CardHeader className="p-0 mb-10">
                        <div className="space-y-2">
                            <CardTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-4">
                                <div className="h-10 w-10 bg-amber-600/10 rounded-xl flex items-center justify-center text-amber-600">
                                    <FolderKanban className="h-5 w-5" />
                                </div>
                                Active Protocols
                            </CardTitle>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-14">Projects with peak temporal activity</p>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 p-0">
                        {Array.isArray(analytics?.mostActiveProjects) && analytics.mostActiveProjects.length > 0 ? (
                            analytics.mostActiveProjects.map((project: any, i: number) => (
                                <div key={project.id} className="flex items-center justify-between p-6 bg-white/40 dark:bg-slate-900/40 rounded-2xl border border-indigo-500/5 hover:bg-white dark:hover:bg-slate-900 transition-all duration-500 group">
                                    <div className="flex items-center gap-6">
                                        <div className="h-12 w-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center font-black text-slate-500 group-hover:bg-amber-600 group-hover:text-white transition-all duration-500">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <p className="font-black text-lg tracking-tight uppercase group-hover:text-amber-600 transition-colors">{project.name}</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-amber-500/10 text-amber-600 border-none font-black uppercase tracking-widest text-[9px] px-4 py-1.5 rounded-full">
                                        {project.activityCount} TELEMETRY NODES
                                    </Badge>
                                </div>
                            ))
                        ) : (
                            <div className="p-20 text-center text-slate-400 font-black uppercase tracking-[0.3em] text-xs italic">System diagnostics clear.</div>
                        )}
                    </CardContent>
                </Card>

                {/* Completion Rate Gauge */}
                <Card className="glass-card border-none shadow-2xl shadow-indigo-500/5 rounded-[3rem] p-10 flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 group-hover:rotate-12 transition-all duration-1000">
                        <CheckCircle2 className="h-64 w-64 text-indigo-600" />
                    </div>
                    <div className="relative z-10 text-center">
                        <h3 className="text-4xl font-black uppercase tracking-tighter mb-4 leading-none">Operational <br/> Efficiency</h3>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-12">Overall Project Execution Matrix</p>
                        
                        <div className="text-[120px] font-black text-indigo-600 tracking-tighter leading-none animate-pulse">
                            {analytics?.totals?.projectCompletionRate}%
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
