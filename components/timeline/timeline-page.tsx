"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { CalendarDays, Filter, Plus, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import TimelineCanvas from "./timeline-canvas";
import { ZoomController } from "@/components/shared/timeline/zoom-controller";
import { exportTimeline } from "@/lib/export/export-service";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import type { ZoomLevel } from "@/components/shared/timeline/types";

export default function TimelinePage() {
    const { activeWorkspaceId } = useWorkspace();
    const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("week");
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
    const [filterPriority, setFilterPriority] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");

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

    const filteredTasks = tasks.filter((t: any) => {
        const matchesPriority = filterPriority === "all" || t.priority === filterPriority;
        const matchesStatus = filterStatus === "all" || t.status === filterStatus;
        return matchesPriority && matchesStatus;
    });

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between mb-8">
                    <Skeleton className="h-8 w-48" />
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-32 rounded-lg" />
                        <Skeleton className="h-10 w-32 rounded-lg" />
                    </div>
                </div>
                <div className="border rounded-lg p-4 min-h-[600px] bg-muted/30">
                    <Skeleton className="h-full w-full rounded-md" />
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center gap-4">
                <div className="rounded-full bg-destructive/10 p-4">
                    <CalendarDays className="h-8 w-8 text-destructive" />
                </div>
                <h2 className="text-lg font-semibold">Failed to load timeline</h2>
                <p className="text-sm text-muted-foreground">Could not fetch your tasks. Please try again.</p>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
            </div>
        );
    }

    if (tasks.length === 0) {
        return (
            <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center gap-4">
                <div className="rounded-full bg-muted p-4">
                    <CalendarDays className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-semibold">No tasks yet</h2>
                <p className="text-sm text-muted-foreground">Create your first task to see it on the timeline.</p>
                <Button className="text-xs" size="sm" onClick={() => setIsCreateTaskOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> New Task
                </Button>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col overflow-hidden">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 lg:px-6 border-b bg-background/80 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <h1 className="text-lg font-semibold flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-primary" />
                        Timeline
                        <Badge variant="outline" className="text-xs rounded-md px-2 py-0 ml-1">Roadmap</Badge>
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <ZoomController zoomLevel={zoomLevel} onZoomChange={setZoomLevel} variant="timeline" />

                    <div className="h-8 w-px bg-border mx-1 hidden sm:block" />

                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 text-xs rounded-md px-3">
                                    <Download className="h-3.5 w-3.5 mr-1.5" /> Export
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-40">
                                <DropdownMenuItem onClick={() => exportTimeline({ format: "csv", tasks })} className="text-xs py-1.5">CSV</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => exportTimeline({ format: "json", tasks })} className="text-xs py-1.5">JSON</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => exportTimeline({ format: "pdf", tasks })} className="text-xs py-1.5">PDF</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 text-xs rounded-md px-3">
                                    <Filter className="h-3.5 w-3.5 mr-1.5" />
                                    {(filterPriority !== "all" || filterStatus !== "all") ? "Filtered" : "Filter"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-4 rounded-lg" align="end">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Status</Label>
                                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Statuses</SelectItem>
                                                <SelectItem value="todo">To Do</SelectItem>
                                                <SelectItem value="in_progress">In Progress</SelectItem>
                                                <SelectItem value="done">Completed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Priority</Label>
                                        <Select value={filterPriority} onValueChange={setFilterPriority}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All Priorities" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Priorities</SelectItem>
                                                <SelectItem value="high">High</SelectItem>
                                                <SelectItem value="medium">Medium</SelectItem>
                                                <SelectItem value="low">Low</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button variant="ghost" size="sm" className="w-full text-xs h-8"
                                        onClick={() => { setFilterPriority("all"); setFilterStatus("all"); }}>
                                        Clear Filters
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <Button className="h-9 text-xs rounded-md px-4" onClick={() => setIsCreateTaskOpen(true)}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> New Task
                        </Button>
                    </div>
                </div>
            </header>

            <div className="flex items-center justify-between px-4 lg:px-6 py-2 border-b bg-muted/20">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Today
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-1 rounded bg-muted-foreground/30" /> Task duration
                    </span>
                </div>
                <div className="relative w-56">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Search tasks..." className="h-8 pl-9 text-xs rounded-md" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <TimelineCanvas tasks={filteredTasks} zoomLevel={zoomLevel} searchQuery={searchQuery} variant="timeline" />
            </div>

            <CreateTaskDialog isOpen={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen} />
        </div>
    );
}
