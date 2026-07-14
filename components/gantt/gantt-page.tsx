"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import {
    BarChart3, Filter, Plus, ChevronLeft, ChevronRight, Search, Download,
    Settings2, Clock, Maximize2, Minimize2, Undo2, Redo2, Link2,
    GitBranch, CalendarDays, Users, Workflow, Milestone,
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
import type { ZoomLevel, UndoCommand } from "@/components/shared/timeline/types";

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

    const handleExport = async () => {
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
    };

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

    const tasks = tasksData || [];

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-[600px] w-full rounded-lg" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center gap-4">
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
                <p className="text-sm text-muted-foreground text-center">Create tasks with start and due dates to visualize them on the Gantt chart.</p>
            </div>
        );
    }

    return (
        <div className={`flex flex-col overflow-hidden transition-all duration-500 ${isFullScreen ? "fixed inset-0 z-[100] bg-background" : "h-[calc(100vh-100px)]"}`}>
            <header className="flex items-center justify-between px-6 py-4 border-b bg-background/80 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-semibold flex items-center gap-3">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        Gantt Chart
                        <Badge variant="outline" className="text-xs rounded-md px-2 py-0">Enterprise</Badge>
                        <Badge variant={schedulingMode === "auto" ? "default" : "outline"} className="text-[10px] px-2 py-0 h-5 cursor-pointer" onClick={() => setSchedulingMode(m => m === "auto" ? "manual" : "auto")}>
                            <Workflow className="h-3 w-3 mr-1" /> {schedulingMode === "auto" ? "Auto Schedule" : "Manual"}
                        </Badge>
                    </h1>
                    <ZoomController zoomLevel={zoomLevel} onZoomChange={setZoomLevel} variant="gantt" />
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={handleUndo} disabled={undoStack.length === 0} title="Undo">
                            <Undo2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={handleRedo} disabled={redoStack.length === 0} title="Redo">
                            <Redo2 className="h-4 w-4" />
                        </Button>
                    </div>
                    {activeWorkspaceId && <PresenceAvatars workspaceId={activeWorkspaceId} />}
                    <div className="relative w-56">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input placeholder="Filter tasks..." className="h-9 pl-9 text-xs" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setIsFullScreen(!isFullScreen)}>
                        {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                    <Button className="h-9 text-xs" onClick={() => setIsCreateTaskOpen(true)}>
                        <Plus className="h-3.5 w-3.5 mr-2" /> Add Phase
                    </Button>
                </div>
            </header>

            <div className="flex items-center justify-between px-6 py-2 border-b bg-muted/20">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500" /> Critical Path
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Link2 className="h-3 w-3 text-violet-400" /> Dependencies
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Milestone className="h-3 w-3 text-amber-500" /> Milestone
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Users className="h-3 w-3 text-emerald-500" /> Resource
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => setShowCriticalPath(!showCriticalPath)}
                    >
                        <GitBranch className="h-3 w-3 mr-1" /> {showCriticalPath ? "Hide" : "Show"} Critical
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5 mr-1.5" /> Baseline Compare
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
                        <Settings2 className="h-3.5 w-3.5 mr-1.5" /> Schedule Options
                    </Button>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden" id="gantt-capture-area">
                <TimelineCanvas
                    tasks={tasks}
                    zoomLevel={zoomLevel}
                    searchQuery={searchQuery}
                    variant="gantt"
                    onUndoPush={handleUndoPush}
                />
            </div>

            <footer className="h-12 bg-background/80 backdrop-blur-sm border-t flex items-center justify-between px-6">
                <div className="text-xs text-muted-foreground flex items-center gap-4">
                    <span className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        Last Sync: Just Now
                    </span>
                    <span className="flex items-center gap-2">
                        <Workflow className="h-3 w-3" />
                        Mode: {schedulingMode === "auto" ? "Auto-scheduling" : "Manual"}
                    </span>
                    <span className="flex items-center gap-2">
                        <BarChart3 className="h-3 w-3" />
                        {tasks.length} tasks
                    </span>
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-xs" disabled={isExporting} onClick={handleExport}>
                    <Download className="h-3.5 w-3.5 mr-1.5" /> {isExporting ? "Exporting..." : "Export PNG"}
                </Button>
            </footer>

            <CreateTaskDialog isOpen={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen} />
        </div>
    );
}
