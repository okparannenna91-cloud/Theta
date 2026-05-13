"use client";

import { useQuery } from "@tanstack/react-query";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    Treemap,
    Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Users, CheckCircle2, LayoutGrid } from "lucide-react";
import { MotionWrapper, FadeIn } from "@/components/common/motion-wrapper";

const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function AnalyticsDashboard({ workspaceId }: { workspaceId: string }) {
    const { data, isLoading } = useQuery({
        queryKey: ["analytics", workspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/analytics?workspaceId=${workspaceId}`);
            if (!res.ok) throw new Error("Failed to fetch analytics");
            return res.json();
        }
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-[300px] w-full rounded-xl" />
                ))}
            </div>
        );
    }

    // ✅ NUCLEAR FIX: all data accesses have safe array fallbacks
    const activityData = Array.isArray(data?.activityData) ? data.activityData : [];
    const statusData = Array.isArray(data?.statusData) ? data.statusData : 
                       Array.isArray(data?.statusDistribution) ? data.statusDistribution : [];
    const projectData = Array.isArray(data?.projectData) ? data.projectData : [];
    const treemapChildren = Array.isArray(data?.treemapData?.children) ? data.treemapData.children :
                            Array.isArray(data?.workspaceStructure?.[0]?.children) ? data.workspaceStructure[0].children : [];

    return (
        <div className="space-y-12 animate-in fade-in duration-1000">
            {/* Top Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "Neural Velocity", value: "+12.5%", sub: "Signal strength increasing", icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-600/5" },
                    { label: "Active Nodes", value: "842", sub: "Operational efficiency 98%", icon: LayoutGrid, color: "text-emerald-600", bg: "bg-emerald-600/5" },
                    { label: "Process Sync", value: "Synchronized", sub: "Global grid latency 12ms", icon: CheckCircle2, color: "text-amber-600", bg: "bg-amber-600/5" },
                    { label: "Node Density", value: "High", sub: "Optimizing transmission", icon: Users, color: "text-purple-600", bg: "bg-purple-600/5" },
                ].map((stat, i) => (
                    <FadeIn key={i} delay={i * 0.1}>
                        <Card className="glass-card border-none rounded-[2rem] bg-slate-50/30 dark:bg-slate-900/30 backdrop-blur-3xl overflow-hidden group hover:bg-white/40 dark:hover:bg-slate-900/40 transition-all duration-700">
                            <CardContent className="p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <div className={cn("p-3 rounded-xl", stat.bg)}>
                                        <stat.icon className={cn("h-5 w-5", stat.color)} />
                                    </div>
                                    <div className="h-1 w-8 bg-slate-200 dark:bg-slate-800 rounded-full" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{stat.label}</p>
                                    <h4 className="text-3xl font-black uppercase tracking-tighter">{stat.value}</h4>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-2">{stat.sub}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </FadeIn>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Activity Line Chart */}
                <FadeIn delay={0.4}>
                    <Card className="glass-card border-none rounded-[3rem] bg-slate-50/20 dark:bg-slate-900/20 backdrop-blur-3xl p-10 sm:p-12 overflow-hidden shadow-2xl">
                        <CardHeader className="px-0 pt-0 pb-12">
                            <div className="flex items-center gap-6">
                                <div className="h-14 w-14 rounded-2xl bg-indigo-600/5 flex items-center justify-center border border-indigo-500/10">
                                    <TrendingUp className="h-6 w-6 text-indigo-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-black uppercase tracking-tighter">Transmission Trends</CardTitle>
                                    <CardDescription className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Real-time signal analysis (7 Days)</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="h-[350px] px-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={activityData}>
                                    <defs>
                                        <linearGradient id="colorAct" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                                    <XAxis 
                                        dataKey="date" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 9, fontWeight: 900, fill: "#94a3b8" }} 
                                        dy={15}
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 9, fontWeight: 900, fill: "#94a3b8" }} 
                                        dx={-15}
                                    />
                                    <Tooltip
                                        contentStyle={{ 
                                            borderRadius: '20px', 
                                            border: 'none', 
                                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                            backdropFilter: 'blur(10px)',
                                            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                                            color: '#fff',
                                            padding: '15px'
                                        }}
                                        itemStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="activities"
                                        stroke="#4f46e5"
                                        strokeWidth={4}
                                        dot={{ r: 0 }}
                                        activeDot={{ r: 6, fill: "#4f46e5", strokeWidth: 4, stroke: "#fff" }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </FadeIn>

                {/* Status Bar Chart */}
                <FadeIn delay={0.5}>
                    <Card className="glass-card border-none rounded-[3rem] bg-slate-50/20 dark:bg-slate-900/20 backdrop-blur-3xl p-10 sm:p-12 overflow-hidden shadow-2xl">
                        <CardHeader className="px-0 pt-0 pb-12">
                            <div className="flex items-center gap-6">
                                <div className="h-14 w-14 rounded-2xl bg-emerald-500/5 flex items-center justify-center border border-emerald-500/10">
                                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-black uppercase tracking-tighter">Node Distribution</CardTitle>
                                    <CardDescription className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Operational state breakdown</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="h-[350px] px-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={statusData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 9, fontWeight: 900, fill: "#94a3b8" }} 
                                        dy={15}
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 9, fontWeight: 900, fill: "#94a3b8" }} 
                                        dx={-15}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(79, 70, 229, 0.05)' }}
                                        contentStyle={{ 
                                            borderRadius: '20px', 
                                            border: 'none', 
                                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                            backdropFilter: 'blur(10px)',
                                            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                                            color: '#fff',
                                            padding: '15px'
                                        }}
                                    />
                                    <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#10b981" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </FadeIn>

                {/* Resource Allocation Pie Chart */}
                <FadeIn delay={0.6}>
                    <Card className="glass-card border-none rounded-[3rem] bg-slate-50/20 dark:bg-slate-900/20 backdrop-blur-3xl p-10 sm:p-12 overflow-hidden shadow-2xl">
                        <CardHeader className="px-0 pt-0 pb-12">
                            <div className="flex items-center gap-6">
                                <div className="h-14 w-14 rounded-2xl bg-purple-500/5 flex items-center justify-center border border-purple-500/10">
                                    <Users className="h-6 w-6 text-purple-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-black uppercase tracking-tighter">Sector Allocation</CardTitle>
                                    <CardDescription className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Workload density map</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="h-[350px] px-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={projectData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={110}
                                        paddingAngle={10}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {projectData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ 
                                            borderRadius: '20px', 
                                            border: 'none', 
                                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                            backdropFilter: 'blur(10px)',
                                            padding: '15px'
                                        }}
                                    />
                                    <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '40px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </FadeIn>

                {/* Workspace Treemap */}
                <FadeIn delay={0.7}>
                    <Card className="glass-card border-none rounded-[3rem] bg-slate-50/20 dark:bg-slate-900/20 backdrop-blur-3xl p-10 sm:p-12 overflow-hidden shadow-2xl">
                        <CardHeader className="px-0 pt-0 pb-12">
                            <div className="flex items-center gap-6">
                                <div className="h-14 w-14 rounded-2xl bg-orange-500/5 flex items-center justify-center border border-orange-500/10">
                                    <LayoutGrid className="h-6 w-6 text-orange-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-black uppercase tracking-tighter">Matrix Topology</CardTitle>
                                    <CardDescription className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Visual resource distribution</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="h-[350px] px-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <Treemap
                                    data={treemapChildren}
                                    dataKey="size"
                                    aspectRatio={16 / 9}
                                    stroke="#fff"
                                    fill="#4f46e5"
                                    className="rounded-3xl overflow-hidden"
                                >
                                    <Tooltip 
                                        contentStyle={{ 
                                            borderRadius: '20px', 
                                            border: 'none', 
                                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                            backdropFilter: 'blur(10px)',
                                            padding: '15px'
                                        }}
                                    />
                                </Treemap>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </FadeIn>
            </div>
        </div>
    );
}
