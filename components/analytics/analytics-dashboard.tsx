"use client";

import { useWorkspace } from "@/hooks/use-workspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { PostHogInsights } from "@/components/analytics/posthog-insights";
import { PostHogChart } from "@/components/analytics/posthog-chart";
import { useI18n } from "@/lib/i18n";

export default function AnalyticsDashboard() {
    const { activeWorkspaceId } = useWorkspace();
    const { t } = useI18n();

    return (
        <div className="pb-10">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-foreground">{t("analytics")}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Event-driven workspace intelligence and performance metrics
                </p>
            </div>

            <PostHogInsights />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                <Card className="border shadow-sm">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Activity className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-semibold">Task Creation Trend</CardTitle>
                                <p className="text-xs text-muted-foreground">PostHog event data (30 days)</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <PostHogChart event="task_created" since="-30d" type="bar" height={300} />
                    </CardContent>
                </Card>

                <Card className="border shadow-sm">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <Activity className="h-4 w-4 text-emerald-500" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-semibold">Task Completion Trend</CardTitle>
                                <p className="text-xs text-muted-foreground">PostHog event data (30 days)</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <PostHogChart event="task_completed" since="-30d" type="bar" height={300} />
                    </CardContent>
                </Card>

                <Card className="border shadow-sm">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                                <Activity className="h-4 w-4 text-violet-500" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-semibold">AI Usage</CardTitle>
                                <p className="text-xs text-muted-foreground">Nova AI interaction events</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <PostHogChart event="ai_used" since="-30d" type="area" height={300} />
                    </CardContent>
                </Card>

                <Card className="border shadow-sm">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                <Activity className="h-4 w-4 text-amber-500" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-semibold">Project Creation</CardTitle>
                                <p className="text-xs text-muted-foreground">New projects over time</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <PostHogChart event="project_created" since="-30d" type="area" height={300} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
