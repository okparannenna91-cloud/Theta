"use client";

import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, CheckSquare, Clock, AlertTriangle, TrendingUp, PieChart as PieChartIcon, Activity, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar
} from "recharts";

import { MotionWrapper, FadeIn, ScaleIn } from "@/components/common/motion-wrapper";

export function PortfolioPage() {
    const { activeWorkspaceId } = useWorkspace();

    const { data: projectsData, isLoading: projectsLoading } = useQuery({
        queryKey: ["projects", activeWorkspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/projects?workspaceId=${activeWorkspaceId}`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        enabled: !!activeWorkspaceId,
    });

    const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
        queryKey: ["analytics", activeWorkspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/analytics?workspaceId=${activeWorkspaceId}&days=7`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        enabled: !!activeWorkspaceId,
    });

    const projects = Array.isArray(projectsData?.projects) ? projectsData.projects : Array.isArray(projectsData) ? projectsData : [];
    const totals = analyticsData?.totals || {
        projects: projects.length,
        tasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        overdueTasks: 0,
        projectCompletionRate: 0
    };

    const isLoading = projectsLoading || analyticsLoading;

    if (isLoading) return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="space-y-4">
                <div className="h-12 w-64 bg-slate-100 dark:bg-slate-900 animate-pulse rounded-2xl" />
                <div className="h-4 w-96 bg-slate-50 dark:bg-slate-900/50 animate-pulse rounded-xl" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1,2,3].map(i => <div key={i} className="h-40 bg-slate-50 dark:bg-slate-900/50 animate-pulse rounded-[2.5rem]" />)}
            </div>
        </div>
    );

    const projectHealth = projects?.map((p: any) => {
        const completed = p.tasks?.filter((t: any) => t.status === "done" || t.status === "completed").length || 0;
        const total = p.tasks?.length || 0;
        const progress = total > 0 ? (completed / total) * 100 : 0;
        return { ...p, progress, completed, total };
    }) || [];

    // Calculate resource utilization based on team productivity vs total tasks
    const resourceUtilization = analyticsData?.teamProductivity?.length 
        ? Math.min(Math.round((totals.completedTasks / Math.max(totals.tasks, 1)) * 100) + 20, 100) 
        : 0;

    return (
        <MotionWrapper className="p-4 sm:p-10 space-y-10 max-w-7xl mx-auto">
            <div className="flex flex-col gap-3">
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-gradient">Portfolio Overview</h1>
                <p className="text-lg text-muted-foreground font-medium max-w-2xl">
                    Strategic health check of all active projects in this node.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ScaleIn delay={0.1}>
                    <Card className="bg-indigo-600 text-white border-none shadow-2xl shadow-indigo-500/20 relative overflow-hidden group rounded-[2.5rem]">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] opacity-80">Active Projects</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-5xl font-black drop-shadow-sm">{totals.projects}</div>
                            <div className="flex items-center gap-1 mt-3 px-2 py-1 bg-white/20 rounded-full w-fit text-[10px] font-bold">
                                <TrendingUp className="h-3 w-3" />
                                <span>SYSTEM NOMINAL</span>
                            </div>
                        </CardContent>
                    </Card>
                </ScaleIn>

                <ScaleIn delay={0.2}>
                    <Card className="glass-card border-slate-200/50 dark:border-white/5 rounded-[2.5rem] shadow-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Total Pipeline Tasks</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-5xl font-black">{totals.tasks}</div>
                            <div className="flex items-center gap-4 mt-3">
                                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">{totals.completedTasks} Completed</p>
                                <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">{totals.overdueTasks} Overdue</p>
                            </div>
                        </CardContent>
                    </Card>
                </ScaleIn>

                <ScaleIn delay={0.3}>
                    <Card className="glass-card border-slate-200/50 dark:border-white/5 rounded-[2.5rem] shadow-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Resource Utilization</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-5xl font-black">{resourceUtilization}%</div>
                            <div className="w-full bg-slate-100 dark:bg-slate-900 h-2.5 rounded-full mt-4 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${resourceUtilization}%` }}
                                    transition={{ duration: 1.5, delay: 0.5 }}
                                    className="bg-indigo-600 h-full rounded-full shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </ScaleIn>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Activity Trend Chart */}
                <FadeIn delay={0.4} className="lg:col-span-2">
                    <Card className="glass-card border-slate-200/50 dark:border-white/5 rounded-[2.5rem] shadow-xl h-[400px]">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-indigo-600" />
                                    Workspace Performance (Last 7 Days)
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analyticsData?.tasksOverTime || []}>
                                    <defs>
                                        <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700}} />
                                    <YAxis hide />
                                    <Tooltip 
                                      contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 700}} 
                                    />
                                    <Area 
                                      type="monotone" 
                                      dataKey="created" 
                                      name="TASKS CREATED"
                                      stroke="#6366f1" 
                                      strokeWidth={4}
                                      fillOpacity={1} 
                                      fill="url(#colorCreated)" 
                                    />
                                    <Area 
                                      type="monotone" 
                                      dataKey="completed" 
                                      name="TASKS COMPLETED"
                                      stroke="#10b981" 
                                      strokeWidth={4}
                                      fillOpacity={1} 
                                      fill="url(#colorCompleted)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </FadeIn>

                {/* Project Distribution */}
                <FadeIn delay={0.5}>
                    <Card className="glass-card border-slate-200/50 dark:border-white/5 rounded-[2.5rem] shadow-xl h-[400px]">
                        <CardHeader>
                            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                <PieChartIcon className="h-4 w-4 text-indigo-600" />
                                Portfolio Mix
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center">
                            <div className="h-[220px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={projectHealth.map((p: any) => ({ name: p.name, value: p.total || 1 }))}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={8}
                                            dataKey="value"
                                        >
                                            {projectHealth.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={["#6366f1", "#10b981", "#f59e0b", "#ef4444"][index % 4]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="w-full space-y-3 mt-4 px-4">
                                {projectHealth.slice(0, 4).map((p: any, i: number) => (
                                    <div key={p.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: ["#6366f1", "#10b981", "#f59e0b", "#ef4444"][i % 4] }} />
                                            <span className="text-[10px] font-black uppercase tracking-tighter truncate max-w-[120px]">{p.name}</span>
                                        </div>
                                        <span className="text-[10px] font-black">{p.total} Tasks</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </FadeIn>
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-4">
                        <div className="h-12 w-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center">
                            <FolderKanban className="h-6 w-6 text-indigo-600" />
                        </div>
                        Strategic Health Index
                    </h2>
                    <Badge className="bg-indigo-600 rounded-full px-4 py-1.5 font-black uppercase tracking-widest text-[9px] shadow-lg shadow-indigo-500/20">
                        {totals.projectCompletionRate}% OVERALL COMPLETION
                    </Badge>
                </div>

                <div className="grid grid-cols-1 gap-5 pb-20">
                    {projectHealth.map((project: any, i: number) => (
                        <FadeIn
                            key={project.id}
                            delay={0.4 + (i * 0.1)}
                        >
                            <Card className="glass-card border-slate-200/50 dark:border-white/5 rounded-[3rem] group overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-700">
                                <CardContent className="p-0">
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between p-8 gap-8">
                                        <div className="flex items-center gap-6 min-w-[300px]">
                                            <div className="h-20 w-20 rounded-[2rem] bg-slate-50 dark:bg-slate-900 flex items-center justify-center group-hover:bg-indigo-600 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-inner">
                                                <FolderKanban className="h-10 w-10 text-slate-400 group-hover:text-white transition-colors duration-500" />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-2xl tracking-tighter mb-1.5 group-hover:text-indigo-600 transition-colors">{project.name}</h3>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground line-clamp-1">{project.description || "Foundational intelligence module"}</p>
                                            </div>
                                        </div>
 
                                        <div className="flex-1 max-w-md space-y-4">
                                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                <span className="flex items-center gap-2">
                                                    <Activity className="h-3 w-3 text-indigo-600" />
                                                    Velocity Tracking
                                                </span>
                                                <span className="text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full">{Math.round(project.progress)}%</span>
                                            </div>
                                            <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-white/5">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${project.progress}%` }}
                                                    transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                                                    className="h-full bg-indigo-600 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.5)] relative overflow-hidden"
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                                                </motion.div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-10 min-w-[240px] justify-end">
                                            <div className="text-right">
                                                <div className="text-3xl font-black tracking-tighter">{project.total}</div>
                                                <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-1">Intelligence Nodes</div>
                                            </div>
                                            <Badge variant={project.progress > 75 ? "default" : "secondary"} className={cn(
                                                "rounded-[1.25rem] h-12 px-8 font-black uppercase tracking-widest text-[9px] shadow-lg transition-all",
                                                project.progress > 75 ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20" : 
                                                project.progress > 40 ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20" : 
                                                "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
                                            )}>
                                                {project.progress > 75 ? "Optimal" : project.progress > 40 ? "Steady" : "Critical"}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </FadeIn>
                    ))}
                </div>
            </div>
        </MotionWrapper>
    );
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(" ");
}


