"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { CalendarDays, Filter, Plus, Search, ChevronLeft, ChevronRight, LayoutList } from "lucide-react";
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
import TimelineCanvas from "./timeline-canvas";
import { TimelineSavedViews, type SavedView } from "./timeline-saved-views";
import { PRIORITY_OPTIONS, STATUS_OPTIONS, GROUP_BY_OPTIONS, GroupByKey } from "./timeline-utils";
import type { ZoomLevel } from "@/components/shared/timeline/types";
import { addDays } from "date-fns";
import { useTaskRealtime } from "@/hooks/use-task-realtime";
import { hasTimelineAccess, isValidPlan } from "@/lib/plan-limits";
import { PremiumFeatureGate } from "@/components/common/premium-feature-gate";

export default function TimelinePage({ projectId }: { projectId?: string }) {
  const { activeWorkspaceId, activeWorkspace } = useWorkspace();

  // View state
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("day");
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
  const [showMilestones, setShowMilestones] = useState(true);
  const [showWeekends, setShowWeekends] = useState(true);

  // Dialogs
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createDialogDefaults, setCreateDialogDefaults] = useState<{ startDate?: string; dueDate?: string }>({});
  const [createParent, setCreateParent] = useState<{ id: string; title: string } | null>(null);

  // Saved views
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  // Data
  const { data: tasksData, isLoading, isError } = useQuery({
    queryKey: ["tasks", activeWorkspaceId, projectId],
    queryFn: async () => {
      const params = new URLSearchParams({ workspaceId: activeWorkspaceId!, limit: "500", includeSubtasks: "1" });
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

  const handleTaskClick = useCallback((task: any) => {
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  }, []);

  const handleCreateSubtask = useCallback((parent: any) => {
    setCreateParent({ id: parent.id, title: parent.title });
    setCreateDialogDefaults({});
    setIsCreateDialogOpen(true);
  }, []);

  const handleEmptyCreate = useCallback(() => {
    setCreateParent(null);
    setCreateDialogDefaults({});
    setIsCreateDialogOpen(true);
  }, []);

  const handleNavigate = useCallback((direction: "prev" | "next") => {
    setDateOffset(prev => prev + (direction === "next" ? 1 : -1));
  }, []);

  const hasActiveFilters = filterStatus !== "all" || filterPriority !== "all" || filterAssignee !== "all" || filterProject !== "all" || filterTags.length > 0;
  const scheduleCount = filteredTasks.filter((t: any) => t.startDate || t.dueDate).length;

  const isLoadingState = isLoading;
  const isErrorState = isError;

  useTaskRealtime(activeWorkspaceId, "tasks");

  const centerDate = useMemo(() => addDays(new Date(), dateOffset * 7), [dateOffset]);

  const workspacePlan = isValidPlan(activeWorkspace?.plan) ? activeWorkspace.plan : "free";

  if (isLoadingState || !activeWorkspace) {
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

  if (!hasTimelineAccess(workspacePlan)) {
    return (
      <PremiumFeatureGate
        feature="the Timeline view"
        title="Visualize Your Project Schedule"
        description="The Timeline view is available on Growth plans and above. Visualize task schedules, spot conflicts, and keep your project on track."
        ctaLabel="Upgrade to Growth"
      />
    );
  }

  if (isErrorState) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-6">
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
    <div className="h-full flex flex-col overflow-hidden">
      <header className="flex items-start sm:items-center justify-between gap-2 px-6 sm:px-8 py-3 border-b border-subtle bg-background/95 backdrop-blur-xl">
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <div className="p-1 bg-primary/10 rounded-lg shrink-0 hidden xs:block">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-semibold truncate flex items-center gap-1.5">
              Timeline
              <Badge variant="outline" className="text-[8px] sm:text-[9px] rounded-md px-1 py-0 font-normal leading-tight hidden xs:inline">Scheduling</Badge>
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-1 ml-2 pl-2 border-l border-border/40">
            <button className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted text-muted-foreground" onClick={() => handleNavigate("prev")} title="Previous (k)">
              <ChevronLeft className="h-3 w-3" />
            </button>
            <button className="h-6 text-[10px] px-1.5 rounded font-medium hover:bg-muted transition-colors" onClick={() => setDateOffset(0)}>Today</button>
            <button className="h-6 w-6 rounded flex items-center justify-center hover:bg-muted text-muted-foreground" onClick={() => handleNavigate("next")} title="Next (j)">
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-wrap justify-end">
          <div className="hidden lg:flex items-center gap-0.5 border rounded-md p-0.5 bg-muted/30">
            {(["day","week","month","quarter"] as const).map(z => (
              <button key={z} onClick={() => setZoomLevel(z)}
                className={`px-1.5 py-0.5 text-[9px] rounded font-medium transition-colors ${zoomLevel === z ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {z.charAt(0).toUpperCase() + z.slice(1)}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-border mx-0.5 hidden lg:block" />

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
              <Button variant="ghost" size="sm" className="h-6 md:h-7 text-[10px] md:text-[11px] rounded-md px-1.5 md:px-2">
                <LayoutList className="h-2.5 md:h-3 w-2.5 md:w-3 mr-0.5 md:mr-1" />
                <span className="hidden xs:inline">{GROUP_BY_OPTIONS.find(o => o.value === groupBy)?.label || "Group"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-32 rounded-lg" align="end">
              {GROUP_BY_OPTIONS.map(opt => (
                <DropdownMenuItem key={opt.value}
                  className={`text-[11px] py-1.5 ${groupBy === opt.value ? "bg-primary/10 font-medium" : ""}`}
                  onClick={() => setGroupBy(opt.value as GroupByKey | "none")}>
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant={hasActiveFilters ? "default" : "ghost"} size="sm" className="h-6 md:h-7 text-[10px] md:text-[11px] rounded-md px-1.5 md:px-2">
                <Filter className="h-2.5 md:h-3 w-2.5 md:w-3 mr-0.5 md:mr-1" />
                {hasActiveFilters ? "F" : <span className="hidden xs:inline">Filter</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2.5 rounded-lg" align="end">
              <div className="space-y-2.5">
                <div className="space-y-1">
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
                <div className="space-y-1">
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
                  <Label className="text-[10px] text-muted-foreground cursor-pointer" onClick={() => setShowMilestones(!showMilestones)}>Milestones</Label>
                  <Switch checked={showMilestones} onCheckedChange={setShowMilestones} className="h-3.5" />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-muted-foreground cursor-pointer" onClick={() => setShowWeekends(!showWeekends)}>Weekends</Label>
                  <Switch checked={showWeekends} onCheckedChange={setShowWeekends} className="h-3.5" />
                </div>
                <Button variant="ghost" size="sm" className="w-full text-[11px] h-7"
                  onClick={() => { setFilterStatus("all"); setFilterPriority("all"); setFilterAssignee("all"); setFilterProject("all"); setFilterTags([]); }}>
                  Clear Filters
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <div className="relative w-24 lg:w-32 hidden sm:block">
            <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-muted-foreground" />
            <Input placeholder="Search..." className="h-6 md:h-7 pl-6 text-[10px] md:text-[11px] rounded-md" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>

          <Button className="h-6 md:h-7 text-[10px] md:text-[11px] rounded-md px-1.5 md:px-2.5" onClick={handleEmptyCreate}>
            <Plus className="h-2.5 md:h-3 w-2.5 md:w-3 mr-0.5 md:mr-1" /> <span className="hidden xs:inline">New</span>
          </Button>
        </div>
      </header>

      <div className="flex items-center justify-between px-6 sm:px-8 py-2 border-b border-subtle bg-muted/10">
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground/60">
          <span>j/k navigate</span>
          <span className="text-muted-foreground/20">·</span>
          <span>n new task</span>
          <span className="text-muted-foreground/20">·</span>
          <span>drag to reschedule</span>
          <span className="text-muted-foreground/20">·</span>
          <span>Alt+drag to pan</span>
        </div>
        <div className="text-[9px] text-muted-foreground/40">
          {scheduleCount} task{scheduleCount !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <TimelineCanvas
          tasks={filteredTasks}
          zoomLevel={zoomLevel}
          searchQuery={searchQuery}
          groupBy={groupBy}
          showWeekends={showWeekends}
          enableRollup
          workspaceId={activeWorkspaceId}
          centerDate={centerDate}
          onTaskClick={handleTaskClick}
          onCreateSubtask={handleCreateSubtask}
          onEmptyCreate={handleEmptyCreate}
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
        defaultStartDate={createDialogDefaults.startDate}
        defaultDueDate={createDialogDefaults.dueDate}
        defaultParentId={createParent?.id}
        defaultParentTitle={createParent?.title}
      />
    </div>
  );
}