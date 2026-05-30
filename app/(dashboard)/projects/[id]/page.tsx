"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { AnimatePresence, motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { ProjectTeamsTab } from "@/components/projects/project-teams-tab";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

async function fetchProject(id: string, workspaceId?: string | null) {
    const url = workspaceId ? `/api/projects/${id}?workspaceId=${workspaceId}` : `/api/projects/${id}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch project");
    return res.json();
}

export default function ProjectPage({ params }: { params: { id: string } }) {
    const { activeWorkspaceId } = useWorkspace();
    const [view, setView] = useState("overview");
    const [isInviteOpen, setIsInviteOpen] = useState(false);

    const { data: project, isLoading } = useQuery({
        queryKey: ["project", params.id, activeWorkspaceId],
        queryFn: () => fetchProject(params.id, activeWorkspaceId),
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
        { id: "teams", label: "Teams", icon: UsersIcon },
        { id: "members", label: "Members", icon: User },
        { id: "calendar", label: "Calendar", icon: CalendarDays },
        { id: "timeline", label: "Timeline", icon: Calendar },
        { id: "gantt", label: "Gantt", icon: GanttIcon },
        { id: "activity", label: "Activity", icon: ActivityIcon },
        { id: "analytics", label: "Insights", icon: TrendingUp },
        { id: "settings", label: "Settings", icon: Settings },
    ];

    return (
        <div className="h-full flex flex-col bg-white dark:bg-slate-950 relative selection:bg-indigo-500/30">
            {/* Neural Mesh Background */}
            <div className="absolute top-0 right-0 -z-10 w-[800px] h-[800px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none animate-pulse" />
            <div className="absolute bottom-0 left-0 -z-10 w-[600px] h-[600px] bg-purple-600/5 blur-[100px] rounded-full pointer-events-none" />

            <div className="p-8 sm:p-12 border-b border-indigo-500/10 bg-white/40 dark:bg-slate-950/40 backdrop-blur-2xl sticky top-0 z-40">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-10">
                    <div className="flex items-center gap-8">
                        <Link href="/projects">
                            <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all duration-500 bg-white dark:bg-slate-900 border border-indigo-500/10 shadow-2xl shadow-indigo-500/10 group">
                                <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                        <div className="space-y-2">
                            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">{project.name}</h1>
                            <div className="flex items-center gap-4">
                                <div className="h-1 w-12 bg-indigo-600 rounded-full" />
                                <div className="flex items-center gap-3">
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">
                                        Node ID: {project.id.slice(-8)}
                                    </p>
                                    <Badge className="bg-indigo-600/10 text-indigo-600 border border-indigo-500/20 text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg">
                                        {view} Protocol
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full xl:w-auto overflow-x-auto no-scrollbar pb-2 xl:pb-0">
                         <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-900/50 p-2 rounded-[1.5rem] border border-indigo-500/5">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setView(tab.id)}
                                    className={cn(
                                        "flex items-center px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-500 whitespace-nowrap",
                                        view === tab.id
                                            ? "bg-indigo-600 text-white shadow-2xl shadow-indigo-500/40 scale-105"
                                            : "text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800"
                                    )}
                                >
                                    <tab.icon className={cn("h-4 w-4 mr-3", view === tab.id ? "animate-pulse" : "")} />
                                    {tab.label}
                                </button>
                            ))}
                         </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 p-8 sm:p-12 overflow-hidden relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={view}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 1.02, y: -20 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full"
                    >
                        {view === "overview" && (
                            <ProjectOverview project={project} />
                        )}

                        {view === "tasks" && (
                            <ProjectTasksView project={project} />
                        )}
                        
                        {view === "boards" && (
                            <div className="h-full space-y-12">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="space-y-1">
                                        <h3 className="text-3xl font-black uppercase tracking-tighter">Neural Board Grid</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Visual execution environments</p>
                                    </div>
                                    <Badge className="bg-indigo-600 text-white border-none text-[10px] font-black uppercase tracking-[0.2em] px-6 py-3 rounded-2xl shadow-xl shadow-indigo-500/20">
                                        {project.boards?.length || 0} ACTIVE INTERFACES
                                    </Badge>
                                </div>

                                {project.boards?.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                                        {project.boards.map((board: any, i: number) => (
                                             <motion.div key={board.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                                                <Link href={`/boards/${board.id}`}>
                                                    <Card className="glass-card border-none group overflow-hidden h-64 rounded-[3rem] relative transition-all duration-700 hover:scale-[1.03] hover:shadow-[0_40px_80px_-20px_rgba(99,102,241,0.2)] p-10 flex flex-col justify-between">
                                                        <div className="absolute top-0 right-0 p-10 text-indigo-500 opacity-5 group-hover:opacity-20 transition-all duration-1000 group-hover:scale-150 group-hover:-rotate-12 translate-x-8 -translate-y-8">
                                                            <Columns className="h-40 w-40" />
                                                        </div>
                                                        <div className="space-y-2 relative z-10">
                                                            <h3 className="text-3xl font-black group-hover:text-indigo-600 transition-all uppercase tracking-tighter">{board.name}</h3>
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                                <p className="uppercase text-[9px] font-black tracking-[0.3em] text-slate-400">{board._count?.tasks || 0} SYNCHRONIZED TASKS</p>
                                                            </div>
                                                        </div>
                                                        <div className="relative z-10">
                                                            <Button variant="ghost" className="p-0 text-indigo-600 font-black h-auto text-[10px] uppercase tracking-[0.3em] hover:bg-transparent group-hover:translate-x-2 transition-transform">Initialize View →</Button>
                                                        </div>
                                                    </Card>
                                                </Link>
                                             </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-[500px] flex flex-col items-center justify-center text-center p-12 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl border-2 border-dashed border-indigo-500/10 rounded-[4rem]">
                                        <div className="h-24 w-24 rounded-[2rem] bg-indigo-600/10 flex items-center justify-center shadow-2xl mb-8 floating">
                                            <Columns className="h-10 w-10 text-indigo-600" />
                                        </div>
                                        <h3 className="text-3xl font-black uppercase mb-4 tracking-tighter">Zero Interface Territory</h3>
                                        <p className="text-sm text-slate-500 mb-10 max-w-sm font-bold uppercase tracking-widest leading-relaxed">Create a visual matrix to manage your task synchronization.</p>
                                        <Button size="lg" className="h-16 rounded-[2rem] px-10 font-black uppercase tracking-[0.2em] text-[10px] bg-indigo-600 hover:bg-indigo-700 shadow-2xl shadow-indigo-500/30" asChild>
                                            <Link href={`/projects/${project.id}/boards`}>Initiate View Matrix</Link>
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
                                    <div className="h-full flex flex-col items-center justify-center text-center p-12">
                                        <Columns className="h-16 w-16 text-slate-200 mb-8 floating" />
                                        <h3 className="text-2xl font-black uppercase tracking-tighter mb-4">No Quick Interface</h3>
                                        <Button variant="outline" className="h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] px-10" onClick={() => setView("boards")}>Transcend to Boards Tab</Button>
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
                            <GanttChart tasks={tasks} projectId={project.id} workspaceId={project.workspaceId} />
                        )}

                        {view === "activity" && (
                            <ProjectActivity projectId={project.id} workspaceId={project.workspaceId} />
                        )}

                        {view === "teams" && (
                            <ProjectTeamsTab projectId={project.id} workspaceId={project.workspaceId} />
                        )}
                        
                        {view === "members" && (
                             <div className="h-full space-y-12">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                                     <div className="space-y-1">
                                         <h3 className="text-3xl font-black uppercase tracking-tighter">Collective Evolution</h3>
                                         <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-600">Neural Node Matrix: Operators & Architects</p>
                                     </div>
                                     <Button 
                                         onClick={() => setIsInviteOpen(true)}
                                         className="h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] px-10 bg-indigo-600 hover:bg-indigo-700 shadow-2xl shadow-indigo-500/20"
                                     >
                                         <UsersIcon className="h-4 w-4 mr-3" />
                                         Authorize Node
                                     </Button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                                     {project.team?.members?.map((member: any, i: number) => (
                                         <motion.div key={member.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                                            <Card className="glass-card border-none rounded-[2.5rem] shadow-xl hover:shadow-[0_30px_60px_-15px_rgba(99,102,241,0.2)] transition-all duration-500 cursor-pointer group p-8">
                                                <div className="flex flex-col items-center text-center space-y-6">
                                                     <div className="relative">
                                                         <div className="absolute inset-0 bg-indigo-600 blur-2xl opacity-0 group-hover:opacity-20 transition-opacity" />
                                                         <Avatar className="h-24 w-24 ring-8 ring-white dark:ring-slate-950 shadow-2xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-6">
                                                              <AvatarImage src={member.user?.imageUrl} />
                                                              <AvatarFallback className="text-2xl font-black uppercase bg-indigo-600 text-white">{member.user?.name?.[0]}</AvatarFallback>
                                                         </Avatar>
                                                     </div>
                                                     <div className="space-y-1">
                                                         <h3 className="text-xl font-black uppercase tracking-tighter group-hover:text-indigo-600 transition-colors truncate w-full">{member.user?.name}</h3>
                                                         <Badge className="bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 text-[9px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-lg">
                                                            {member.role}
                                                         </Badge>
                                                     </div>
                                                </div>
                                                <div className="mt-8 pt-6 border-t border-indigo-500/5">
                                                     <div className="flex items-center justify-center gap-8 text-slate-300 group-hover:text-indigo-500 transition-all duration-500">
                                                          <MessageSquare className="h-5 w-5 cursor-pointer hover:scale-125 transition-transform" />
                                                          <Calendar className="h-5 w-5 cursor-pointer hover:scale-125 transition-transform" />
                                                     </div>
                                                </div>
                                            </Card>
                                         </motion.div>
                                     ))}
                                </div>
                             </div>
                        )}

                        {view === "analytics" && (
                            <div className="h-full overflow-y-auto pr-4 pb-20 no-scrollbar">
                                <div className="p-10 bg-indigo-600/5 backdrop-blur-2xl border border-indigo-500/20 rounded-[3rem] flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12 relative overflow-hidden">
                                    <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 blur-[100px] -z-10" />
                                    <div className="flex items-center gap-8">
                                        <div className="h-20 w-20 rounded-[2rem] bg-indigo-600 text-white flex items-center justify-center shadow-2xl shadow-indigo-500/40 neural-glow relative overflow-hidden">
                                             <TrendingUp className="h-10 w-10 relative z-10" />
                                        </div>
                                        <div className="space-y-1">
                                             <h2 className="text-3xl font-black uppercase tracking-tighter">Predictive Synthesis</h2>
                                             <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Neural Telemetry Data Visualization</p>
                                        </div>
                                    </div>
                                    <Badge className="h-10 px-6 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-black uppercase tracking-widest text-[9px] flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        System Operational
                                    </Badge>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                        <Card key={i} className="glass-card border-none p-10 rounded-[2.5rem] hover:scale-105 transition-all duration-500 shadow-xl group">
                                            <div className="space-y-4">
                                                <Skeleton className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded-full" />
                                                <div className="flex items-end gap-2">
                                                    <Skeleton className="h-12 w-20 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                                                    <Skeleton className="h-4 w-12 bg-emerald-500/20 rounded-full" />
                                                </div>
                                            </div>
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

