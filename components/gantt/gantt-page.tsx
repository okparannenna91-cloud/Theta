"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import {
    BarChart3, Filter, Plus, Search, Download,
    Settings2, Clock, Maximize2, Minimize2, Undo2, Redo2, Link2,
    GitBranch, CalendarDays, Users, Workflow, Milestone, Save,
    RotateCcw, Flag, AlertTriangle, Activity,
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
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { ZoomLevel, UndoCommand, Baseline } from "@/components/shared/timeline/types";

export default function GanttPage() {
    const { activeWorkspaceId } = useWorkspace();
    const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("week");
    const [searchQuery, setSearchQuery] = useState("");
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
    const [showCriticalPath, setShowCriticalPath] = useState(true);
    const [schedulingMode, setSchedulingMode] = useState<"auto" | "manual">("auto");
    const [undoStack, setUndoStack] = useState<UndoCommand[]>([]);
    const [redoStack, setRedoStack] = useState<UndoCommand[]>([]);
    const [baselines, setBaselines] = useState<Baseline[]>([]);
    const [baselineDialog, setBaselineDialog] = useState(false);
    const [baselineLabel, setBaselineLabel] = useState("");
    const [showBaselines, setShowBaselines] = useState(true);

    const { data: tasksData, isLoading, isError } = useQuery({
        queryKey: ["timeline-tasks", activeWorkspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/tasks?workspaceId=${activeWorkspaceId}`);
            if (!res.ok) throw new Error("Failed to fetch tasks");
            const data = await res.json();
            return data.tasks;
        },
        enabled: !!activeWorkspaceId
    });

    const tasks = tasksData || [];

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
        const newBaseline: Baseline = {
            startDate: new Date().toISOString(),
            dueDate: new Date().toISOString(),
            label: baselineLabel.trim(),
            createdAt: new Date().toISOString(),
        };
        const baselineData = { ...newBaseline, tasks: baselineTasks };
        setBaselines(prev => [...prev, baselineData]);
        localStorage.setItem(`theta-baseline-${activeWorkspaceId}`, JSON.stringify(baselineData));
        setBaselineLabel("");
        setBaselineDialog(false);
    }, [baselineLabel, tasks, activeWorkspaceId]);

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
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-3 border-b bg-background/80 backdrop-blur-sm">
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
            <div className="flex items-center justify-between px-6 py-1.5 border-b bg-muted/10">
                <div className="flex items-center gap-3 text-[10px]">
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

                    <span className="text-muted-foreground/30">|</span>

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
                                        {baselines.map((b, i) => (
                                            <div key={i} className="text-[10px] text-muted-foreground px-2 py-1 truncate">
                                                {b.label} · {new Date(b.createdAt || "").toLocaleDateString()}
                                            </div>
                                        ))}
                                    </>
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
                        <DropdownMenuContent className="w-44 rounded-lg">
                            <DropdownMenuItem className="text-xs py-1.5">Set Working Days</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs py-1.5">Manage Holidays</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-xs py-1.5">
                                <RotateCcw className="h-3 w-3 mr-2" /> Recalculate All
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="text-[10px] text-muted-foreground flex items-center gap-3">
                    <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3" /> {tasks.length} tasks
                    </span>
                    <span className="flex items-center gap-1">
                        <Workflow className="h-3 w-3" /> {schedulingMode === "auto" ? "Auto-scheduling" : "Manual"}
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Synced
                    </span>
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 relative overflow-hidden" id="gantt-capture-area">
                <TimelineCanvas
                    tasks={tasks}
                    zoomLevel={zoomLevel}
                    searchQuery={searchQuery}
                    variant="gantt"
                    showCriticalPath={showCriticalPath}
                    schedulingMode={schedulingMode}
                    onUndoPush={handleUndoPush}
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

            <CreateTaskDialog isOpen={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen} />
        </div>
    );
}
