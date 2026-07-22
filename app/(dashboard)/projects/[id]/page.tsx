"use client";

import { useState } from "react";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const KanbanBoard = dynamic(() => import("@/components/boards/kanban-board"), { ssr: false });
const TimelineView = dynamic(() => import("@/components/projects/timeline-view").then(m => ({ default: m.TimelineView })), { ssr: false });
const GanttChart = dynamic(() => import("@/components/projects/gantt-chart").then(m => ({ default: m.GanttChart })), { ssr: false });
const CalendarView = dynamic(() => import("@/components/projects/calendar-view").then(m => ({ default: m.CalendarView })), { ssr: false });
const CustomFieldsEditor = dynamic(() => import("@/components/boards/custom-fields-editor"), { ssr: false });
import { InviteMemberDialog } from "@/components/projects/invite-member-dialog";
import { ProjectTeamsTab } from "@/components/projects/project-teams-tab";
import { ReportsTab } from "@/components/projects/project-reports-tab";
import {
    Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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
    const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
    const [showNewBoard, setShowNewBoard] = useState(false);
    const [newBoardName, setNewBoardName] = useState("");
    const [newBoardDescription, setNewBoardDescription] = useState("");
    const queryClient = useQueryClient();

    const { data: project, isLoading } = useQuery({
        queryKey: ["project", params.id, activeWorkspaceId],
        queryFn: () => fetchProject(params.id, activeWorkspaceId),
        enabled: !!params.id,
    });

    const createBoardMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/boards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newBoardName,
                    description: newBoardDescription,
                    projectId: params.id,
                    workspaceId: activeWorkspaceId,
                }),
            });
            if (!res.ok) throw new Error("Failed to create board");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["project", params.id, activeWorkspaceId] });
            queryClient.invalidateQueries({ queryKey: ["boards", activeWorkspaceId] });
            setShowNewBoard(false);
            setNewBoardName("");
            setNewBoardDescription("");
            toast.success("Board created");
        },
        onError: (err: any) => toast.error(err.message),
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
                            onClick={() => { setView(tab.id); setSelectedBoardId(null); }}
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
                    <div className="space-y-6">
                        {selectedBoardId ? (
                            <KanbanBoard
                                boardId={selectedBoardId}
                                onBack={() => setSelectedBoardId(null)}
                            />
                        ) : (
                            <>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold">Boards</h2>
                                        <p className="text-sm text-muted-foreground">Visual task management boards for this project</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant="secondary" className="text-xs rounded-md px-3 py-1">
                                            {project.boards?.length || 0} boards
                                        </Badge>
                                        <Dialog open={showNewBoard} onOpenChange={setShowNewBoard}>
                                            <DialogTrigger asChild>
                                                <Button size="sm">
                                                    <Columns className="h-4 w-4 mr-2" />
                                                    New Board
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Create Board</DialogTitle>
                                                    <DialogDescription>Create a visual board for managing tasks in this project.</DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4 py-2">
                                                    <div>
                                                        <label className="text-sm font-medium">Board Name</label>
                                                        <Input
                                                            value={newBoardName}
                                                            onChange={e => setNewBoardName(e.target.value)}
                                                            placeholder="e.g. Product Roadmap"
                                                            className="mt-1"
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-sm font-medium">Description (optional)</label>
                                                        <Input
                                                            value={newBoardDescription}
                                                            onChange={e => setNewBoardDescription(e.target.value)}
                                                            placeholder="What is this board for?"
                                                            className="mt-1"
                                                        />
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <Button variant="outline" onClick={() => setShowNewBoard(false)}>Cancel</Button>
                                                    <Button
                                                        onClick={() => createBoardMutation.mutate()}
                                                        disabled={!newBoardName.trim() || createBoardMutation.isPending}
                                                    >
                                                        {createBoardMutation.isPending ? "Creating..." : "Create Board"}
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </div>

                                {project.boards?.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {project.boards.map((board: any) => (
                                            <div
                                                key={board.id}
                                                onClick={() => setSelectedBoardId(board.id)}
                                                className="cursor-pointer"
                                            >
                                                <Card className="border shadow-sm hover:border-primary/30 hover:shadow-md transition-all">
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
                                            </div>
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
                                            <Button variant="outline" onClick={() => setShowNewBoard(true)}>Create Board</Button>
                                        </CardContent>
                                    </Card>
                                )}
                            </>
                        )}
                    </div>
                )}

                {view === "custom-fields" && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold">Custom Fields</h2>
                            <p className="text-sm text-muted-foreground">Define custom data fields for tasks in this project</p>
                        </div>
                        {project.boards?.[0] ? (
                            <CustomFieldsEditor boardId={project.boards[0].id} workspaceId={project.workspaceId} />
                        ) : (
                            <Card className="border-2 border-dashed border-border">
                                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                                        <Sliders className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-sm font-semibold mb-1">Create a board first</h3>
                                    <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                                        Custom fields are tied to boards. Create a board to start adding custom fields.
                                    </p>
                                    <Button variant="outline" onClick={() => setView("board")}>Go to Boards</Button>
                                </CardContent>
                            </Card>
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
