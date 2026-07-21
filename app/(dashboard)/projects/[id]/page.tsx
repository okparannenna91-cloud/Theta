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
import { InviteMemberDialog } from "@/components/projects/invite-member-dialog";
import { ProjectTeamsTab } from "@/components/projects/project-teams-tab";
import { User } from "lucide-react";
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
    const [showNewSprint, setShowNewSprint] = useState(false);
    const [sprintName, setSprintName] = useState("");
    const [sprintGoal, setSprintGoal] = useState("");
    const [sprintStartDate, setSprintStartDate] = useState("");
    const [sprintEndDate, setSprintEndDate] = useState("");
    const [showNewField, setShowNewField] = useState(false);
    const [fieldName, setFieldName] = useState("");
    const [fieldType, setFieldType] = useState("text");
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

    const createSprintMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/sprints", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: sprintName,
                    projectId: params.id,
                    workspaceId: activeWorkspaceId,
                    startDate: sprintStartDate || new Date().toISOString(),
                    endDate: sprintEndDate || new Date(Date.now() + 14 * 86400000).toISOString(),
                    goal: sprintGoal || undefined,
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to create sprint");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sprints", params.id] });
            setShowNewSprint(false);
            setSprintName("");
            setSprintGoal("");
            setSprintStartDate("");
            setSprintEndDate("");
            toast.success("Sprint created");
        },
        onError: (err: any) => toast.error(err.message),
    });

    const createFieldMutation = useMutation({
        mutationFn: async () => {
            const boardId = project?.boards?.[0]?.id;
            if (!boardId) throw new Error("No board found. Create a board first.");
            const res = await fetch("/api/custom-fields", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: fieldName,
                    type: fieldType,
                    boardId,
                }),
            });
            if (!res.ok) throw new Error("Failed to create field");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["custom-fields", activeWorkspaceId] });
            setShowNewField(false);
            setFieldName("");
            setFieldType("text");
            toast.success("Field created");
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
        { id: "boards", label: "Boards", icon: Columns },
        { id: "sprints", label: "Sprints", icon: Zap },
        { id: "documents", label: "Documents", icon: FileText },
        { id: "meetings", label: "Meetings", icon: CalendarCheck },
        { id: "custom-fields", label: "Fields", icon: Sliders },
        { id: "teams", label: "Teams", icon: UsersIcon },
        { id: "members", label: "Members", icon: User },
        { id: "calendar", label: "Calendar", icon: CalendarDays },
        { id: "timeline", label: "Timeline", icon: Calendar },
        { id: "gantt", label: "Gantt", icon: GanttIcon },
        { id: "activity", label: "Activity", icon: ActivityIcon },
        { id: "analytics", label: "Insights", icon: TrendingUp },
        { id: "automations", label: "Automations", icon: Zap },
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

                {view === "sprints" && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">Sprints</h2>
                                <p className="text-sm text-muted-foreground">Manage iterative work cycles for this project</p>
                            </div>
                            <Dialog open={showNewSprint} onOpenChange={setShowNewSprint}>
                                <DialogTrigger asChild>
                                    <Button size="sm">
                                        <Zap className="h-4 w-4 mr-2" />
                                        New Sprint
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Create Sprint</DialogTitle>
                                        <DialogDescription>Organize work into a time-boxed iteration.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-2">
                                        <div>
                                            <label className="text-sm font-medium">Name</label>
                                            <Input value={sprintName} onChange={e => setSprintName(e.target.value)} placeholder="Sprint 1" className="mt-1" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Goal (optional)</label>
                                            <Input value={sprintGoal} onChange={e => setSprintGoal(e.target.value)} placeholder="What should this sprint accomplish?" className="mt-1" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium">Start Date</label>
                                                <Input type="date" value={sprintStartDate} onChange={e => setSprintStartDate(e.target.value)} className="mt-1" />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium">End Date</label>
                                                <Input type="date" value={sprintEndDate} onChange={e => setSprintEndDate(e.target.value)} className="mt-1" />
                                            </div>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setShowNewSprint(false)}>Cancel</Button>
                                        <Button onClick={() => createSprintMutation.mutate()} disabled={!sprintName || createSprintMutation.isPending}>
                                            {createSprintMutation.isPending ? "Creating..." : "Create Sprint"}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <Card className="border-2 border-dashed border-border">
                            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                                    <Zap className="h-6 h-6 text-primary" />
                                </div>
                                <h3 className="text-sm font-semibold mb-1">No active sprints</h3>
                                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                                    Create a sprint to organize work into time-boxed iterations with burndown tracking.
                                </p>
                                <Button variant="outline" onClick={() => setShowNewSprint(true)}>Create Sprint</Button>
                            </CardContent>
                        </Card>
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
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">Custom Fields</h2>
                                <p className="text-sm text-muted-foreground">Define custom data fields for tasks in this project</p>
                            </div>
                            <Dialog open={showNewField} onOpenChange={setShowNewField}>
                                <DialogTrigger asChild>
                                    <Button size="sm">
                                        <Sliders className="h-4 w-4 mr-2" />
                                        Add Field
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Create Custom Field</DialogTitle>
                                        <DialogDescription>Add a custom field to track additional task data.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-2">
                                        <div>
                                            <label className="text-sm font-medium">Field Name</label>
                                            <Input value={fieldName} onChange={e => setFieldName(e.target.value)} placeholder="e.g. Story Points" className="mt-1" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Field Type</label>
                                            <select value={fieldType} onChange={e => setFieldType(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                                <option value="text">Text</option>
                                                <option value="number">Number</option>
                                                <option value="select">Dropdown</option>
                                                <option value="date">Date</option>
                                                <option value="checkbox">Checkbox</option>
                                                <option value="url">URL</option>
                                            </select>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setShowNewField(false)}>Cancel</Button>
                                        <Button onClick={() => createFieldMutation.mutate()} disabled={!fieldName || createFieldMutation.isPending}>
                                            {createFieldMutation.isPending ? "Creating..." : "Create Field"}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <Card className="border-2 border-dashed border-border">
                            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                                    <Sliders className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <h3 className="text-sm font-semibold mb-1">No custom fields</h3>
                                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                                    Add custom fields to track additional data like story points, sprint, or any custom attribute.
                                </p>
                                <Button variant="outline" onClick={() => setShowNewField(true)}>Create Custom Field</Button>
                            </CardContent>
                        </Card>
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
