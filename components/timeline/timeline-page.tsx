"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  CalendarDays, Filter, Plus, Search, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, GripHorizontal, MousePointer2, LayoutList, Flag,
  Tag as TagIcon, Milestone as MilestoneIcon, CalendarRange, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { exportTimeline } from "@/lib/export/export-service";
import { TimelineView } from "./timeline-view";
import { TimelineSavedViews, type SavedView } from "./timeline-saved-views";
import { PRIORITY_OPTIONS, STATUS_OPTIONS, GROUP_BY_OPTIONS, GroupByKey } from "./timeline-utils";
import type { ZoomLevel } from "@/components/shared/timeline/types";
import { addDays, subDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from "date-fns";

export default function TimelinePage({ projectId }: { projectId?: string }) {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspace();
  const { user } = useUser();

  // View state
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("week");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateOffset, setDateOffset] = useState(0);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterProject, setFilterProject] = useState<string>("all");

  // Group settings
  const [groupBy, setGroupBy] = useState<GroupByKey | "none">("none");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showMilestones, setShowMilestones] = useState(true);
  const [showWeekends, setShowWeekends] = useState(true);

  // Dialogs
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createDialogDefaults, setCreateDialogDefaults] = useState<{ startDate?: string; dueDate?: string }>({});

  // Saved views
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  // Data
  const { data: tasksData, isLoading, isError } = useQuery({
    queryKey: ["timeline-tasks", activeWorkspaceId, projectId],
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
      const stored = localStorage.getItem(`theta-timeline-views-${activeWorkspaceId}`);
      if (stored) setSavedViews(JSON.parse(stored));
    } catch {}
  }, [activeWorkspaceId]);

  const persistViews = useCallback((views: SavedView[]) => {
    setSavedViews(views);
    try {
      localStorage.setItem(`theta-timeline-views-${activeWorkspaceId}`, JSON.stringify(views));
    } catch {}
  }, [activeWorkspaceId]);

  const handleSaveView = useCallback((name: string) => {
    const newView: SavedView = {
      id: `view-${Date.now()}`,
      name,
      config: { zoomLevel, groupBy, filterStatus, filterPriority, filterAssignee, filterProject, filterTags, showMilestones, showWeekends },
    };
    persistViews([...savedViews, newView]);
    setActiveViewId(newView.id);
  }, [savedViews, persistViews, zoomLevel, groupBy, filterStatus, filterPriority, filterAssignee, filterProject, filterTags, showMilestones, showWeekends]);

  const handleLoadView = useCallback((id: string) => {
    const view = savedViews.find(v => v.id === id);
    if (!view) return;
    setActiveViewId(id);
    const cfg = view.config;
    if (cfg.zoomLevel) setZoomLevel(cfg.zoomLevel);
    if (cfg.groupBy) setGroupBy(cfg.groupBy);
    if (cfg.filterStatus) setFilterStatus(cfg.filterStatus);
    if (cfg.filterPriority) setFilterPriority(cfg.filterPriority);
    if (cfg.filterAssignee) setFilterAssignee(cfg.filterAssignee);
    if (cfg.filterProject) setFilterProject(cfg.filterProject);
    if (cfg.filterTags) setFilterTags(cfg.filterTags || []);
    if (cfg.showMilestones !== undefined) setShowMilestones(cfg.showMilestones);
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
      if (filterTags.length > 0 && !filterTags.some((tag: string) => t.tagIds?.includes(tag))) return false;
      return true;
    });
  }, [allTasks, filterStatus, filterPriority, filterAssignee, filterProject, filterTags]);

  // Task update mutation with optimistic updates
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
    onMutate: async ({ taskId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["timeline-tasks", activeWorkspaceId] });
      const prev = queryClient.getQueriesData({ queryKey: ["timeline-tasks", activeWorkspaceId] });
      queryClient.setQueriesData({ queryKey: ["timeline-tasks", activeWorkspaceId] }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((t: any) => t.id === taskId ? { ...t, ...updates } : t);
      });
      return { prev };
    },
    onSuccess: () => {
      invalidateTaskCaches({ queryClient, workspaceId: activeWorkspaceId });
    },
    onError: (error, _vars, context) => {
      if (context?.prev) {
        for (const [key, data] of context.prev) {
          queryClient.setQueryData(key, data);
        }
      }
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

  const handleCreateFromTimeline = useCallback((startDate: string, endDate: string) => {
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

  const handleNavigate = useCallback((direction: "prev" | "next") => {
    setDateOffset(prev => prev + (direction === "next" ? 1 : -1));
  }, []);

  const hasActiveFilters = filterStatus !== "all" || filterPriority !== "all" || filterAssignee !== "all" || filterProject !== "all" || filterTags.length > 0;
  const scheduleCount = filteredTasks.filter((t: any) => t.startDate || t.dueDate).length;

  const isLoadingState = isLoading;
  const isErrorState = isError;

  if (isLoadingState) {
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

  if (isErrorState) {
    return (
      <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center gap-4 p-6">
        <div className="rounded-full bg-destructive/10 p-4">
          <CalendarDays className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold">Failed to load timeline</h2>
        <p className="text-sm text-muted-foreground">Could not fetch your tasks. Please try again.</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-6 py-2.5 border-b border-subtle bg-background/95 backdrop-blur-xl">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1 bg-primary/10 rounded-lg shrink-0">
            <CalendarDays className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold flex items-center gap-1.5 truncate">
              Timeline
              <Badge variant="outline" className="text-[9px] rounded-md px-1.5 py-0 font-normal leading-tight">Scheduling</Badge>
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 ml-3 pl-3 border-l border-border/40">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 rounded-md p-0" onClick={() => handleNavigate("prev")}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Previous period (k)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="outline" size="sm" className="h-7 text-[11px] rounded-md px-2 font-medium" onClick={() => setDateOffset(0)}>
              Today
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 rounded-md p-0" onClick={() => handleNavigate("next")}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Next period (j)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="hidden sm:flex items-center gap-1 border rounded-lg p-0.5 bg-muted/30 mr-1">
            <button
              onClick={() => setZoomLevel("day")}
              className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors ${
                zoomLevel === "day" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >Day</button>
            <button
              onClick={() => setZoomLevel("week")}
              className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors ${
                zoomLevel === "week" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >Week</button>
            <button
              onClick={() => setZoomLevel("month")}
              className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors ${
                zoomLevel === "month" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >Month</button>
            <button
              onClick={() => setZoomLevel("quarter")}
              className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors ${
                zoomLevel === "quarter" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >Quarter</button>
          </div>

          <div className="h-5 w-px bg-border mx-1 hidden sm:block" />

          <TimelineSavedViews
            savedViews={savedViews}
            activeViewId={activeViewId}
            onSaveView={handleSaveView}
            onLoadView={handleLoadView}
            onDeleteView={handleDeleteView}
            currentConfig={{ zoomLevel, groupBy, filterStatus, filterPriority, filterAssignee, filterProject, showMilestones, showWeekends }}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-[11px] rounded-md px-2">
                <LayoutList className="h-3 w-3 mr-1" />
                {GROUP_BY_OPTIONS.find(o => o.value === groupBy)?.label || "Group"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-36 rounded-lg" align="end">
              {GROUP_BY_OPTIONS.map(opt => (
                <DropdownMenuItem
                  key={opt.value}
                  className={`text-[11px] py-1.5 ${groupBy === opt.value ? "bg-primary/10 font-medium" : ""}`}
                  onClick={() => setGroupBy(opt.value as GroupByKey | "none")}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant={hasActiveFilters ? "default" : "ghost"} size="sm" className="h-7 text-[11px] rounded-md px-2">
                <Filter className="h-3 w-3 mr-1" />
                {hasActiveFilters ? "Filtered" : "Filter"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 rounded-lg" align="end">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-[11px]">All Statuses</SelectItem>
                      {STATUS_OPTIONS.map(s => (
                        <SelectItem key={s.value} value={s.value} className="text-[11px]">{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground">Priority</Label>
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-[11px]">All Priorities</SelectItem>
                      {PRIORITY_OPTIONS.map(p => (
                        <SelectItem key={p.value} value={p.value} className="text-[11px]">{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-muted-foreground cursor-pointer" onClick={() => setShowMilestones(!showMilestones)}>
                    Milestones
                  </Label>
                  <Switch checked={showMilestones} onCheckedChange={setShowMilestones} className="h-4" />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-muted-foreground cursor-pointer" onClick={() => setShowWeekends(!showWeekends)}>
                    Weekends
                  </Label>
                  <Switch checked={showWeekends} onCheckedChange={setShowWeekends} className="h-4" />
                </div>
                <Button variant="ghost" size="sm" className="w-full text-[11px] h-7"
                  onClick={() => {
                    setFilterStatus("all"); setFilterPriority("all");
                    setFilterAssignee("all"); setFilterProject("all");
                    setFilterTags([]);
                  }}>
                  Clear Filters
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <div className="relative w-40 hidden sm:block">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="h-7 pl-7 text-[11px] rounded-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Button className="h-7 text-[11px] rounded-md px-2.5" onClick={() => { setCreateDialogDefaults({}); setIsCreateDialogOpen(true); }}>
            <Plus className="h-3 w-3 mr-1" /> New Task
          </Button>
        </div>
      </header>

      <div className="flex items-center justify-between px-6 py-1 border-b border-subtle bg-muted/10">
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground/60">
          <span>j/k navigate</span>
          <span className="text-muted-foreground/20">·</span>
          <span>n new task</span>
          <span className="text-muted-foreground/20">·</span>
          <span>drag to reschedule</span>
          <span className="text-muted-foreground/20">·</span>
          <span>double-click to rename</span>
        </div>
        <div className="text-[9px] text-muted-foreground/40">
          {scheduleCount} task{scheduleCount !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <TimelineView
          tasks={filteredTasks}
          zoomLevel={zoomLevel}
          searchQuery={searchQuery}
          groupBy={groupBy}
          collapsedGroups={collapsedGroups}
          onToggleGroup={(key) => {
            setCollapsedGroups(prev => {
              const next = new Set(prev);
              if (next.has(key)) next.delete(key);
              else next.add(key);
              return next;
            });
          }}
          showMilestones={showMilestones}
          showWeekends={showWeekends}
          onTaskUpdate={handleTaskUpdate}
          onTaskClick={handleTaskClick}
          onCreateTask={handleCreateFromTimeline}
          onLogActivity={handleLogActivity}
          dateOffset={dateOffset}
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