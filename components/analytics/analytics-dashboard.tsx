"use client";

import { useWorkspace } from "@/hooks/use-workspace";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity } from "lucide-react";
import { PostHogInsights } from "@/components/analytics/posthog-insights";
import { PostHogChart } from "@/components/analytics/posthog-chart";

export default function AnalyticsDashboard() {
    const { activeWorkspaceId } = useWorkspace();

    return (
        <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto space-y-12 relative selection:bg-indigo-500/30">
            <div className="absolute top-0 right-0 -z-10 w-[800px] h-[800px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none animate-pulse" />
            <div className="absolute bottom-0 left-0 -z-10 w-[600px] h-[600px] bg-purple-600/5 blur-[100px] rounded-full pointer-events-none" />

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                <h1 className="text-5xl sm:text-7xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                    PostHog <span className="text-indigo-600">Analytics</span>
                </h1>
                <div className="flex items-center gap-4">
                    <div className="h-1.5 w-16 bg-indigo-600 rounded-full" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] opacity-80">
                        Event-Driven Workspace Intelligence
                    </p>
                </div>
            </motion.div>

            <PostHogInsights />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <Card className="glass-card border-none shadow-2xl shadow-indigo-500/5 rounded-[3rem] p-10">
                    <CardHeader className="p-0 mb-10">
                        <div className="space-y-2">
                            <CardTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-4">
                                <div className="h-10 w-10 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-600">
                                    <Activity className="h-5 w-5" />
                                </div>
                                Task Creation Trend
                            </CardTitle>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-14">PostHog event data (30 days)</p>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[400px] p-0">
                        <PostHogChart event="task_created" since="-30d" type="bar" height={350} />
                    </CardContent>
                </Card>

                <Card className="glass-card border-none shadow-2xl shadow-indigo-500/5 rounded-[3rem] p-10">
                    <CardHeader className="p-0 mb-10">
                        <div className="space-y-2">
                            <CardTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-4">
                                <div className="h-10 w-10 bg-emerald-600/10 rounded-xl flex items-center justify-center text-emerald-600">
                                    <Activity className="h-5 w-5" />
                                </div>
                                Task Completion Trend
                            </CardTitle>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-14">PostHog event data (30 days)</p>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[400px] p-0">
                        <PostHogChart event="task_completed" since="-30d" type="bar" height={350} />
                    </CardContent>
                </Card>

                <Card className="glass-card border-none shadow-2xl shadow-indigo-500/5 rounded-[3rem] p-10">
                    <CardHeader className="p-0 mb-10">
                        <div className="space-y-2">
                            <CardTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-4">
                                <div className="h-10 w-10 bg-violet-600/10 rounded-xl flex items-center justify-center text-violet-600">
                                    <Activity className="h-5 w-5" />
                                </div>
                                AI Usage
                            </CardTitle>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-14">Nova AI interaction events</p>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[400px] p-0">
                        <PostHogChart event="ai_used" since="-30d" type="area" height={350} />
                    </CardContent>
                </Card>

                <Card className="glass-card border-none shadow-2xl shadow-indigo-500/5 rounded-[3rem] p-10">
                    <CardHeader className="p-0 mb-10">
                        <div className="space-y-2">
                            <CardTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-4">
                                <div className="h-10 w-10 bg-amber-600/10 rounded-xl flex items-center justify-center text-amber-600">
                                    <Activity className="h-5 w-5" />
                                </div>
                                Project Creation
                            </CardTitle>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-14">New projects over time</p>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[400px] p-0">
                        <PostHogChart event="project_created" since="-30d" type="area" height={350} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
