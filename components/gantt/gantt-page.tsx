"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import {
    BarChart3, Filter, Plus, Search, Download,
    Settings2, Clock, Maximize2, Minimize2, Undo2, Redo2, Link2,
    GitBranch, CalendarDays, Users, Workflow, Milestone, Save,
    RotateCcw, Flag, Activity,
    LayoutList, Eye, EyeOff, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import TimelineCanvas from "@/components/timeline/timeline-canvas";
import { ZoomController } from "@/components/shared/timeline/zoom-controller";
import PresenceAvatars from "./presence-avatars";
import { toPng } from "html-to-image";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { invalidateTaskCaches } from "@/lib/invalidate-task-caches";
import type { ZoomLevel, UndoCommand } from "@/components/shared/timeline/types";

export default function GanttPage({ projectId }: { projectId?: string }) {
    const { activeWorkspaceId } = useWorkspace();
    const queryClient = useQueryClient();
    const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("day");
    const [searchQuery, setSearchQuery] = useState("");
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
    const [showCriticalPath, setShowCriticalPath] = useState(true);
    const [showWeekends, setShowWeekends] = useState(true);
    const [enableRollup, setEnableRollup] = useState(true);
    const [schedulingMode, setSchedulingMode] = useState<"auto" | "manual">("auto");
    const [undoStack, setUndoStack] = useState<UndoCommand[]>([]);
    const [redoStack, setRedoStack] = useState<UndoCommand[]>([]);
    const [baselineDialog, setBaselineDialog] = useState(false);
    const [baselineLabel, setBaselineLabel] = useState("");
    const [showBaselines, setShowBaselines] = useState(true);
    const [workingDaysDialog, setWorkingDaysDialog] = useState(false);
    const [holidaysDialog, setHolidaysDialog] = useState(false);
    const [workingDays, setWorkingDays] = useState({
        monday: true, tuesday: true, wednesday: true, thursday: true,
        friday: true, saturday: false, sunday: false,
    });
    const [holidays, setHolidays] = useState<{ date: string; label: string }[]>([]);
    const [holidayDate, setHolidayDate] = useState("");
    const [holidayLabel, setHolidayLabel] = useState("");

    // Filters
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterPriority, setFilterPriority] = useState("all");
    const [filterAssignee, setFilterAssignee] = useState("all");
    const [filterTag, setFilterTag] = useState("all");
    const [filterProject, setFilterProject] = useState("all");

    // Group by
    const [groupBy, setGroupBy] = useState<"none" | "project" | "assignee" | "status" | "priority">("none");

    // Task dialog
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);

    // Saved views with localStorage persistence
    const [savedViews, setSavedViews] = useState<any[]>([]);
    const [saveViewDialog, setSaveViewDialog] = useState(false);
    const [viewName, setViewName] = useState("");
    const { user } = useUser();
    const viewsStorageKey = useMemo(() => `theta-gantt-views-${activeWorkspaceId || "global"}`, [activeWorkspaceId]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            try {
                const stored = localStorage.getItem(viewsStorageKey);
                if (stored) setSavedViews(JSON.parse(stored));
            } catch {}
        }
    }, [viewsStorageKey]);

    const persistViews = useCallback((views: any[]) => {
        setSavedViews(views);
        try {
            localStorage.setItem(viewsStorageKey, JSON.stringify(views));
        } catch {}
    }, [viewsStorageKey]);

    const { data: baselinesData } = useQuery({
        queryKey: ["baselines", activeWorkspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/baselines?workspaceId=${activeWorkspaceId}`);
            if (!res.ok) throw new Error("Failed to fetch baselines");
            return res.json();
        },
        enabled: !!activeWorkspaceId,
    });

    const baselines = useMemo(() => baselinesData?.baselines || [], [baselinesData]);

    // Fetch projects, users, tags for filters
    const { data: projectsData } = useQuery({
        queryKey: ["projects", activeWorkspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/projects?workspaceId=${activeWorkspaceId}`);
            if (!res.ok) throw new Error("Failed to fetch projects");
            return res.json();
        },
        enabled: !!activeWorkspaceId,
    });

    const projects = useMemo(() =>
        Array.isArray(projectsData?.projects) ? projectsData.projects : [],
        [projectsData]
    );

    const saveBaselineMutation = useMutation({
        mutationFn: async (data: { label: string; tasks: any[] }) => {
            const res = await fetch("/api/baselines", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workspaceId: activeWorkspaceId,
                    label: data.label,
                    tasks: data.tasks,
                }),
            });
            if (!res.ok) throw new Error("Failed to save baseline");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["baselines", activeWorkspaceId] });
            toast.success("Baseline saved");
        },
        onError: () => {
            toast.error("Failed to save baseline");
        },
    });

    const saveScheduleMutation = useMutation({
        mutationFn: async (data: { workingDays: any; holidays: any[]; projectId?: string }) => {
            const res = await fetch(`/api/projects/${data.projectId || "current"}/schedule`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workingDays: data.workingDays,
                    holidays: data.holidays,
                }),
            });
            if (!res.ok) throw new Error("Failed to save schedule");
            return res.json();
        },
        onSuccess: () => {
            toast.success("Schedule saved");
        },
        onError: () => {
            toast.error("Failed to save schedule");
        },
    });

    const handleSaveView = useCallback(() => {
        if (!viewName.trim() || !user) return;
        const newView = {
            id: `view-${Date.now()}`,
            label: viewName.trim(),
            userId: user.id,
            createdAt: new Date().toISOString(),
            config: {
                zoomLevel,
                groupBy,
                filterStatus,
                filterPriority,
                filterAssignee,
                filterProject,
                filterTag,
                showCriticalPath,
                showWeekends,
                enableRollup,
                schedulingMode,
                searchQuery,
            },
        };
        persistViews([...savedViews, newView]);
        setSaveViewDialog(false);
        setViewName("");
        toast.success("View saved");
    }, [viewName, zoomLevel, groupBy, filterStatus, filterPriority, filterAssignee, filterProject, filterTag, showCriticalPath, showWeekends, enableRollup, schedulingMode, searchQuery, savedViews, persistViews, user]);

    const { data: tasksData, isLoading, isError } = useQuery({
        queryKey: ["gantt-tasks", activeWorkspaceId, projectId],
        queryFn: async () => {
            const params = new URLSearchParams({ workspaceId: activeWorkspaceId! });
            if (projectId) params.set("projectId", projectId);
            const res = await fetch(`/api/tasks?${params}`);
            if (!res.ok) throw new Error("Failed to fetch tasks");
            const data = await res.json();
            return data.tasks;
        },
        enabled: !!activeWorkspaceId
    });

    const tasks = tasksData || [];

    // Extract unique tags from tasks
    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        tasks.forEach((t: any) => {
            if (t.tagIds) t.tagIds.forEach((tagId: string) => tagSet.add(tagId));
            if (t.tags) t.tags.forEach((tag: any) => tagSet.add(typeof tag === "string" ? tag : tag.name || tag.id));
        });
        return Array.from(tagSet);
    }, [tasks]);

    // Extract unique assignees
    const allAssignees = useMemo(() => {
        const assigneeSet = new Set<string>();
        tasks.forEach((t: any) => {
            if (t.assigneeIds) t.assigneeIds.forEach((id: string) => assigneeSet.add(id));
        });
        return Array.from(assigneeSet);
    }, [tasks]);

    // Apply filters
    const filteredTasks = useMemo(() => tasks.filter((t: any) => {
        if (filterStatus !== "all" && t.status !== filterStatus) return false;
        if (filterPriority !== "all" && t.priority !== filterPriority) return false;
        if (filterAssignee !== "all" && (!t.assigneeIds || !t.assigneeIds.includes(filterAssignee))) return false;
        if (filterProject !== "all" && t.projectId !== filterProject) return false;
        if (filterTag !== "all") {
            const hasTag = t.tagIds?.includes(filterTag) || t.tags?.some((tag: any) =>
                (typeof tag === "string" ? tag : tag.name || tag.id) === filterTag
            );
            if (!hasTag) return false;
        }
        return true;
    }), [tasks, filterStatus, filterPriority, filterAssignee, filterProject, filterTag]);

    const handleExport = useCallback(async () => {
        const element = document.getElementById("gantt-capture-area");
        if (!element) return;
        setIsExporting(true);
        try {
            const dataUrl = await toPng(element, { quality: 0.95, style: { borderRadius: '0' } });
            const link = document.createElement('a');
            link.download = `theta-gantt-${new Date().getTime()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) { console.error('Export failed', err); }
        finally { setIsExporting(false); }
    }, []);

    const handleUndoPush = useCallback((cmd: UndoCommand) => {
        setUndoStack(prev => [...prev.slice(-50), cmd]);
        setRedoStack([]);
    }, []);

    const handleUndo = useCallback(async () => {
        const cmd = undoStack[undoStack.length - 1];
        if (!cmd) return;
        try {
            await fetch(`/api/tasks/${cmd.taskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cmd.previous)
            });
            setUndoStack(prev => prev.slice(0, -1));
            setRedoStack(prev => [...prev, cmd]);
        } catch {}
    }, [undoStack]);

    const handleRedo = useCallback(async () => {
        const cmd = redoStack[redoStack.length - 1];
        if (!cmd) return;
        try {
            await fetch(`/api/tasks/${cmd.taskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cmd.next)
            });
            setRedoStack(prev => prev.slice(0, -1));
            setUndoStack(prev => [...prev, cmd]);
        } catch {}
    }, [redoStack]);

    const handleSaveBaseline = useCallback(() => {
        if (!baselineLabel.trim()) return;
        const baselineTasks = tasks.map((t: any) => ({
            id: t.id,
            title: t.title,
            startDate: t.startDate,
            dueDate: t.dueDate,
        }));
        saveBaselineMutation.mutate({ label: baselineLabel.trim(), tasks: baselineTasks });
        setBaselineLabel("");
        setBaselineDialog(false);
    }, [baselineLabel, tasks, saveBaselineMutation]);

    const applyView = useCallback((view: any) => {
        if (!view.config) return;
        const cfg = view.config;
        if (cfg.zoomLevel) setZoomLevel(cfg.zoomLevel);
        if (cfg.groupBy) setGroupBy(cfg.groupBy);
        if (cfg.filterStatus) setFilterStatus(cfg.filterStatus);
        if (cfg.filterPriority) setFilterPriority(cfg.filterPriority);
        if (cfg.filterAssignee) setFilterAssignee(cfg.filterAssignee);
        if (cfg.filterProject) setFilterProject(cfg.filterProject);
        if (cfg.filterTag) setFilterTag(cfg.filterTag);
        if (cfg.showCriticalPath !== undefined) setShowCriticalPath(cfg.showCriticalPath);
        if (cfg.showWeekends !== undefined) setShowWeekends(cfg.showWeekends);
        if (cfg.enableRollup !== undefined) setEnableRollup(cfg.enableRollup);
        if (cfg.schedulingMode) setSchedulingMode(cfg.schedulingMode);
        if (cfg.searchQuery !== undefined) setSearchQuery(cfg.searchQuery);
        toast.success(`Applied view: ${view.label}`);
    }, []);

    const deleteView = useCallback(async (viewId: string) => {
        persistViews(savedViews.filter((v: any) => v.id !== viewId));
        toast.success("View deleted");
    }, [savedViews, persistViews]);

    const handleTaskClick = useCallback((task: any) => {
        if (!task || task._isGroupHeader) return;
        setSelectedTask(task);
        setIsTaskDialogOpen(true);
    }, []);

    const handleRecalculate = useCallback(async () => {
        try {
            const res = await fetch(`/api/gantt/schedule?workspaceId=${activeWorkspaceId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workingDays, holidays }),
            });
            if (!res.ok) throw new Error("Recalculation failed");
            const data = await res.json();
            invalidateTaskCaches({ queryClient, workspaceId: activeWorkspaceId });
            toast.success(`Schedules recalculated for ${data.updatedCount || 0} tasks`);
        } catch {
            toast.error("Failed to recalculate schedules");
        }
    }, [activeWorkspaceId, workingDays, holidays, queryClient]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filterStatus !== "all") count++;
        if (filterPriority !== "all") count++;
        if (filterAssignee !== "all") count++;
        if (filterTag !== "all") count++;
        if (filterProject !== "all") count++;
        return count;
    }, [filterStatus, filterPriority, filterAssignee, filterTag, filterProject]);

    if (isLoading) {
        return (
            <div className="space-y-6 p-6">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-[600px] w-full rounded-lg" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center gap-4 p-6">
                <div className="rounded-full bg-destructive/10 p-4">
                    <BarChart3 className="h-8 w-8 text-destructive" />
                </div>
                <h2 className="text-lg font-semibold">Failed to load Gantt chart</h2>
                <p className="text-sm text-muted-foreground">Could not fetch tasks. Please try again.</p>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
            </div>
        );
    }

    if (tasks.length === 0) {
        return (
            <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center gap-4 p-6">
                <div className="rounded-full bg-muted p-4">
                    <BarChart3 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-semibold">No tasks to display</h2>
                <p className="text-sm text-muted-foreground text-center">Create tasks with start and due dates to schedule your project.</p>
                <Button className="text-xs" size="sm" onClick={() => setIsCreateTaskOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> New Task
                </Button>
            </div>
        );
    }

    return (
        <div className={`flex flex-col overflow-hidden transition-all duration-500 ${isFullScreen ? "fixed inset-0 z-[100] bg-background" : "h-[calc(100vh-100px)]"}`}>
            <header className="flex items-center justify-between px-8 py-3">
                <div className="flex items-center gap-4">
                    <div className="p-1.5 bg-primary/10 rounded-lg">
                        <BarChart3 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold flex items-center gap-2">
                            Gantt Chart
                            <Badge variant="outline" className="text-[10px] rounded-md px-2 py-0 font-normal">Enterprise</Badge>
                        </h1>
                        <p className="text-[11px] text-muted-foreground">Project scheduling &mdash; plan and execute</p>
                    </div>
                    <div className="h-7 w-px bg-border mx-2" />
                    <ZoomController zoomLevel={zoomLevel} onZoomChange={setZoomLevel} variant="gantt" />
                </div>

                <div className="flex items-center gap-2">
                    {/* Undo/Redo */}
                    <div className="flex items-center gap-0.5 border rounded-md p-0.5 bg-muted/30">
                        <TooltipProvider>
                            <Tooltip content="Undo (Ctrl+Z)">
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm" onClick={handleUndo} disabled={undoStack.length === 0}>
                                        <Undo2 className="h-3.5 w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                            </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                            <Tooltip content="Redo (Ctrl+Shift+Z)">
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm" onClick={handleRedo} disabled={redoStack.length === 0}>
                                        <Redo2 className="h-3.5 w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    {/* Scheduling mode toggle */}
                    <TooltipProvider>
                        <Tooltip content={schedulingMode === "auto" ? "Auto-scheduling enabled" : "Manual scheduling"}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={schedulingMode === "auto" ? "default" : "outline"}
                                    size="sm"
                                    className="h-8 text-xs rounded-md px-2.5"
                                    onClick={() => setSchedulingMode(m => m === "auto" ? "manual" : "auto")}
                                >
                                    <Workflow className="h-3.5 w-3.5 mr-1" />
                                    {schedulingMode === "auto" ? "Auto" : "Manual"}
                                </Button>
                            </TooltipTrigger>
                        </Tooltip>
                    </TooltipProvider>

                    {/* Presence */}
                    {activeWorkspaceId && <PresenceAvatars workspaceId={activeWorkspaceId} />}

                    {/* Search */}
                    <div className="relative w-44">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input placeholder="Filter tasks..." className="h-8 pl-8 text-xs rounded-md" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>

                    {/* Full screen */}
                    <TooltipProvider>
                        <Tooltip content="Full screen">
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => setIsFullScreen(!isFullScreen)}>
                                    {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                                </Button>
                            </TooltipTrigger>
                        </Tooltip>
                    </TooltipProvider>

                    {/* Export */}
                    <Button variant="outline" size="sm" className="h-8 text-xs rounded-md px-2.5" disabled={isExporting} onClick={handleExport}>
                        <Download className="h-3.5 w-3.5 mr-1" /> {isExporting ? "..." : "PNG"}
                    </Button>

                    <Button className="h-8 text-xs rounded-md px-3" onClick={() => setIsCreateTaskOpen(true)}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                </div>
            </header>

            {/* Toolbar */}
            <div className="flex items-center justify-between px-8 py-1.5 border-b border-subtle">
                <div className="flex items-center gap-3 text-[10px]">
                    {/* Critical Path toggle */}
                    <TooltipProvider>
                        <Tooltip content="Highlight critical path tasks">
                            <TooltipTrigger asChild>
                                <Button
                                    variant={showCriticalPath ? "secondary" : "ghost"}
                                    size="sm"
                                    className="h-6 text-[10px] px-2 rounded-sm"
                                    onClick={() => setShowCriticalPath(!showCriticalPath)}
                                >
                                    <GitBranch className="h-3 w-3 mr-1" /> Critical Path
                                </Button>
                            </TooltipTrigger>
                        </Tooltip>
                    </TooltipProvider>

                    {/* Weekend toggle */}
                    <TooltipProvider>
                        <Tooltip content="Show/hide weekend highlighting">
                            <TooltipTrigger asChild>
                                <Button
                                    variant={showWeekends ? "secondary" : "ghost"}
                                    size="sm"
                                    className="h-6 text-[10px] px-2 rounded-sm"
                                    onClick={() => setShowWeekends(!showWeekends)}
                                >
                                    {showWeekends ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                                    Weekends
                                </Button>
                            </TooltipTrigger>
                        </Tooltip>
                    </TooltipProvider>

                    {/* Roll-up toggle */}
                    <TooltipProvider>
                        <Tooltip content="Roll-up progress and dates from subtasks">
                            <TooltipTrigger asChild>
                                <Button
                                    variant={enableRollup ? "secondary" : "ghost"}
                                    size="sm"
                                    className="h-6 text-[10px] px-2 rounded-sm"
                                    onClick={() => setEnableRollup(!enableRollup)}
                                >
                                    <Layers className="h-3 w-3 mr-1" /> Roll-up
                                </Button>
                            </TooltipTrigger>
                        </Tooltip>
                    </TooltipProvider>

                    <span className="text-muted-foreground/30">|</span>

                    {/* Legend */}
                    <span className="flex items-center gap-1 text-muted-foreground">
                        <Link2 className="h-3 w-3 text-violet-400" /> Dependencies
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                        <Milestone className="h-3 w-3 text-amber-500" /> Milestones
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3 w-3 text-emerald-500" /> Resources
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                        <Flag className="h-3 w-3 text-blue-500" /> Baselines
                    </span>

                    <span className="text-muted-foreground/30">|</span>

                    {/* Baseline */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 rounded-sm">
                                <Save className="h-3 w-3 mr-1" /> Baseline
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2 rounded-lg" align="start">
                            <div className="space-y-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-xs h-7"
                                    onClick={() => setBaselineDialog(true)}
                                >
                                    <Save className="h-3 w-3 mr-2" /> Save Baseline
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-xs h-7"
                                    onClick={() => setShowBaselines(!showBaselines)}
                                >
                                    <RotateCcw className="h-3 w-3 mr-2" /> {showBaselines ? "Hide" : "Show"} Baselines
                                </Button>
                                {baselines.length > 0 && (
                                    <>
                                        <DropdownMenuSeparator />
                                        {baselines.map((b: any, i: number) => (
                                            <div key={i} className="text-[10px] text-muted-foreground px-2 py-1 truncate">
                                                {b.label} · {new Date(b.createdAt || "").toLocaleDateString()}
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Filters */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 rounded-sm relative">
                                <Filter className="h-3 w-3 mr-1" />
                                Filters
                                {activeFilterCount > 0 && (
                                    <span className="ml-1 w-3.5 h-3.5 rounded-full bg-primary text-[7px] font-bold flex items-center justify-center text-primary-foreground">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3 rounded-lg" align="start">
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-[10px] text-muted-foreground">Status</Label>
                                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                                        <SelectTrigger className="h-7 text-[10px] mt-1"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all" className="text-[10px]">All Statuses</SelectItem>
                                            <SelectItem value="todo" className="text-[10px]">To Do</SelectItem>
                                            <SelectItem value="in_progress" className="text-[10px]">In Progress</SelectItem>
                                            <SelectItem value="done" className="text-[10px]">Completed</SelectItem>
                                            <SelectItem value="blocked" className="text-[10px]">Blocked</SelectItem>
                                            <SelectItem value="backlog" className="text-[10px]">Backlog</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-[10px] text-muted-foreground">Priority</Label>
                                    <Select value={filterPriority} onValueChange={setFilterPriority}>
                                        <SelectTrigger className="h-7 text-[10px] mt-1"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all" className="text-[10px]">All Priorities</SelectItem>
                                            <SelectItem value="urgent" className="text-[10px]">Urgent</SelectItem>
                                            <SelectItem value="high" className="text-[10px]">High</SelectItem>
                                            <SelectItem value="medium" className="text-[10px]">Medium</SelectItem>
                                            <SelectItem value="low" className="text-[10px]">Low</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-[10px] text-muted-foreground">Project</Label>
                                    <Select value={filterProject} onValueChange={setFilterProject}>
                                        <SelectTrigger className="h-7 text-[10px] mt-1"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all" className="text-[10px]">All Projects</SelectItem>
                                            {projects.map((p: any) => (
                                                <SelectItem key={p.id} value={p.id} className="text-[10px]">{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-[10px] h-7 flex-1"
                                        onClick={() => {
                                            setFilterStatus("all");
                                            setFilterPriority("all");
                                            setFilterAssignee("all");
                                            setFilterTag("all");
                                            setFilterProject("all");
                                        }}
                                    >
                                        Clear All
                                    </Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Group by */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 rounded-sm">
                                <LayoutList className="h-3 w-3 mr-1" />
                                {groupBy === "none" ? "No Group" : `By ${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}`}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-40 p-1 rounded-lg" align="start">
                            {(["none", "project", "assignee", "status", "priority"] as const).map((g) => (
                                <Button
                                    key={g}
                                    variant={groupBy === g ? "secondary" : "ghost"}
                                    size="sm"
                                    className="w-full justify-start text-xs h-7"
                                    onClick={() => setGroupBy(g)}
                                >
                                    {g === "none" ? "No Grouping" : `By ${g.charAt(0).toUpperCase() + g.slice(1)}`}
                                </Button>
                            ))}
                        </PopoverContent>
                    </Popover>

                    {/* Saved Views */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 rounded-sm">
                                <Eye className="h-3 w-3 mr-1" /> Views
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2 rounded-lg" align="start">
                            <div className="space-y-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-xs h-7"
                                    onClick={() => { setViewName(""); setSaveViewDialog(true); }}
                                >
                                    <Save className="h-3 w-3 mr-2" /> Save Current View
                                </Button>
                                {savedViews.length > 0 && <DropdownMenuSeparator />}
                                {savedViews.map((view: any, i: number) => (
                                    <div key={view.id || i} className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="flex-1 justify-start text-[10px] h-7 truncate"
                                            onClick={() => applyView(view)}
                                        >
                                            {view.label}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                            onClick={() => deleteView(view.id)}
                                        >
                                            ×
                                        </Button>
                                    </div>
                                ))}
                                {savedViews.length === 0 && (
                                    <p className="text-[10px] text-muted-foreground text-center py-2">No saved views</p>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Schedule options */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 rounded-sm">
                                <Settings2 className="h-3 w-3 mr-1" /> Options
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48 rounded-lg">
                            <DropdownMenuItem className="text-xs py-1.5" onClick={() => setWorkingDaysDialog(true)}>
                                Set Working Days
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-xs py-1.5" onClick={() => setHolidaysDialog(true)}>
                                Manage Holidays
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-xs py-1.5" onClick={handleRecalculate}>
                                <RotateCcw className="h-3 w-3 mr-2" /> Recalculate All
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="text-[10px] text-muted-foreground flex items-center gap-3">
                    <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3" /> {filteredTasks.length} of {tasks.length} tasks
                    </span>
                    <span className="flex items-center gap-1">
                        <Workflow className="h-3 w-3" /> {schedulingMode === "auto" ? "Auto-scheduling" : "Manual"}
                    </span>
                    {activeFilterCount > 0 && (
                        <span className="flex items-center gap-1 text-primary">
                            <Filter className="h-3 w-3" /> {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active
                        </span>
                    )}
                    {groupBy !== "none" && (
                        <span className="flex items-center gap-1">
                            <LayoutList className="h-3 w-3" /> Grouped by {groupBy}
                        </span>
                    )}
                    <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Synced
                    </span>
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 relative overflow-hidden" id="gantt-capture-area">
                <TimelineCanvas
                    tasks={filteredTasks}
                    zoomLevel={zoomLevel}
                    searchQuery={searchQuery}
                    variant="gantt"
                    showCriticalPath={showCriticalPath}
                    schedulingMode={schedulingMode}
                    onUndoPush={handleUndoPush}
                    groupBy={groupBy}
                    onTaskClick={handleTaskClick}
                    showWeekends={showWeekends}
                    enableRollup={enableRollup}
                />
            </div>

            {/* Baseline Dialog */}
            <Dialog open={baselineDialog} onOpenChange={setBaselineDialog}>
                <DialogContent className="sm:max-w-[400px] rounded-xl">
                    <DialogHeader>
                        <DialogTitle className="text-sm flex items-center gap-2">
                            <Save className="h-4 w-4 text-primary" />
                            Save Project Baseline
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Captures current start/end dates of all tasks for variance tracking.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-3">
                        <Label className="text-xs text-muted-foreground">Baseline Name</Label>
                        <Input
                            className="h-9 text-xs mt-1.5"
                            placeholder="e.g. Sprint 1 Baseline"
                            value={baselineLabel}
                            onChange={(e) => setBaselineLabel(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setBaselineDialog(false)}>Cancel</Button>
                        <Button size="sm" className="text-xs h-8" onClick={handleSaveBaseline} disabled={!baselineLabel.trim()}>
                            <Save className="h-3.5 w-3.5 mr-1" /> Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Save View Dialog */}
            <Dialog open={saveViewDialog} onOpenChange={setSaveViewDialog}>
                <DialogContent className="sm:max-w-[400px] rounded-xl">
                    <DialogHeader>
                        <DialogTitle className="text-sm flex items-center gap-2">
                            <Eye className="h-4 w-4 text-primary" />
                            Save Gantt View
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Saves current filters, grouping, and zoom settings for quick access.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-3">
                        <Label className="text-xs text-muted-foreground">View Name</Label>
                        <Input
                            className="h-9 text-xs mt-1.5"
                            placeholder="e.g. Sprint Planning View"
                            value={viewName}
                            onChange={(e) => setViewName(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setSaveViewDialog(false)}>Cancel</Button>
                        <Button size="sm" className="text-xs h-8" onClick={handleSaveView} disabled={!viewName.trim()}>
                            <Eye className="h-3.5 w-3.5 mr-1" /> Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Working Days Dialog */}
            <Dialog open={workingDaysDialog} onOpenChange={setWorkingDaysDialog}>
                <DialogContent className="sm:max-w-[400px] rounded-xl">
                    <DialogHeader>
                        <DialogTitle className="text-sm flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-primary" />
                            Set Working Days
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Configure which days are considered working days for scheduling.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-3 space-y-2">
                        {Object.entries(workingDays).map(([day, enabled]) => (
                            <div key={day} className="flex items-center justify-between p-2 rounded-lg border">
                                <Label className="text-xs capitalize">{day}</Label>
                                <input
                                    type="checkbox"
                                    checked={enabled}
                                    onChange={(e) => setWorkingDays(prev => ({ ...prev, [day]: e.target.checked }))}
                                    className="h-4 w-4"
                                />
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setWorkingDaysDialog(false)}>Cancel</Button>
                        <Button size="sm" className="text-xs h-8" onClick={() => {
                            saveScheduleMutation.mutate({ workingDays, holidays, projectId: "" });
                            setWorkingDaysDialog(false);
                        }}>
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Holidays Dialog */}
            <Dialog open={holidaysDialog} onOpenChange={setHolidaysDialog}>
                <DialogContent className="sm:max-w-[450px] rounded-xl">
                    <DialogHeader>
                        <DialogTitle className="text-sm flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-primary" />
                            Manage Holidays
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Add holidays that should be excluded from scheduling.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-3 space-y-3">
                        <div className="flex gap-2">
                            <Input
                                type="date"
                                className="h-8 text-xs flex-1"
                                value={holidayDate}
                                onChange={(e) => setHolidayDate(e.target.value)}
                            />
                            <Input
                                className="h-8 text-xs flex-1"
                                placeholder="Holiday name"
                                value={holidayLabel}
                                onChange={(e) => setHolidayLabel(e.target.value)}
                            />
                            <Button
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => {
                                    if (holidayDate && holidayLabel) {
                                        setHolidays(prev => [...prev, { date: holidayDate, label: holidayLabel }]);
                                        setHolidayDate("");
                                        setHolidayLabel("");
                                    }
                                }}
                            >
                                Add
                            </Button>
                        </div>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                            {holidays.map((h, i) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded-lg border text-xs">
                                    <span>{h.label}</span>
                                    <span className="text-muted-foreground">{h.date}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-destructive"
                                        onClick={() => setHolidays(prev => prev.filter((_, idx) => idx !== i))}
                                    >
                                        ×
                                    </Button>
                                </div>
                            ))}
                            {holidays.length === 0 && (
                                <p className="text-xs text-muted-foreground text-center py-4">No holidays configured</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setHolidaysDialog(false)}>Cancel</Button>
                        <Button size="sm" className="text-xs h-8" onClick={() => {
                            saveScheduleMutation.mutate({ workingDays, holidays, projectId: "" });
                            setHolidaysDialog(false);
                        }}>
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Task Dialog */}
            {selectedTask && activeWorkspaceId && (
                <TaskDialog
                    task={selectedTask}
                    isOpen={isTaskDialogOpen}
                    onClose={() => {
                        setIsTaskDialogOpen(false);
                        setSelectedTask(null);
                    }}
                    workspaceId={activeWorkspaceId}
                />
            )}

            <CreateTaskDialog isOpen={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen} />
        </div>
    );
}