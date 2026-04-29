"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { ProjectOverview } from "@/components/projects/project-overview";
import { ProjectActivity } from "@/components/projects/project-activity";
import { ProjectSettings } from "@/components/projects/project-settings";
import { 
    ArrowLeft, 
    LayoutList, 
    Columns, 
    Calendar, 
    CalendarDays,
    TrendingUp, 
    GanttChart as GanttIcon,
    Info,
    Activity as ActivityIcon,
    Settings,
    Users as UsersIcon,
    MessageSquare
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { ProjectTasksView } from "@/components/projects/project-tasks-view";
import KanbanBoard from "@/components/boards/kanban-board";
import { TimelineView } from "@/components/projects/timeline-view";
import { GanttChart } from "@/components/projects/gantt-chart";
import { CalendarView } from "@/components/projects/calendar-view";
import { InviteMemberDialog } from "@/components/projects/invite-member-dialog";

async function fetchProject(id: string) {
    const res = await fetch(`/api/projects/${id}`);
    if (!res.ok) throw new Error("Failed to fetch project");
    return res.json();
}

export default function ProjectPage({ params }: { params: { id: string } }) {
    const { activeWorkspaceId } = useWorkspace();
    const [view, setView] = useState("overview");
    const [isInviteOpen, setIsInviteOpen] = useState(false);

    const { data: project, isLoading } = useQuery({
        queryKey: ["project", params.id],
        queryFn: () => fetchProject(params.id),
        enabled: !!params.id,
    });

    if (isLoading) {
        return (
            <div className="p-8 space-y-8">
                <div className="flex items-center gap-4">
                     <Skeleton className="h-10 w-10 rounded-full" />
                     <Skeleton className="h-8 w-64" />
                </div>
                <Skeleton className="h-[600px] w-full rounded-3xl" />
            </div>
        );
    }

    if (!project) return <div>Project not found</div>;

    const tasks = project.tasks || [];

    const tabs = [
        { id: "overview", label: "Overview", icon: Info },
        { id: "tasks", label: "Tasks", icon: LayoutList },
        { id: "boards", label: "Boards", icon: Columns },
        { id: "calendar", label: "Calendar", icon: CalendarDays },
        { id: "timeline", label: "Timeline", icon: Calendar },
        { id: "gantt", label: "Gantt", icon: GanttIcon },
        { id: "activity", label: "Activity", icon: ActivityIcon },
        { id: "members", label: "Team", icon: UsersIcon },
        { id: "analytics", label: "Insights", icon: TrendingUp },
        { id: "settings", label: "Settings", icon: Settings },
    ];

    return (
        <div className="h-full flex flex-col bg-slate-50/30 dark:bg-slate-950/30">
            <div className="p-4 sm:p-6 border-b bg-white dark:bg-slate-900 sticky top-0 z-30 shadow-sm">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <Link href="/projects">
                            <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">{project.name}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                    Project ID: {project.id.slice(-6)}
                                </p>
                                <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">{view} Mode</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar pb-2 lg:pb-0">
                         <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setView(tab.id)}
                                    className={`
                                        flex items-center px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                                        ${view === tab.id
                                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-lg scale-105"
                                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"}
                                    `}
                                >
                                    <tab.icon className="h-3.5 w-3.5 mr-2" />
                                    {tab.label}
                                </button>
                            ))}
                         </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 p-4 sm:p-8 overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={view}
                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 1.02, y: -10 }}
                        className="h-full"
                    >
                        {view === "overview" && (
                            <ProjectOverview project={project} />
                        )}

                        {view === "tasks" && (
                            <ProjectTasksView project={project} />
                        )}
                        
                        {view === "boards" && (
                            <div className="h-full">
                                {project.boards?.length > 0 ? (
                                    <div className="h-full">
                                        <div className="flex items-center gap-2 mb-6">
                                             <h3 className="text-xl font-black uppercase tracking-tight">Active Boards</h3>
                                             <Badge className="bg-indigo-600 text-white border-none text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                                {project.boards.length} Selected
                                             </Badge>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {project.boards.map((board: any) => (
                                                 <Link key={board.id} href={`/boards/${board.id}`}>
                                                     <Card className="hover:shadow-2xl hover:-translate-y-1 transition-all border-none bg-white dark:bg-slate-900 shadow-md group overflow-hidden h-48 rounded-3xl relative">
                                                          <div className="absolute top-0 right-0 p-6 text-slate-100 dark:text-slate-800 opacity-20 group-hover:opacity-100 group-hover:text-indigo-500 transition-all group-hover:scale-150 group-hover:-rotate-12 translate-x-4 -translate-y-4">
                                                               <Columns className="h-24 w-24" />
                                                          </div>
                                                          <CardHeader className="relative z-10">
                                                               <CardTitle className="text-2xl font-black group-hover:text-indigo-600 transition-all uppercase tracking-tight">{board.name}</CardTitle>
                                                               <CardDescription className="uppercase text-[9px] font-black tracking-widest">{board._count?.tasks || 0} Open Tasks</CardDescription>
                                                          </CardHeader>
                                                          <div className="absolute bottom-6 left-6 z-10">
                                                               <Button variant="link" className="p-0 text-indigo-600 font-black h-auto text-[10px] uppercase tracking-widest">Open Workspace →</Button>
                                                          </div>
                                                     </Card>
                                                 </Link>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 dark:bg-slate-900/50 border-4 border-dashed rounded-[4rem]">
                                        <div className="h-20 w-20 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow-xl mb-6">
                                            <Columns className="h-8 w-8 text-indigo-500" />
                                        </div>
                                        <h3 className="text-2xl font-black uppercase mb-2 tracking-tight">Zero Board Territory</h3>
                                        <p className="text-sm text-muted-foreground mb-8 max-w-sm font-medium">Create a Kanban board to visually manage your tasks and transform your project flow.</p>
                                        <Button size="lg" className="rounded-2xl px-8 font-black uppercase tracking-widest" asChild>
                                            <Link href={`/projects/${project.id}/boards`}>Initiate First Board</Link>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {view === "kanban" && (
                             <div className="h-full">
                                {project.boards?.[0] ? (
                                    <KanbanBoard boardId={project.boards[0].id} onBack={() => setView("boards")} />
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                        <Columns className="h-12 w-12 text-slate-300 mb-4" />
                                        <h3 className="text-lg font-black mb-2">No Quick Board</h3>
                                        <Button variant="outline" onClick={() => setView("boards")}>Go to Boards Tab</Button>
                                    </div>
                                )}
                             </div>
                        )}

                        {view === "calendar" && (
                            <CalendarView tasks={tasks} />
                        )}

                        {view === "timeline" && (
                            <TimelineView tasks={tasks} />
                        )}
                        
                        {view === "gantt" && (
                            <GanttChart tasks={tasks} />
                        )}

                        {view === "activity" && (
                            <ProjectActivity projectId={project.id} workspaceId={project.workspaceId} />
                        )}
                        
                        {view === "members" && (
                             <div className="h-full space-y-8">
                                <div className="flex items-center justify-between">
                                     <div>
                                         <h3 className="text-xl font-black uppercase tracking-tight">Project Evolution Team</h3>
                                         <p className="text-xs font-black uppercase tracking-widest text-indigo-500 mt-1">Founders, Builders & Operators</p>
                                     </div>
                                     <Button 
                                         onClick={() => setIsInviteOpen(true)}
                                         className="rounded-2xl font-black uppercase tracking-widest px-6"
                                     >
                                         <UsersIcon className="h-4 w-4 mr-2" />
                                         Invite Member
                                     </Button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                     {project.team?.members?.map((member: any) => (
                                         <Card key={member.id} className="rounded-3xl border-slate-200/50 dark:border-slate-800/50 shadow-md hover:shadow-xl transition-all cursor-pointer group">
                                              <CardHeader className="flex flex-col items-center text-center pb-6">
                                                   <Avatar className="h-20 w-20 ring-4 ring-indigo-500/10 group-hover:scale-110 transition-transform mb-4">
                                                        <AvatarImage src={member.user?.imageUrl} />
                                                        <AvatarFallback className="text-xl font-black">{member.user?.name?.[0]}</AvatarFallback>
                                                   </Avatar>
                                                   <CardTitle className="text-lg font-black uppercase truncate w-full">{member.user?.name}</CardTitle>
                                                   <CardDescription className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mt-1">{member.role}</CardDescription>
                                              </CardHeader>
                                              <div className="px-6 pb-6 border-t pt-4">
                                                   <div className="flex items-center justify-center gap-4 text-slate-400 group-hover:text-indigo-600 transition-colors">
                                                        <MessageSquare className="h-4 w-4 cursor-pointer hover:scale-125 transition-transform" />
                                                        <Calendar className="h-4 w-4 cursor-pointer hover:scale-125 transition-transform" />
                                                   </div>
                                              </div>
                                         </Card>
                                     ))}
                                </div>
                             </div>
                        )}

                        {view === "analytics" && (
                            <div className="h-full overflow-y-auto pr-2 pb-10">
                                <div className="p-4 bg-indigo-600/10 border-2 border-dashed border-indigo-600/30 text-indigo-600 rounded-[2rem] flex items-center gap-4 mb-8">
                                    <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg animate-pulse">
                                         <TrendingUp className="h-6 w-6" />
                                    </div>
                                    <div>
                                         <p className="text-lg font-black uppercase tracking-tight">Advanced Project Insights</p>
                                         <p className="text-xs font-bold uppercase tracking-widest opacity-70">Synthesized by Boots AI Quantum Core</p>
                                    </div>
                                </div>
                                {/* Placeholder for project-specific analytics */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                        <Card key={i} className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
                                            <Skeleton className="h-4 w-24 mb-4" />
                                            <Skeleton className="h-8 w-16" />
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {view === "settings" && (
                            <ProjectSettings project={project} />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            <InviteMemberDialog
                isOpen={isInviteOpen}
                onOpenChange={setIsInviteOpen}
                workspaceId={project.workspaceId}
                teamId={project.teamId}
            />
        </div>
    );
}

import { AnimatePresence, motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
