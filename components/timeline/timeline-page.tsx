"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { motion, AnimatePresence } from "framer-motion";
import { 
    GanttChartSquare, 
    Calendar, 
    Filter, 
    Plus, 
    ChevronLeft, 
    ChevronRight,
    Search,
    Download,
    Settings2,
    LayoutGrid,
    Clock,
    Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import TimelineCanvas from "./timeline-canvas";
import { MotionWrapper, FadeIn } from "@/components/common/motion-wrapper";
import { exportTimeline } from "@/lib/export/export-service";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";

export type ZoomLevel = "hour" | "day" | "week" | "month" | "quarter" | "year";

export default function TimelinePage() {
    const { activeWorkspaceId } = useWorkspace();
    const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("week");
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"project" | "team" | "personal">("project");
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
    const [filterPriority, setFilterPriority] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");

    const { data: tasksData, isLoading } = useQuery({
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

    const zoomOptions: { label: string, value: ZoomLevel }[] = [
        { label: "Day", value: "day" },
        { label: "Week", value: "week" },
        { label: "Month", value: "month" },
        { label: "Quarter", value: "quarter" },
    ];

    if (isLoading) {
        return (
            <div className="p-8 space-y-6">
                <div className="flex items-center justify-between mb-8">
                    <Skeleton className="h-10 w-64" />
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-32" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                </div>
                <div className="border rounded-3xl p-4 min-h-[600px] bg-slate-50/50 dark:bg-slate-900/50">
                    <Skeleton className="h-full w-full rounded-2xl" />
                </div>
            </div>
        );
    }

    return (
        <MotionWrapper className="h-[calc(100vh-100px)] flex flex-col overflow-hidden relative">
            {/* Background Decorative Gradient */}
            <div className="absolute top-0 right-0 -z-10 w-[800px] h-[800px] bg-primary/5 blur-[150px] rounded-full pointer-events-none" />
            
            {/* Header Control Bar */}
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6 lg:px-10 border-b bg-background/50 backdrop-blur-xl z-20">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
                        <GanttChartSquare className="h-8 w-8 text-primary" />
                        Timeline
                        <Badge variant="outline" className="ml-2 bg-primary/5 text-primary border-primary/20 font-black uppercase tracking-widest text-[9px]">Beta</Badge>
                    </h1>
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Strategic Roadmap Synchronization</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-secondary/50 p-1 rounded-2xl border border-white/5 shadow-inner">
                        {zoomOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setZoomLevel(opt.value)}
                                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    zoomLevel === opt.value 
                                    ? "bg-white dark:bg-slate-800 text-primary shadow-lg" 
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    <div className="h-10 w-[1px] bg-border mx-2 hidden sm:block" />

                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="rounded-xl h-10 border-white/10 bg-white/5 font-black uppercase tracking-widest text-[10px] px-4">
                                    <Download className="h-3.5 w-3.5 mr-2" /> Export
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="rounded-xl border-white/10 shadow-2xl">
                                <DropdownMenuItem onClick={() => exportTimeline({ format: "csv", tasks })} className="text-[10px] font-black uppercase tracking-widest py-2">Download CSV</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => exportTimeline({ format: "json", tasks })} className="text-[10px] font-black uppercase tracking-widest py-2">Download JSON</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => exportTimeline({ format: "pdf", tasks })} className="text-[10px] font-black uppercase tracking-widest py-2">Print Roadmap</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="rounded-xl h-10 border-white/10 bg-white/5 font-black uppercase tracking-widest text-[10px] px-4">
                                    <Filter className="h-3.5 w-3.5 mr-2" /> 
                                    {(filterPriority !== "all" || filterStatus !== "all") ? "Filtered" : "Filter"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-4 rounded-2xl border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900" align="end">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</Label>
                                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="All Statuses" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Statuses</SelectItem>
                                                <SelectItem value="todo">To Do</SelectItem>
                                                <SelectItem value="in-progress">In Progress</SelectItem>
                                                <SelectItem value="completed">Completed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Priority</Label>
                                        <Select value={filterPriority} onValueChange={setFilterPriority}>
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="All Priorities" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Priorities</SelectItem>
                                                <SelectItem value="high">High</SelectItem>
                                                <SelectItem value="medium">Medium</SelectItem>
                                                <SelectItem value="low">Low</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="w-full text-xs font-bold mt-2 h-8 text-slate-500" 
                                        onClick={() => { setFilterPriority("all"); setFilterStatus("all"); }}
                                    >
                                        Clear Filters
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <Button className="rounded-xl h-10 shadow-lg shadow-primary/20 font-black uppercase tracking-widest text-[10px] px-6" onClick={() => setIsCreateTaskOpen(true)}>
                            <Plus className="h-3.5 w-3.5 mr-2" /> New Task
                        </Button>
                    </div>
                </div>
            </header>

            {/* Sub-header Context Bar */}
            <div className="flex items-center justify-between px-6 lg:px-10 py-3 bg-white/5 border-b z-20">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-1.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs font-black uppercase tracking-widest text-foreground min-w-[120px] text-center">October 2026</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    <div className="h-6 w-[1px] bg-border" />

                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Local Time: 15:58</span>
                    </div>
                </div>

                <div className="relative group w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input 
                        placeholder="SEARCH TASKS..." 
                        className="h-9 pl-9 rounded-xl text-[10px] font-black uppercase tracking-widest border-white/5 bg-secondary/30 focus-visible:ring-primary/30"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden">
                <TimelineCanvas 
                    tasks={filteredTasks} 
                    zoomLevel={zoomLevel} 
                    searchQuery={searchQuery} 
                />
            </div>

            {/* AI Assistant Floating Hint */}
            <div className="absolute bottom-8 right-8 z-30">
                <Button className="rounded-2xl h-14 px-8 shadow-2xl shadow-indigo-500/30 bg-indigo-600 hover:bg-indigo-700 font-black uppercase tracking-widest text-xs flex items-center gap-3">
                    <Sparkles className="h-5 w-5 fill-white animate-pulse" />
                    Timeline AI
                </Button>
            </div>

            <CreateTaskDialog 
                isOpen={isCreateTaskOpen} 
                onOpenChange={setIsCreateTaskOpen} 
            />
        </MotionWrapper>
    );
}
