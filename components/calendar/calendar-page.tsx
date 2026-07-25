"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  CalendarDays, Filter, Plus, Search, ChevronLeft, ChevronRight,
  LayoutList, Flag, Tag as TagIcon, Users, Maximize2, Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { invalidateTaskCaches } from "@/lib/invalidate-task-caches";
import { CalendarView } from "./calendar-view";
import { CalendarSavedViews, type SavedView } from "./calendar-saved-views";
import { CALENDAR_VIEW_OPTIONS, CALENDAR_GROUP_OPTIONS, type CalendarViewType, type CalendarGroupByKey } from "./calendar-types";
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from "@/components/timeline/timeline-utils";
import { format } from "date-fns";

export default function CalendarPage({ projectId }: { projectId?: string }) {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspace();
  const { user } = useUser();

  // View state
  const [viewType, setViewType] = useState<CalendarViewType>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");

  // Display settings
  const [groupBy, setGroupBy] = useState<CalendarGroupByKey | "none">("none");
  const [showWeekends, setShowWeekends] = useState(true);

  // Dialogs
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createDialogDefaults, setCreateDialogDefaults] = useState<{ startDate?: string; dueDate?: string }>({});
  const [isFullScreen, setIsFullScreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Saved views
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  // Data
  const { data: tasksData, isLoading, isError } = useQuery({
    queryKey: ["calendar-tasks", activeWorkspaceId, projectId],
    queryFn: async () => {
      const params = new URLSearchParams({ workspaceId: activeWorkspaceId!, limit: "500" });
      if (projectId) params.set("projectId", projectId);
      const res = await fetch(`/api/tasks?${params}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      return data.tasks || [];
    },
    enabled: !!activeWorkspaceId,
    staleTime: 10_000,
  });

  const { data: projectsData } = useQuery({
    queryKey: ["projects", activeWorkspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/projects?workspaceId=${activeWorkspaceId}`);
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      return Array.isArray(data?.projects) ? data.projects : Array.isArray(data) ? data : [];
    },
    enabled: !!activeWorkspaceId,
  });

  const projects = projectsData || [];
  const allTasks = tasksData || [];

  // Load saved views from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`theta-calendar-views-${activeWorkspaceId}`);
      if (stored) setSavedViews(JSON.parse(stored));
    } catch {}
  }, [activeWorkspaceId]);

  const persistViews = useCallback((views: SavedView[]) => {
    setSavedViews(views);
    try {
      localStorage.setItem(`theta-calendar-views-${activeWorkspaceId}`, JSON.stringify(views));
    } catch {}
  }, [activeWorkspaceId]);

  const handleSaveView = useCallback((name: string) => {
    const newView: SavedView = {
      id: `view-${Date.now()}`,
      name,
      config: { viewType, groupBy, filterStatus, filterPriority, filterAssignee, filterProject, showWeekends },
    };
    persistViews([...savedViews, newView]);
    setActiveViewId(newView.id);
  }, [savedViews, persistViews, viewType, groupBy, filterStatus, filterPriority, filterAssignee, filterProject, showWeekends]);

  const handleLoadView = useCallback((id: string) => {
    const view = savedViews.find(v => v.id === id);
    if (!view) return;
    setActiveViewId(id);
    const cfg = view.config;
    if (cfg.viewType) setViewType(cfg.viewType);
    if (cfg.groupBy) setGroupBy(cfg.groupBy);
    if (cfg.filterStatus) setFilterStatus(cfg.filterStatus);
    if (cfg.filterPriority) setFilterPriority(cfg.filterPriority);
    if (cfg.filterAssignee) setFilterAssignee(cfg.filterAssignee);
    if (cfg.filterProject) setFilterProject(cfg.filterProject);
    if (cfg.showWeekends !== undefined) setShowWeekends(cfg.showWeekends);
  }, [savedViews]);

  const handleDeleteView = useCallback((id: string) => {
    persistViews(savedViews.filter(v => v.id !== id));
    if (activeViewId === id) setActiveViewId(null);
  }, [savedViews, activeViewId, persistViews]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return allTasks.filter((t: any) => {
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (filterAssignee !== "all" && !t.assigneeIds?.includes(filterAssignee)) return false;
      if (filterProject !== "all" && t.projectId !== filterProject) return false;
      return true;
    });
  }, [allTasks, filterStatus, filterPriority, filterAssignee, filterProject]);

  // Task update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: any }) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onSuccess: () => {
      invalidateTaskCaches({ queryClient, workspaceId: activeWorkspaceId });
    },
    onError: (error) => {
      console.error("Task update error:", error);
    },
  });

  const handleTaskUpdate = useCallback((taskId: string, updates: any) => {
    updateMutation.mutate({ taskId, updates });
  }, [updateMutation]);

  const handleTaskClick = useCallback((task: any) => {
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  }, []);

  const handleCreateFromCalendar = useCallback((startDate: string, endDate: string) => {
    setCreateDialogDefaults({ startDate, dueDate: endDate });
    setIsCreateDialogOpen(true);
  }, []);

  const handleLogActivity = useCallback((action: string, taskId: string, metadata?: any) => {
    if (!user?.id || !activeWorkspaceId) return;
    fetch("/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        workspaceId: activeWorkspaceId,
        action,
        entityType: "task",
        entityId: taskId,
        metadata: metadata || {},
      }),
    }).catch(() => {});
  }, [user?.id, activeWorkspaceId]);

  const hasActiveFilters = filterStatus !== "all" || filterPriority !== "all" || filterAssignee !== "all" || filterProject !== "all";
  const scheduleCount = filteredTasks.filter((t: any) => t.startDate || t.dueDate).length;

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  useEffect(() => {
    const onFSChange = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFSChange);
    return () => document.removeEventListener("fullscreenchange", onFSChange);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
        <div className="border-subtle rounded-lg min-h-[600px] overflow-hidden">
          <Skeleton className="h-full w-full rounded-md" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center gap-4 p-6">
        <div className="rounded-full bg-destructive/10 p-4">
          <CalendarDays className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold">Failed to load calendar</h2>
        <p className="text-sm text-muted-foreground">Could not fetch your tasks. Please try again.</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("flex flex-col overflow-hidden", isFullScreen ? "h-screen bg-background" : "h-[calc(100vh-100px)]")}>
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-8 py-3">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              Calendar
              <Badge variant="outline" className="text-[10px] rounded-md px-2 py-0 font-normal">Planning</Badge>
            </h1>
            <p className="text-[11px] text-muted-foreground">
              {scheduleCount} scheduled task{scheduleCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/30">
            {CALENDAR_VIEW_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setViewType(opt.value)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  viewType === opt.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="h-7 w-px bg-border mx-1 hidden sm:block" />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 rounded-md p-0" onClick={() => setCurrentDate(prev => {
                  const d = new Date(prev);
                  if (viewType === "month") d.setMonth(d.getMonth() - 1);
                  else if (viewType === "week") d.setDate(d.getDate() - 7);
                  else d.setDate(d.getDate() - 1);
                  return d;
                })}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Previous</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button variant="outline" size="sm" className="h-8 text-xs rounded-md px-2.5" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 rounded-md p-0" onClick={() => setCurrentDate(prev => {
                  const d = new Date(prev);
                  if (viewType === "month") d.setMonth(d.getMonth() + 1);
                  else if (viewType === "week") d.setDate(d.getDate() + 7);
                  else d.setDate(d.getDate() + 1);
                  return d;
                })}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Next</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="h-7 w-px bg-border mx-1 hidden sm:block" />

          <div className="flex items-center gap-1.5">
            <CalendarSavedViews
              savedViews={savedViews}
              activeViewId={activeViewId}
              onSaveView={handleSaveView}
              onLoadView={handleLoadView}
              onDeleteView={handleDeleteView}
              currentConfig={{ viewType, groupBy, filterStatus, filterPriority, filterAssignee, filterProject, showWeekends }}
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs rounded-md px-2.5">
                  <LayoutList className="h-3.5 w-3.5 mr-1" />
                  {CALENDAR_GROUP_OPTIONS.find(o => o.value === groupBy)?.label || "Group"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-40 rounded-lg" align="end">
                {CALENDAR_GROUP_OPTIONS.map(opt => (
                  <DropdownMenuItem
                    key={opt.value}
                    className={`text-xs py-1.5 ${groupBy === opt.value ? "bg-primary/10 font-medium" : ""}`}
                    onClick={() => setGroupBy(opt.value as CalendarGroupByKey | "none")}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant={hasActiveFilters ? "default" : "outline"} size="sm" className="h-8 text-xs rounded-md px-2.5">
                  <Filter className="h-3.5 w-3.5 mr-1" />
                  {hasActiveFilters ? "Filtered" : "Filter"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4 rounded-lg" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {STATUS_OPTIONS.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Priority</Label>
                    <Select value={filterPriority} onValueChange={setFilterPriority}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        {PRIORITY_OPTIONS.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Project</Label>
                    <Select value={filterProject} onValueChange={setFilterProject}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Projects</SelectItem>
                        {projects.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground cursor-pointer" onClick={() => setShowWeekends(!showWeekends)}>
                      Show Weekends
                    </Label>
                    <Switch checked={showWeekends} onCheckedChange={setShowWeekends} />
                  </div>
                  <Button variant="ghost" size="sm" className="w-full text-xs h-8"
                    onClick={() => {
                      setFilterStatus("all"); setFilterPriority("all");
                      setFilterAssignee("all"); setFilterProject("all");
                    }}>
                    Clear All Filters
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 rounded-md p-0" onClick={toggleFullScreen}>
                    {isFullScreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isFullScreen ? "Exit Full Screen" : "Full Screen"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button className="h-8 text-xs rounded-md px-3" onClick={() => { setCreateDialogDefaults({}); setIsCreateDialogOpen(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New Task
            </Button>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-between px-8 py-1.5 border-b border-subtle">
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span>Click a date to create a task</span>
          <span className="text-muted-foreground/30">|</span>
          <span>Drag events to reschedule</span>
          <span className="text-muted-foreground/30">|</span>
          <span>Hover for task details</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-52">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              className="h-7 pl-8 text-xs rounded-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <CalendarView
          tasks={filteredTasks}
          currentDate={currentDate}
          viewType={viewType}
          searchQuery={searchQuery}
          groupBy={groupBy}
          filterStatus={filterStatus}
          filterPriority={filterPriority}
          filterAssignee={filterAssignee}
          filterProject={filterProject}
          showWeekends={showWeekends}
          onDateChange={setCurrentDate}
          onViewTypeChange={setViewType}
          onTaskUpdate={handleTaskUpdate}
          onTaskClick={handleTaskClick}
          onCreateTask={handleCreateFromCalendar}
          onLogActivity={handleLogActivity}
        />
      </div>

      <TaskDialog
        task={selectedTask}
        isOpen={isTaskDialogOpen}
        onClose={() => { setIsTaskDialogOpen(false); setSelectedTask(null); }}
        workspaceId={activeWorkspaceId || ""}
      />

      <CreateTaskDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        defaultStatus="todo"
      />
    </div>
  );
}