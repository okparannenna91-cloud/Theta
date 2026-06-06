"use client";

import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, TrendingUp, PieChart as PieChartIcon, Activity } from "lucide-react";
import { PostHogChart } from "@/components/analytics/posthog-chart";

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
        <div className="space-y-6">
            <div className="space-y-2">
                <div className="h-8 w-48 bg-muted animate-pulse rounded-md" />
                <div className="h-4 w-72 bg-muted/50 animate-pulse rounded-md" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1,2,3].map(i => <div key={i} className="h-32 bg-muted/50 animate-pulse rounded-lg" />)}
            </div>
        </div>
    );

    const projectHealth = projects?.map((p: any) => {
        const completed = p.tasks?.filter((t: any) => t.status === "done" || t.status === "completed").length || 0;
        const total = p.tasks?.length || 0;
        const progress = total > 0 ? (completed / total) * 100 : 0;
        return { ...p, progress, completed, total };
    }) || [];

    const resourceUtilization = totals.tasks > 0
        ? Math.min(Math.round((totals.completedTasks / totals.tasks) * 100) + 15, 100)
        : 0;

    return (
        <div className="pb-10">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-foreground">Portfolio Overview</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Overall health of all your active projects
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card className="border shadow-sm bg-primary text-primary-foreground">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium opacity-80">Active Projects</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totals.projects}</div>
                        <div className="flex items-center gap-1 mt-2 text-xs opacity-80">
                            <TrendingUp className="h-3 w-3" />
                            <span>Active</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Pipeline Tasks</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totals.tasks}</div>
                        <div className="flex items-center gap-4 mt-2 text-xs">
                            <span className="text-emerald-600">{totals.completedTasks} Completed</span>
                            <span className="text-amber-600">{totals.overdueTasks} Overdue</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Resource Utilization</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{resourceUtilization}%</div>
                        <div className="w-full bg-muted h-2 rounded-full mt-3 overflow-hidden">
                            <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${resourceUtilization}%` }} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <Card className="border shadow-sm lg:col-span-2">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Activity className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-semibold">Workspace Performance</CardTitle>
                                <p className="text-xs text-muted-foreground">Last 7 days</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <PostHogChart event="task_created" since="-7d" type="area" height={240} />
                    </CardContent>
                </Card>

                <Card className="border shadow-sm">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                <PieChartIcon className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-semibold">Portfolio Mix</CardTitle>
                                <p className="text-xs text-muted-foreground">Task distribution</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <PostHogChart event="task_completed" since="-30d" type="bar" height={240} />
                        <div className="mt-4 space-y-2">
                            {projectHealth.slice(0, 4).map((p: any, i: number) => (
                                <div key={p.id} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: ["#6366f1", "#10b981", "#f59e0b", "#ef4444"][i % 4] }} />
                                        <span className="font-medium truncate max-w-[120px]">{p.name}</span>
                                    </div>
                                    <span className="text-muted-foreground">{p.total} Tasks</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-3">
                        <FolderKanban className="h-5 w-5 text-primary" />
                        Project Health Index
                    </h2>
                    <Badge variant="secondary" className="rounded-md px-3 py-1 text-xs font-medium">
                        {totals.projectCompletionRate}% Overall
                    </Badge>
                </div>

                <div className="space-y-3">
                    {projectHealth.map((project: any) => (
                        <Card key={project.id} className="border shadow-sm hover:border-primary/30 transition-colors">
                            <CardContent className="p-4">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 min-w-[250px]">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                            <FolderKanban className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold">{project.name}</h3>
                                            <p className="text-xs text-muted-foreground">{project.description || "No description"}</p>
                                        </div>
                                    </div>

                                    <div className="flex-1 max-w-xs space-y-1.5">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>Progress</span>
                                            <span className="font-medium text-foreground">{Math.round(project.progress)}%</span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${project.progress}%` }} />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="text-lg font-bold">{project.total}</div>
                                            <div className="text-xs text-muted-foreground">Tasks</div>
                                        </div>
                                        <Badge className={cn(
                                            "rounded-md px-3 py-1 text-xs font-medium",
                                            project.progress > 75 ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" :
                                            project.progress > 40 ? "bg-primary/10 text-primary border border-primary/20" :
                                            "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                        )}>
                                            {project.progress > 75 ? "Optimal" : project.progress > 40 ? "Steady" : "Critical"}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
