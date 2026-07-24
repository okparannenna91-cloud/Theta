"use client";

import { useState, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { ProjectOverview } from "@/components/projects/project-overview";
import { ProjectActivity } from "@/components/projects/project-activity";
import { ProjectSettings } from "@/components/projects/project-settings";
import { ProjectAnalytics } from "@/components/projects/project-analytics";
import { AutomationList } from "@/components/automations/automation-list";
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
    Calendar,
    Zap,
    Sliders,
    BarChart3,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { ProjectTasksView } from "@/components/projects/project-tasks-view";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const TimelineView = dynamic(() => import("@/components/projects/timeline-view").then(m => ({ default: m.TimelineView })), { ssr: false });
const GanttChart = dynamic(() => import("@/components/projects/gantt-chart").then(m => ({ default: m.GanttChart })), { ssr: false });
const CalendarView = dynamic(() => import("@/components/projects/calendar-view").then(m => ({ default: m.CalendarView })), { ssr: false });
const CustomFieldsEditor = dynamic(() => import("@/components/boards/custom-fields-editor"), { ssr: false });
import { InviteMemberDialog } from "@/components/projects/invite-member-dialog";
import { ProjectTeamsTab } from "@/components/projects/project-teams-tab";
import { ReportsTab } from "@/components/projects/project-reports-tab";
import KanbanBoard from "@/components/boards/kanban-board";

async function fetchProject(id: string, workspaceId?: string | null) {
    const url = workspaceId ? `/api/projects/${id}?workspaceId=${workspaceId}` : `/api/projects/${id}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch project");
    return res.json();
}

async function fetchProjectBoard(projectId: string) {
    const res = await fetch(`/api/projects/${projectId}/board`);
    if (!res.ok) throw new Error("Failed to fetch project board");
    return res.json();
}

function DefaultBoardView({ projectId, children }: { projectId: string; children?: (boardId: string) => ReactNode }) {
    const { data: board, isLoading } = useQuery({
        queryKey: ["project-board", projectId],
        queryFn: () => fetchProjectBoard(projectId),
        enabled: !!projectId,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center text-sm text-muted-foreground">Loading board...</div>
            </div>
        );
    }

    if (!board) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-muted-foreground mb-2">Could not load board</h3>
                    <p className="text-sm text-muted-foreground">Please try again later.</p>
                </div>
            </div>
        );
    }

    if (children) {
        return <>{children(board.id)}</>;
    }

    return <KanbanBoard boardId={board.id} onBack={() => {}} />;
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
        { id: "board", label: "Board", icon: Columns },
        { id: "calendar", label: "Calendar", icon: CalendarDays },
        { id: "timeline", label: "Timeline", icon: Calendar },
        { id: "gantt", label: "Gantt", icon: GanttIcon },
        { id: "team", label: "Team", icon: UsersIcon },
        { id: "automations", label: "Automations", icon: Zap },
        { id: "reports", label: "Reports", icon: BarChart3 },
        { id: "analytics", label: "Analytics", icon: TrendingUp },
        { id: "activity", label: "Activity", icon: ActivityIcon },
        { id: "custom-fields", label: "Fields", icon: Sliders },
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
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-semibold text-foreground">{project.name}</h1>
                                {project.visibility === "private" && (
                                    <Badge variant="secondary" className="text-xs rounded-md px-2 py-0 h-5">Private</Badge>
                                )}
                                {project.visibility === "team_access" && (
                                    <Badge className="text-xs rounded-md px-2 py-0 h-5 bg-blue-500/15 text-blue-600 border-blue-500/30">Team Access</Badge>
                                )}
                                {project.visibility === "workspace_visible" && (
                                    <Badge className="text-xs rounded-md px-2 py-0 h-5 bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Workspace</Badge>
                                )}
                            </div>
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
                
                {view === "board" && (
                    <DefaultBoardView projectId={params.id} />
                )}

                {view === "custom-fields" && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold">Custom Fields</h2>
                            <p className="text-sm text-muted-foreground">Define custom data fields for tasks in this project</p>
                        </div>
                        <DefaultBoardView projectId={params.id}>
                            {(boardId: string) => (
                                <CustomFieldsEditor boardId={boardId} workspaceId={project.workspaceId} />
                            )}
                        </DefaultBoardView>
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

                {view === "team" && (
                    <ProjectTeamsTab projectId={project.id} workspaceId={project.workspaceId} />
                )}
                
                {view === "reports" && (
                    <ReportsTab projectId={project.id} workspaceId={project.workspaceId} projectName={project.name} />
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
                        <ProjectAnalytics projectId={project.id} />
                    </div>
                )}

                {view === "automations" && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold">Automations</h2>
                            <p className="text-sm text-muted-foreground">Automate repetitive workflows with triggers and actions</p>
                        </div>
                        <AutomationList />
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
