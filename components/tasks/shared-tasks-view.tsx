"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, CheckCircle2, Circle, Clock, Paperclip, Trash2, Filter, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { ImageUpload } from "@/components/common/image-upload";
import { useStatuses, useWorkspaceStatuses, getStatusValue, FALLBACK_STATUSES } from "@/hooks/use-statuses";
import { isDoneStatus, isInProgressStatus, isBlockedStatus, STATUS_DONE, STATUS_TODO } from "@/lib/constants/status";
import { invalidateTaskCaches } from "@/lib/invalidate-task-caches";
import { TaskDialog } from "./task-dialog";
import { TableView } from "@/components/table/table-view";
import { toast } from "sonner";
import { usePopups } from "@/components/popups/popup-manager";

interface TaskFilters {
  search?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  tagId?: string;
  includeSubtasks?: boolean;
}

interface SharedTasksViewProps {
  workspaceId: string | null;
  projectId?: string | null;
}

async function fetchTasks(workspaceId: string, filters: TaskFilters, projectId?: string | null) {
  const params = new URLSearchParams({ workspaceId, limit: projectId ? "200" : "500" });
  if (projectId) params.set("projectId", projectId);
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.assigneeId) params.set("assigneeId", filters.assigneeId);
  if (filters.dueDateFrom) params.set("dueDateFrom", filters.dueDateFrom);
  if (filters.dueDateTo) params.set("dueDateTo", filters.dueDateTo);
  if (filters.tagId) params.set("tagIds", filters.tagId);
  if (filters.includeSubtasks) params.set("includeSubtasks", "1");
  const res = await fetch(`/api/tasks?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
}

async function createTask(data: any) {
  const res = await fetch("/api/tasks", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const errorData = await res.json().catch(() => ({})); throw new Error(errorData.error || "Failed to create task"); }
  return res.json();
}

async function updateTask(id: string, data: any) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update task");
  return res.json();
}

async function deleteTask(id: string, workspaceId?: string | null) {
  const url = workspaceId ? `/api/tasks/${id}?workspaceId=${workspaceId}` : `/api/tasks/${id}`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete task");
  return res.json();
}

function getStatusIcon(task: any) {
  const status = task?.status || "";
  const category = task?.customStatus?.category;
  if (isDoneStatus(status, category)) return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (isInProgressStatus(status, category)) return <Clock className="h-4 w-4 text-blue-600" />;
  return <Circle className="h-4 w-4 text-muted-foreground" />;
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case "high": return "bg-muted text-foreground border border-border";
    case "medium": return "bg-muted text-muted-foreground border border-border";
    case "low": return "bg-muted text-muted-foreground/60 border border-border";
    default: return "bg-muted text-muted-foreground";
  }
}

const TaskRow = memo(function TaskRow({ task, onToggle, onDelete, onOpen, dragHandleProps }: {
  task: any;
  onToggle: (task: any) => void;
  onDelete: (id: string) => void;
  onOpen: (task: any) => void;
  dragHandleProps?: Record<string, any>;
}) {
  return (
    <Card className="rounded-2xl bg-white dark:bg-zinc-900 border-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:bg-white dark:hover:bg-zinc-900 transition-all cursor-pointer group"
      onClick={() => onOpen(task)}>
      <CardHeader className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div {...dragHandleProps} title="Drag to reorder" aria-label="Drag to reorder"
              className="shrink-0 -ml-1 p-1.5 rounded-md cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border transition-all"
              onClick={(e) => e.stopPropagation()}>
              <GripVertical className="h-5 w-5" />
            </div>
            <button onClick={(e) => { e.stopPropagation(); onToggle(task); }}
              className="shrink-0 mt-0.5 hover:scale-110 transition-transform">
              {getStatusIcon(task)}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={cn("text-sm font-medium", (isDoneStatus(task.status)) && "line-through text-muted-foreground")}>
                  {task.title}
                </span>
                {task.fieldValues?.attachments?.length > 0 && (
                  <Badge variant="outline" className="text-xs h-5 px-1.5 font-medium">
                    <Paperclip className="h-2.5 w-2.5 mr-0.5 rotate-45" />
                    {task.fieldValues.attachments.length}
                  </Badge>
                )}
              </div>
              {task.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>}
              <div className="flex items-center gap-2 mt-2">
                <Badge className={cn("text-xs rounded-md px-2 py-0 h-5 font-medium", getPriorityColor(task.priority))}>
                  {task.priority}
                </Badge>
                {task.project && (
                  <Badge variant="outline" className="text-xs rounded-md px-2 py-0 h-5">
                    {task.project.name}
                  </Badge>
                )}
                {task.dueDate && (
                  <span className="text-[10px] text-muted-foreground font-medium">
                    Due {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
});

function SortableTaskRow({ task, onToggle, onDelete, onOpen }: {
  task: any;
  onToggle: (task: any) => void;
  onDelete: (id: string) => void;
  onOpen: (task: any) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TaskRow task={task} onToggle={onToggle} onDelete={onDelete} onOpen={onOpen} dragHandleProps={listeners} />
    </div>
  );
}

export function SharedTasksView({ workspaceId, projectId }: SharedTasksViewProps) {
  const queryClient = useQueryClient();
  const { showUpgradePrompt } = usePopups();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(STATUS_TODO);
  const [priority, setPriority] = useState("medium");
  const [coverImage, setCoverImage] = useState("");
  const [projectIdSelect, setProjectIdSelect] = useState(projectId || "");
  const [view, setView] = useState<"list" | "table" | "board">("list");
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>({});
  const [searchInput, setSearchInput] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // keep projectIdSelect in sync when prop changes
  useEffect(() => { setProjectIdSelect(projectId || ""); }, [projectId]);

  const workspaceIdRef = useRef(workspaceId);
  useEffect(() => { workspaceIdRef.current = workspaceId; }, [workspaceId]);

  // Statuses: project-scoped if projectId, else workspace
  const { data: projectStatuses } = useStatuses(workspaceId, projectId || undefined);
  const { data: wsStatuses } = useWorkspaceStatuses(!projectId ? workspaceId : null);
  const dbStatuses = projectId ? projectStatuses : wsStatuses;
  const statuses = (dbStatuses && dbStatuses.length > 0 ? dbStatuses : FALLBACK_STATUSES).map(s => ({
    id: getStatusValue(s.name),
    name: s.name,
    color: (s as any).color,
  }));

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ["tasks", workspaceId, projectId || "all", filters],
    queryFn: () => fetchTasks(workspaceId!, filters, projectId),
    enabled: !!workspaceId,
  });

  const tasks = Array.isArray(tasksData?.tasks) ? tasksData.tasks : Array.isArray(tasksData) ? tasksData : [];
  const taskLimits = tasksData?.limits || { max: -1, current: 0, hasAccess: true };

  const { data: membersData } = useQuery({
    queryKey: ["members", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`);
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
    enabled: !!workspaceId,
  });
  const members = Array.isArray(membersData) ? membersData : [];

  const { data: tagsData } = useQuery({
    queryKey: ["workspace-tags", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/tags`);
      if (!res.ok) throw new Error("Failed to fetch tags");
      return res.json();
    },
    enabled: !!workspaceId,
  });
  const tags = Array.isArray(tagsData) ? tagsData : [];

  const { data: projectsData } = useQuery({
    queryKey: ["projects", workspaceId],
    queryFn: async () => {
      const url = workspaceId ? `/api/projects?workspaceId=${workspaceId}` : "/api/projects";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
    enabled: !!workspaceId && !projectId,
  });
  const projects = Array.isArray(projectsData?.projects) ? projectsData.projects : Array.isArray(projectsData) ? projectsData : [];

  const hasActiveFilters = Boolean(
    filters.search || filters.status || filters.priority || filters.assigneeId ||
    filters.dueDateFrom || filters.dueDateTo || filters.tagId || filters.includeSubtasks
  );

  const applySearch = () => {
    setFilters((prev) => ({ ...prev, search: searchInput.trim() || undefined }));
  };

  const clearFilters = () => {
    setSearchInput("");
    setFilters({});
  };

  const setFilter = (key: keyof TaskFilters, value: string | boolean | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => createTask({ ...data, workspaceId: workspaceIdRef.current! }),
    onSuccess: () => {
      invalidateTaskCaches({ queryClient, workspaceId: workspaceIdRef.current, projectId: projectId || undefined });
      queryClient.invalidateQueries({ queryKey: ["tasks", workspaceIdRef.current] });
      setIsOpen(false);
      setTitle(""); setDescription(""); setStatus(STATUS_TODO); setPriority("medium"); setCoverImage("");
      if (!projectId) setProjectIdSelect("");
      toast.success("Task created successfully");
    },
    onError: (error: any) => { toast.error(error.message || "Failed to create task"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTask(id, data),
    onSuccess: () => {
      invalidateTaskCaches({ queryClient, workspaceId: workspaceIdRef.current, projectId: projectId || undefined });
      queryClient.invalidateQueries({ queryKey: ["tasks", workspaceIdRef.current] });
    },
    onError: (error: any) => { toast.error(error.message || "Failed to update task"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTask(id, workspaceIdRef.current),
    onSuccess: () => {
      invalidateTaskCaches({ queryClient, workspaceId: workspaceIdRef.current, projectId: projectId || undefined });
      queryClient.invalidateQueries({ queryKey: ["tasks", workspaceIdRef.current] });
      toast.success("Task deleted");
    },
    onError: (error: any) => { toast.error(error.message || "Failed to delete task"); },
  });

  const handleToggleTask = useCallback((task: any) => {
    updateMutation.mutate({ id: task.id, data: { status: isDoneStatus(task.status) ? STATUS_TODO : STATUS_DONE } });
  }, [updateMutation]);

  const handleDeleteTask = useCallback((id: string) => {
    deleteMutation.mutate(id);
  }, [deleteMutation]);

  const handleOpenTask = useCallback((task: any) => {
    setSelectedTask(task);
    setIsDetailOpen(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceIdRef.current) return;
    if (taskLimits.max !== -1 && taskLimits.current >= taskLimits.max) { showUpgradePrompt("tasks"); return; }
    const payload: any = { title, description, status, priority, coverImage };
    if (projectId) payload.projectId = projectId;
    else if (projectIdSelect) payload.projectId = projectIdSelect;
    createMutation.mutate(payload);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tasks.findIndex((t: any) => t.id === active.id);
    const newIndex = tasks.findIndex((t: any) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(tasks, oldIndex, newIndex);
    const updates = reordered.map((t: any, i: number) => ({ id: t.id, order: i * 1000 }));
    queryClient.setQueryData(["tasks", workspaceId, projectId || "all", filters], (old: any) => {
      if (!old) return old;
      const taskList = Array.isArray(old?.tasks) ? old.tasks : Array.isArray(old) ? old : [];
      const updated = arrayMove(taskList, oldIndex, newIndex);
      return Array.isArray(old?.tasks) ? { ...old, tasks: updated } : updated;
    });
    fetch("/api/tasks/batch", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    }).catch(() => {
      queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
    });
  }, [tasks, workspaceId, projectId, filters, queryClient]);

  if (isLoading) {
    return (
      <div className="pb-10 space-y-6">
        <Skeleton className="h-8 w-48 rounded-full" />
        <Skeleton className="h-4 w-64 rounded-full" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (<Skeleton key={i} className="h-24 rounded-2xl" />))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] overflow-hidden">
      <div className="shrink-0 sticky top-0 z-20 bg-background/80 backdrop-blur-xl pt-1">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[#1d1d1f] dark:text-white leading-none">{projectId ? "Tasks" : "Tasks"}</h1>
          <p className="text-[13px] text-[#6e6e73] dark:text-zinc-400 mt-1.5 font-normal tracking-tight">
            {projectId ? `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"} in this project` : "Organize and track your work"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[#e8e8ed] dark:bg-zinc-800 rounded-full p-1 flex items-center gap-0.5">
            <Button variant="ghost" size="sm" className={cn("h-7 text-[13px] rounded-full px-4 font-medium transition-all", view === "list" ? "bg-white dark:bg-zinc-700 shadow-sm text-[#1d1d1f] dark:text-white" : "text-[#6e6e73] hover:text-[#1d1d1f] dark:text-zinc-400")} onClick={() => setView("list")}>List</Button>
            <Button variant="ghost" size="sm" className={cn("h-7 text-[13px] rounded-full px-4 font-medium transition-all", view === "board" ? "bg-white dark:bg-zinc-700 shadow-sm text-[#1d1d1f] dark:text-white" : "text-[#6e6e73] hover:text-[#1d1d1f] dark:text-zinc-400")} onClick={() => setView("board")}>Board</Button>
            <Button variant="ghost" size="sm" className={cn("h-7 text-[13px] rounded-full px-4 font-medium transition-all", view === "table" ? "bg-white dark:bg-zinc-700 shadow-sm text-[#1d1d1f] dark:text-white" : "text-[#6e6e73] hover:text-[#1d1d1f] dark:text-zinc-400")} onClick={() => setView("table")}>Table</Button>
          </div>
          <Button onClick={() => setIsOpen(true)} className="rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white h-9 px-5 text-[13px] font-medium shadow-sm hover:shadow-md transition-all">
            <Plus className="h-4 w-4 mr-1.5" /> New Task
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5 bg-white dark:bg-zinc-900 rounded-2xl p-3 border border-black/[0.04] dark:border-white/[0.06] shadow-sm">
        <form
          onSubmit={(e) => { e.preventDefault(); applySearch(); }}
          className="flex items-center gap-2 min-w-[240px] flex-1 sm:flex-none"
        >
          <div className="relative flex-1">
            <Input
              placeholder="Search tasks..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-9 bg-[#f5f5f7] dark:bg-zinc-800 border-0 rounded-full text-[13px] pl-4 pr-4 placeholder:text-[#86868b] focus-visible:ring-1 focus-visible:ring-[#0071e3]"
              aria-label="Search tasks"
            />
          </div>
          <Button type="submit" size="sm" className="h-9 rounded-full bg-[#1d1d1f] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-zinc-100 text-[13px] px-4 font-medium">Search</Button>
        </form>
        <Button variant="ghost" size="sm" className="h-9 rounded-full bg-[#f5f5f7] dark:bg-zinc-800 hover:bg-[#e8e8ed] dark:hover:bg-zinc-700 text-[13px] px-4 font-medium" onClick={() => setShowFilters((s) => !s)}>
          <Filter className="h-3.5 w-3.5 mr-1.5" /> Filters
          {hasActiveFilters && <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-[#0071e3]" />}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-9 rounded-full text-[13px] text-[#6e6e73] hover:text-[#1d1d1f]" onClick={clearFilters}>
            Clear
          </Button>
        )}
        <label className="flex items-center gap-2 cursor-pointer ml-auto bg-[#f5f5f7] dark:bg-zinc-800 rounded-full px-3 py-1.5">
          <input
            type="checkbox"
            checked={!!filters.includeSubtasks}
            onChange={(e) => setFilter("includeSubtasks", e.target.checked || undefined)}
            className="h-3.5 w-3.5 accent-[#0071e3] rounded"
          />
          <span className="text-[13px] text-[#1d1d1f] dark:text-zinc-300 font-medium">Include subtasks</span>
        </label>
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.06] shadow-sm">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-medium text-muted-foreground">Status</Label>
            <Select value={filters.status || "all"} onValueChange={(v) => setFilter("status", v === "all" ? undefined : v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-medium text-muted-foreground">Priority</Label>
            <Select value={filters.priority || "all"} onValueChange={(v) => setFilter("priority", v === "all" ? undefined : v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-medium text-muted-foreground">Assignee</Label>
            <Select value={filters.assigneeId || "all"} onValueChange={(v) => setFilter("assigneeId", v === "all" ? undefined : v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone</SelectItem>
                {members.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>{m.name || "Unnamed"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-medium text-muted-foreground">Due from</Label>
            <Input
              type="date"
              className="h-9 text-xs"
              value={filters.dueDateFrom || ""}
              onChange={(e) => setFilter("dueDateFrom", e.target.value || undefined)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-medium text-muted-foreground">Due to</Label>
            <Input
              type="date"
              className="h-9 text-xs"
              value={filters.dueDateTo || ""}
              onChange={(e) => setFilter("dueDateTo", e.target.value || undefined)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-medium text-muted-foreground">Tag</Label>
            <Select value={filters.tagId || "all"} onValueChange={(v) => setFilter("tagId", v === "all" ? undefined : v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tags</SelectItem>
                {tags.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      </div>
      <div className="flex-1 overflow-auto min-h-0 pr-1 -mr-1">
        {view === "list" ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tasks?.map((t: any) => t.id) || []} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {tasks?.map((task: any) => (
                <SortableTaskRow
                  key={task.id}
                  task={task}
                  onToggle={handleToggleTask}
                  onDelete={handleDeleteTask}
                  onOpen={handleOpenTask}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : view === "board" ? (
        <div className="flex gap-4 overflow-x-auto pb-6 min-h-[400px] px-1">
          {statuses.map((col) => {
            const columnTasks = tasks.filter((t: any) => getStatusValue(t.status) === col.id);
            return (
              <div key={col.id} className="flex-shrink-0 w-[300px] bg-white dark:bg-zinc-900 rounded-2xl p-3 border border-black/[0.04] dark:border-white/[0.06] shadow-sm">
                <div className="flex items-center gap-2 mb-4 px-1">
                  <div className={cn("h-2 w-2 rounded-full",
                    col.id === "done" ? "bg-emerald-500" :
                      col.id === "in_progress" || col.id === "in-progress" ? "bg-blue-500" : "bg-[#86868b]"
                  )} />
                  <span className="text-[11px] font-semibold text-[#1d1d1f] dark:text-white uppercase tracking-wider">{col.name}</span>
                  <span className="text-[11px] font-medium bg-[#f5f5f7] dark:bg-zinc-800 text-[#6e6e73] dark:text-zinc-400 rounded-full px-2 py-0.5 ml-auto">{columnTasks.length}</span>
                </div>
                <div className="space-y-3">
                  {columnTasks.map((task: any) => (
                    <Card key={task.id} className="rounded-xl bg-white dark:bg-zinc-800 border border-black/[0.04] dark:border-white/[0.06] shadow-sm hover:shadow-md hover:border-black/[0.06] transition-all cursor-pointer group"
                      onClick={() => { setSelectedTask(task); setIsDetailOpen(true); }}>
                      <CardHeader className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className={cn("text-sm font-medium leading-snug", isDoneStatus(task.status) && "line-through text-muted-foreground")}>
                            {task.title}
                          </span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                            onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(task.id); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        {task.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={cn("text-[10px] rounded-md px-1.5 py-0 h-4 font-medium", getPriorityColor(task.priority))}>
                            {task.priority}
                          </Badge>
                          {task.dueDate && (
                            <span className="text-[10px] text-muted-foreground">Due {new Date(task.dueDate).toLocaleDateString()}</span>
                          )}
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-black/[0.04] dark:border-white/[0.06] shadow-sm h-full">
          <TableView
            tasks={tasks || []}
            workspaceId={workspaceId!}
            projectId={projectId || undefined}
            availableMembers={members.map((m: any) => ({ id: m.id, name: m.name, imageUrl: m.imageUrl, image: m.imageUrl }))}
            onSelectTask={(task) => { setSelectedTask(task); setIsDetailOpen(true); }}
          />
        </div>
      )}

      {!workspaceId && (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-black/[0.04] dark:border-white/[0.06] shadow-sm">
          <p className="text-[13px] text-[#6e6e73] dark:text-zinc-400">Select a workspace to view tasks.</p>
        </div>
      )}

      {workspaceId && tasks?.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-black/[0.04] dark:border-white/[0.06] shadow-sm">
          {hasActiveFilters ? (
            <>
              <p className="text-[13px] text-[#6e6e73] dark:text-zinc-400 mb-4">No tasks match your filters.</p>
              <Button onClick={clearFilters} className="rounded-full bg-[#f5f5f7] dark:bg-zinc-800 hover:bg-[#e8e8ed] dark:hover:bg-zinc-700 text-[#1d1d1f] dark:text-white border-0 text-[13px] px-5">
                Clear Filters
              </Button>
            </>
          ) : (
            <>
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <div className="h-14 w-14 rounded-2xl bg-[#f5f5f7] dark:bg-zinc-800 flex items-center justify-center mb-4">
                  <ListChecks className="h-6 w-6 text-[#86868b]" />
                </div>
                <p className="text-[15px] font-semibold tracking-tight text-[#1d1d1f] dark:text-white mb-1">No tasks yet</p>
                <p className="text-[13px] text-[#6e6e73] dark:text-zinc-400 mb-6">Create your first task to get started.</p>
                <Button onClick={() => setIsOpen(true)} className="rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white px-6 h-9 text-[13px] font-medium shadow-sm">
                  <Plus className="h-4 w-4 mr-1.5" /> Create Task
                </Button>
              </div>
            </>
          )}
        </div>
      )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Cover Image</Label>
              <div className="mt-2">
                <ImageUpload value={coverImage} onChange={setCoverImage} onRemove={() => setCoverImage("")} />
              </div>
            </div>
            <div>
              <Label htmlFor="title">Task Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            {!projectId && (
              <div>
                <Label htmlFor="project">Project</Label>
                <Select value={projectIdSelect} onValueChange={(val) => setProjectIdSelect(val)}>
                  <SelectTrigger id="project"><SelectValue placeholder="Select a project" /></SelectTrigger>
                  <SelectContent>
                    {projects?.map((project: any) => (
                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(val) => setStatus(val)}>
                  <SelectTrigger id="status"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(val) => setPriority(val)}>
                  <SelectTrigger id="priority"><SelectValue placeholder="Priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {selectedTask && (
        <TaskDialog
          task={selectedTask}
          isOpen={isDetailOpen}
          onClose={() => { setIsDetailOpen(false); setSelectedTask(null); }}
          workspaceId={workspaceId!}
        />
      )}
    </div>
  );
}
