"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Activity } from "lucide-react";
import { FadeIn } from "@/components/common/motion-wrapper";
import { PostHogInsights } from "@/components/analytics/posthog-insights";
import { PostHogChart } from "@/components/analytics/posthog-chart";

export function AnalyticsDashboard({ workspaceId }: { workspaceId: string }) {
    return (
        <div className="space-y-12 animate-in fade-in duration-1000">
            <PostHogInsights />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <FadeIn delay={0.4}>
                    <Card className="glass-card border-none rounded-[3rem] bg-slate-50/20 dark:bg-slate-900/20 backdrop-blur-3xl p-10 sm:p-12 overflow-hidden shadow-2xl">
                        <CardHeader className="px-0 pt-0 pb-12">
                            <div className="flex items-center gap-6">
                                <div className="h-14 w-14 rounded-2xl bg-indigo-600/5 flex items-center justify-center border border-indigo-500/10">
                                    <TrendingUp className="h-6 w-6 text-indigo-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-black uppercase tracking-tighter">Task Creation</CardTitle>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">PostHog event trend (30d)</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="h-[350px] px-0">
                            <PostHogChart event="task_created" since="-30d" type="bar" height={300} />
                        </CardContent>
                    </Card>
                </FadeIn>

                <FadeIn delay={0.5}>
                    <Card className="glass-card border-none rounded-[3rem] bg-slate-50/20 dark:bg-slate-900/20 backdrop-blur-3xl p-10 sm:p-12 overflow-hidden shadow-2xl">
                        <CardHeader className="px-0 pt-0 pb-12">
                            <div className="flex items-center gap-6">
                                <div className="h-14 w-14 rounded-2xl bg-emerald-500/5 flex items-center justify-center border border-emerald-500/10">
                                    <Activity className="h-6 w-6 text-emerald-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-black uppercase tracking-tighter">Task Completion</CardTitle>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">PostHog event trend (30d)</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="h-[350px] px-0">
                            <PostHogChart event="task_completed" since="-30d" type="bar" height={300} />
                        </CardContent>
                    </Card>
                </FadeIn>

                <FadeIn delay={0.6}>
                    <Card className="glass-card border-none rounded-[3rem] bg-slate-50/20 dark:bg-slate-900/20 backdrop-blur-3xl p-10 sm:p-12 overflow-hidden shadow-2xl">
                        <CardHeader className="px-0 pt-0 pb-12">
                            <div className="flex items-center gap-6">
                                <div className="h-14 w-14 rounded-2xl bg-violet-500/5 flex items-center justify-center border border-violet-500/10">
                                    <Activity className="h-6 w-6 text-violet-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-black uppercase tracking-tighter">AI Usage</CardTitle>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Nova AI interactions (30d)</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="h-[350px] px-0">
                            <PostHogChart event="ai_used" since="-30d" type="area" height={300} />
                        </CardContent>
                    </Card>
                </FadeIn>

                <FadeIn delay={0.7}>
                    <Card className="glass-card border-none rounded-[3rem] bg-slate-50/20 dark:bg-slate-900/20 backdrop-blur-3xl p-10 sm:p-12 overflow-hidden shadow-2xl">
                        <CardHeader className="px-0 pt-0 pb-12">
                            <div className="flex items-center gap-6">
                                <div className="h-14 w-14 rounded-2xl bg-amber-500/5 flex items-center justify-center border border-amber-500/10">
                                    <Activity className="h-6 w-6 text-amber-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-black uppercase tracking-tighter">Projects Created</CardTitle>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">PostHog event trend (30d)</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="h-[350px] px-0">
                            <PostHogChart event="project_created" since="-30d" type="area" height={300} />
                        </CardContent>
                    </Card>
                </FadeIn>
            </div>
        </div>
    );
}
