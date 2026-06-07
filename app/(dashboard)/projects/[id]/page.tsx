"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProjectOverview } from "@/components/projects/project-overview";
import { ProjectActivity } from "@/components/projects/project-activity";
import { ProjectSettings } from "@/components/projects/project-settings";
import { 
    ArrowLeft, 
    LayoutList, 
    Columns, 
    CalendarDays,
    TrendingUp, 
    GanttChart as GanttIcon,
    Info,
    Activity as ActivityIcon,
    Settings,
    Users as UsersIcon,
    MessageSquare,
    Calendar
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
            <div className="space-y-6 p-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-8 w-64" />
                </div>
                <Skeleton className="h-[600px] w-full rounded-lg" />
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Card className="max-w-md border shadow-sm">
                    <CardHeader className="text-center">
                        <CardTitle className="text-base">Project not found</CardTitle>
                        <CardDescription>The project you&apos;re looking for doesn&apos;t exist or has been deleted.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center pb-6">
                        <Link href="/projects"><Button variant="outline">Back to Projects</Button></Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

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
        <div className="h-full flex flex-col bg-background">
            <div className="px-6 lg:px-8 py-4 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/projects">
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-semibold text-foreground">{project.name}</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-xs text-muted-foreground">
                                    Created {new Date(project.createdAt).toLocaleDateString()}
                                </p>
                                <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                                <Badge variant="outline" className="text-xs rounded-md px-2 py-0 h-5 capitalize">
                                    {project.status || "Active"}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 mt-4 -mb-4 overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setView(tab.id)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md transition-colors whitespace-nowrap border-b-2",
                                view === tab.id
                                    ? "text-foreground border-primary bg-muted/30"
                                    : "text-muted-foreground border-transparent hover:text-foreground hover:border-muted-foreground/20"
                            )}
                        >
                            <tab.icon className="h-3.5 w-3.5" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
                {view === "overview" && (
                    <ProjectOverview project={project} />
                )}

                {view === "tasks" && (
                    <ProjectTasksView project={project} />
                )}
                
                {view === "boards" && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">Boards</h2>
                                <p className="text-sm text-muted-foreground">Visual task management boards for this project</p>
                            </div>
                            <Badge variant="secondary" className="text-xs rounded-md px-3 py-1">
                                {project.boards?.length || 0} boards
                            </Badge>
                        </div>

                        {project.boards?.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {project.boards.map((board: any) => (
                                    <Link key={board.id} href={`/boards/${board.id}`}>
                                        <Card className="border shadow-sm hover:border-primary/30 hover:shadow-md transition-all cursor-pointer">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                                            <Columns className="h-4 w-4 text-primary" />
                                                        </div>
                                                        <CardTitle className="text-sm font-semibold">{board.name}</CardTitle>
                                                    </div>
                                                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-xs text-muted-foreground">
                                                    {board._count?.tasks || 0} tasks
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <Card className="border-2 border-dashed border-border">
                                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                                        <Columns className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-sm font-semibold mb-1">No boards yet</h3>
                                    <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                                        Create a board to visually manage your project tasks.
                                    </p>
                                    <Link href={`/projects/${project.id}/boards`}>
                                        <Button variant="outline">Create Board</Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {view === "kanban" && (
                    <div className="h-full">
                        {project.boards?.[0] ? (
                            <KanbanBoard boardId={project.boards[0].id} onBack={() => setView("boards")} />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-12">
                                <Columns className="h-12 w-12 text-muted-foreground mb-6" />
                                <h3 className="text-base font-semibold mb-2">No board selected</h3>
                                <Button variant="outline" onClick={() => setView("boards")}>Back to Boards</Button>
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
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">Members</h2>
                                <p className="text-sm text-muted-foreground">People with access to this project</p>
                            </div>
                            <Button onClick={() => setIsInviteOpen(true)}>
                                <UsersIcon className="h-4 w-4 mr-2" />
                                Invite Member
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {project.team?.members?.map((member: any) => (
                                <Card key={member.id} className="border shadow-sm hover:border-primary/30 transition-colors">
                                    <CardHeader className="pb-3 flex flex-col items-center text-center">
                                        <Avatar className="h-14 w-14 mb-2">
                                            <AvatarImage src={member.user?.imageUrl} />
                                            <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                                                {member.user?.name?.[0] || "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <CardTitle className="text-sm font-semibold truncate w-full">
                                            {member.user?.name || "Unknown"}
                                        </CardTitle>
                                        <Badge variant="outline" className="text-xs rounded-md px-2 py-0 h-5 capitalize">
                                            {member.role}
                                        </Badge>
                                    </CardHeader>
                                    <CardContent className="pt-0 flex justify-center gap-3">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                            <MessageSquare className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                            <Calendar className="h-3.5 w-3.5" />
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {view === "analytics" && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <TrendingUp className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold">Project Insights</h2>
                                <p className="text-xs text-muted-foreground">Analytics and metrics for this project</p>
                            </div>
                            <Badge variant="outline" className="ml-auto text-xs rounded-md px-2 py-0 h-6 flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Live
                            </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {["Total Tasks", "Completed", "In Progress", "Overdue"].map((label, i) => (
                                <Card key={i} className="border shadow-sm">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Skeleton className="h-8 w-16 rounded-md" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
                
                {view === "settings" && (
                    <ProjectSettings project={project} />
                )}
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
