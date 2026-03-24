"use client";

import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, CheckSquare, Clock, AlertTriangle, TrendingUp, PieChart as PieChartIcon, Activity } from "lucide-react";
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

    const { data: projects, isLoading } = useQuery({
        queryKey: ["projects", activeWorkspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/projects?workspaceId=${activeWorkspaceId}`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        enabled: !!activeWorkspaceId,
    });

    if (isLoading) return <div className="p-8 animate-pulse text-muted-foreground font-medium">Loading Portfolio...</div>;

    const totalTasks = projects?.reduce((acc: number, p: any) => acc + (p._count?.tasks || 0), 0) || 0;
    const projectHealth = projects?.map((p: any) => {
        const completed = p.tasks?.filter((t: any) => t.status === "done").length || 0;
        const total = p.tasks?.length || 0;
        const progress = total > 0 ? (completed / total) * 100 : 0;
        return { ...p, progress, completed, total };
    }) || [];

    return (
        <MotionWrapper className="p-4 sm:p-10 space-y-10 max-w-7xl mx-auto">
            <div className="flex flex-col gap-3">
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-gradient">Portfolio Overview</h1>
                <p className="text-lg text-muted-foreground font-medium max-w-2xl">
                    Strategic health check of all active projects in {activeWorkspaceId ? "this workspace" : "all workspaces"}.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ScaleIn delay={0.1}>
                    <Card className="bg-primary text-white border-none shadow-2xl shadow-primary/20 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] opacity-80">Active Projects</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-5xl font-black drop-shadow-sm">{projects?.length || 0}</div>
                            <div className="flex items-center gap-1 mt-3 px-2 py-1 bg-white/20 rounded-full w-fit text-[10px] font-bold">
                                <TrendingUp className="h-3 w-3" />
                                <span>12% INCREASE</span>
                            </div>
                        </CardContent>
                    </Card>
                </ScaleIn>

                <ScaleIn delay={0.2}>
                    <Card className="glass-card">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Total Pipeline Tasks</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-5xl font-black">{totalTasks}</div>
                            <p className="text-[10px] text-muted-foreground font-bold mt-3 uppercase tracking-wider">Across {projects?.length || 0} projects</p>
                        </CardContent>
                    </Card>
                </ScaleIn>

                <ScaleIn delay={0.3}>
                    <Card className="glass-card">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Resource Utilization</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-5xl font-black">84%</div>
                            <div className="w-full bg-secondary h-2.5 rounded-full mt-4 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: "84%" }}
                                    transition={{ duration: 1.5, delay: 0.5 }}
                                    className="bg-primary h-full rounded-full"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </ScaleIn>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Activity Trend Chart */}
                <FadeIn delay={0.4} className="lg:col-span-2">
                    <Card className="glass-card h-[400px]">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-primary" />
                                    Workspace Performance
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={[
                                    { day: "Mon", tasks: 12 }, { day: "Tue", tasks: 19 }, { day: "Wed", tasks: 15 },
                                    { day: "Thu", tasks: 22 }, { day: "Fri", tasks: 30 }, { day: "Sat", tasks: 18 },
                                    { day: "Sun", tasks: 10 }
                                ]}>
                                    <defs>
                                        <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                                    <YAxis hide />
                                    <Tooltip 
                                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px'}} 
                                    />
                                    <Area 
                                      type="monotone" 
                                      dataKey="tasks" 
                                      stroke="#8b5cf6" 
                                      strokeWidth={3}
                                      fillOpacity={1} 
                                      fill="url(#colorTasks)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </FadeIn>

                {/* Project Distribution */}
                <FadeIn delay={0.5}>
                    <Card className="glass-card h-[400px]">
                        <CardHeader>
                            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                <PieChartIcon className="h-4 w-4 text-primary" />
                                Project Velocity
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center">
                            <div className="h-[220px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={projectHealth.map((p: any) => ({ name: p.name, value: p.progress || 10 }))}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {projectHealth.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b"][index % 4]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="w-full space-y-2 mt-4">
                                {projectHealth.slice(0, 3).map((p: any, i: number) => (
                                    <div key={p.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: ["#8b5cf6", "#3b82f6", "#10b981"][i % 3] }} />
                                            <span className="text-[10px] font-bold truncate max-w-[100px]">{p.name}</span>
                                        </div>
                                        <span className="text-[10px] font-black">{Math.round(p.progress)}%</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </FadeIn>
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <FolderKanban className="h-6 w-6 text-primary" />
                        </div>
                        Project Statuses
                    </h2>
                </div>

                <div className="grid grid-cols-1 gap-5">
                    {projectHealth.map((project: any, i: number) => (
                        <FadeIn
                            key={project.id}
                            delay={0.4 + (i * 0.1)}
                        >
                            <Card className="glass-card border-slate-200/50 dark:border-white/5 group overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between p-7 gap-6">
                                        <div className="flex items-center gap-5 min-w-[250px]">
                                            <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                                <FolderKanban className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-all duration-300" />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-xl mb-1">{project.name}</h3>
                                                <p className="text-sm text-muted-foreground line-clamp-1">{project.description || "No description provided."}</p>
                                            </div>
                                        </div>

                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-muted-foreground">
                                                <span>Overall Completion</span>
                                                <span className="text-primary">{Math.round(project.progress)}%</span>
                                            </div>
                                            <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${project.progress}%` }}
                                                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                                                    className="h-full bg-primary shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-10 min-w-[200px] justify-end">
                                            <div className="text-center">
                                                <div className="text-2xl font-black">{project.total}</div>
                                                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Tasks</div>
                                            </div>
                                            <Badge variant={project.progress > 75 ? "default" : "secondary"} className="rounded-xl h-10 px-6 font-black uppercase tracking-widest text-[10px] shadow-sm">
                                                {project.progress > 75 ? "On Track" : project.progress > 40 ? "Steady" : "At Risk"}
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

