"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LayoutList, Columns, Calendar, TrendingUp, GanttChart as GanttIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ProjectTasksView } from "@/components/projects/project-tasks-view";
import KanbanBoard from "@/components/boards/kanban-board";
import { TimelineView } from "@/components/projects/timeline-view";
import { GanttChart } from "@/components/projects/gantt-chart";

async function fetchProject(id: string) {
    const res = await fetch(`/api/projects/${id}`);
    if (!res.ok) throw new Error("Failed to fetch project");
    return res.json();
}

export default function ProjectPage({ params }: { params: { id: string } }) {
    const { activeWorkspaceId } = useWorkspace();
    const [view, setView] = useState("list");

    const { data: project, isLoading } = useQuery({
        queryKey: ["project", params.id],
        queryFn: () => fetchProject(params.id),
        enabled: !!params.id,
    });

    if (isLoading) {
        return (
            <div className="p-8 space-y-8">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-[500px] w-full" />
            </div>
        );
    }

    if (!project) return <div>Project not found</div>;

    const tasks = project.tasks || [];

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 sm:p-6 border-b bg-white dark:bg-slate-900 sticky top-0 z-30">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/projects">
                            <Button variant="ghost" size="icon" className="rounded-full">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight">{project.name}</h1>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                                Project Overview
                            </p>
                        </div>
                    </div>

                    <Tabs value={view} onValueChange={setView} className="w-full sm:w-auto">
                        <TabsList className="grid grid-cols-5 w-full sm:w-[500px] bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            <TabsTrigger value="list" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 shadow-none"><LayoutList className="h-4 w-4 mr-2" />List</TabsTrigger>
                            <TabsTrigger value="kanban" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 shadow-none"><Columns className="h-4 w-4 mr-2" />Board</TabsTrigger>
                            <TabsTrigger value="timeline" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 shadow-none"><Calendar className="h-4 w-4 mr-2" />Timeline</TabsTrigger>
                            <TabsTrigger value="gantt" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 shadow-none"><GanttIcon className="h-4 w-4 mr-2" />Gantt</TabsTrigger>
                            <TabsTrigger value="analytics" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 shadow-none"><TrendingUp className="h-4 w-4 mr-2" />Insights</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            <div className="flex-1 p-4 sm:p-6 overflow-hidden">
                <Tabs value={view} className="h-full">
                    <TabsContent value="list" className="h-full mt-0">
                        <ProjectTasksView project={project} />
                    </TabsContent>
                    <TabsContent value="kanban" className="h-full mt-0">
                        {project.boards?.[0] ? (
                            <KanbanBoard boardId={project.boards[0].id} onBack={() => setView("list")} />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-slate-900 border-2 border-dashed rounded-3xl">
                                <Columns className="h-12 w-12 text-slate-300 mb-4" />
                                <h3 className="text-lg font-black mb-2">No Board Found</h3>
                                <p className="text-sm text-muted-foreground mb-6">This project doesn't have a Kanban board yet.</p>
                                <Button asChild>
                                    <Link href="/boards">Create First Board</Link>
                                </Button>
                            </div>
                        )}
                    </TabsContent>
                    <TabsContent value="timeline" className="h-full mt-0">
                        <TimelineView tasks={tasks} />
                    </TabsContent>
                    <TabsContent value="gantt" className="h-full mt-0">
                        <GanttChart tasks={tasks} />
                    </TabsContent>
                    <TabsContent value="analytics" className="h-full mt-0 overflow-y-auto">
                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-2xl flex items-center gap-3">
                            <TrendingUp className="h-5 w-5" />
                            <p className="text-sm font-bold">Project Insights are powered by Boots AI.</p>
                        </div>
                        {/* Placeholder for project-specific analytics */}
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
                                    <Skeleton className="h-4 w-24 mb-4" />
                                    <Skeleton className="h-8 w-16" />
                                </div>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
