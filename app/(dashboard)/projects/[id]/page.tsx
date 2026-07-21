"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProjectOverview } from "@/components/projects/project-overview";
import { ProjectActivity } from "@/components/projects/project-activity";
import { ProjectSettings } from "@/components/projects/project-settings";
import { ProjectAnalytics } from "@/components/projects/project-analytics";
import { DocumentList } from "@/components/documents/document-list";
import { DocumentEditor } from "@/components/documents/document-editor";
import { MeetingList } from "@/components/meetings/meeting-list";
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
    MessageSquare,
    Calendar,
    Zap,
    FileText,
    Sliders,
    Plus,
    CalendarCheck,
    Target,
    Clock,
    ClipboardList,
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
const SprintBoard = dynamic(() => import("@/components/sprints/sprint-board"), { ssr: false });
const CustomFieldsEditor = dynamic(() => import("@/components/boards/custom-fields-editor"), { ssr: false });
import { InviteMemberDialog } from "@/components/projects/invite-member-dialog";
import { ProjectTeamsTab } from "@/components/projects/project-teams-tab";
import { ReportsTab } from "@/components/projects/project-reports-tab";
import GoalDashboard from "@/components/goals/goal-dashboard";
import FormBuilder from "@/components/forms/form-builder";
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
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    const [showNewDoc, setShowNewDoc] = useState(false);
    const [newDocTitle, setNewDocTitle] = useState("");
    const [showNewBoard, setShowNewBoard] = useState(false);
    const [newBoardName, setNewBoardName] = useState("");
    const [newBoardDescription, setNewBoardDescription] = useState("");
    const queryClient = useQueryClient();

    const { data: project, isLoading } = useQuery({
        queryKey: ["project", params.id, activeWorkspaceId],
        queryFn: () => fetchProject(params.id, activeWorkspaceId),
        enabled: !!params.id,
    });

    const createDocMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/documents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: newDocTitle,
                    workspaceId: activeWorkspaceId,
                    projectId: params.id,
                }),
            });
            if (!res.ok) throw new Error("Failed to create document");
            return res.json();
        },
        onSuccess: (doc) => {
            queryClient.invalidateQueries({ queryKey: ["documents"] });
            setSelectedDocId(doc.id);
            setShowNewDoc(false);
            setNewDocTitle("");
            toast.success("Document created");
        },
        onError: () => toast.error("Failed to create document"),
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
        { id: "sprints", label: "Sprints", icon: Zap },
        { id: "goals", label: "Goals", icon: Target },
        { id: "team", label: "Team", icon: UsersIcon },
        { id: "time", label: "Time", icon: Clock },
        { id: "documents", label: "Documents", icon: FileText },
        { id: "meetings", label: "Meetings", icon: CalendarCheck },
        { id: "forms", label: "Forms", icon: ClipboardList },
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
                            onClick={() => { setView(tab.id); if (tab.id !== "documents") setSelectedDocId(null); }}
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
                                    <Button variant="outline" onClick={() => setShowNewBoard(true)}>Create Board</Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {view === "sprints" && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">Sprints</h2>
                                <p className="text-sm text-muted-foreground">Manage iterative work cycles for this project</p>
                            </div>
                        </div>
                        {activeWorkspaceId && (
                            <SprintBoard projectId={params.id} workspaceId={activeWorkspaceId} />
                        )}
                    </div>
                )}

                {view === "documents" && (
                    <div className="space-y-6">
                        {selectedDocId ? (
                            <DocumentEditor
                                documentId={selectedDocId}
                                onBack={() => setSelectedDocId(null)}
                            />
                        ) : (
                            <>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold">Documents</h2>
                                        <p className="text-sm text-muted-foreground">Project wiki, specs, and documentation</p>
                                    </div>
                                    <Dialog open={showNewDoc} onOpenChange={setShowNewDoc}>
                                        <DialogTrigger asChild>
                                            <Button size="sm">
                                                <Plus className="h-4 w-4 mr-2" />
                                                New Document
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>New Document</DialogTitle>
                                                <DialogDescription>Create a new document for this project</DialogDescription>
                                            </DialogHeader>
                                            <div className="py-4">
                                                <Input
                                                    placeholder="Document title"
                                                    value={newDocTitle}
                                                    onChange={(e) => setNewDocTitle(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" && newDocTitle.trim()) {
                                                            createDocMutation.mutate();
                                                        }
                                                    }}
                                                    autoFocus
                                                />
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" size="sm" onClick={() => setShowNewDoc(false)}>Cancel</Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => createDocMutation.mutate()}
                                                    disabled={!newDocTitle.trim() || createDocMutation.isPending}
                                                >
                                                    {createDocMutation.isPending ? "Creating..." : "Create"}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <DocumentList
                                    projectId={params.id}
                                    onSelectDocument={setSelectedDocId}
                                />
                            </>
                        )}
                    </div>
                )}

                {view === "meetings" && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold">Meetings</h2>
                            <p className="text-sm text-muted-foreground">AI-powered meeting intelligence with agenda generation and post-briefs</p>
                        </div>
                        <MeetingList projectId={params.id} />
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

                {view === "kanban" && (
                    <div className="h-full">
                        {project.boards?.[0] ? (
                            <KanbanBoard boardId={project.boards[0].id} onBack={() => setView("board")} />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-12">
                                <Columns className="h-12 w-12 text-muted-foreground mb-6" />
                                <h3 className="text-base font-semibold mb-2">No board selected</h3>
                                <Button variant="outline" onClick={() => setView("board")}>Back to Board</Button>
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

                {view === "team" && (
                    <ProjectTeamsTab projectId={project.id} workspaceId={project.workspaceId} />
                )}
                
                {view === "goals" && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold">Goals</h2>
                            <p className="text-sm text-muted-foreground">OKRs, milestones, and targets for this project</p>
                        </div>
                        <GoalDashboard workspaceId={project.workspaceId} projectId={project.id} />
                    </div>
                )}

                {view === "time" && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold">Time Tracking</h2>
                            <p className="text-sm text-muted-foreground">Track time, manage logs, and generate reports</p>
                        </div>
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                                    <Clock className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="text-sm font-semibold mb-1">Time tracking coming soon</h3>
                                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                                    Track time against tasks in this project, generate reports, and manage billable hours.
                                </p>
                                <Button variant="outline" disabled>Time Tracking</Button>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {view === "forms" && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold">Forms</h2>
                            <p className="text-sm text-muted-foreground">Build and manage forms for this project</p>
                        </div>
                        <FormBuilder workspaceId={project.workspaceId} />
                    </div>
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
