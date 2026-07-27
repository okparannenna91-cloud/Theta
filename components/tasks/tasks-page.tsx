"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, CheckCircle2, Circle, Clock, Paperclip, Trash2, CalendarDays, User, GripVertical, ChevronRight, ChevronDown, ListChecks } from "lucide-react";
import { ImageUpload } from "@/components/common/image-upload";
import { AiGenerator } from "@/components/ai/ai-generator";
import { useWorkspace } from "@/hooks/use-workspace";
import { usePopups } from "@/components/popups/popup-manager";
import { useStatuses, useWorkspaceStatuses, getStatusValue, FALLBACK_STATUSES } from "@/hooks/use-statuses";
import { useWorkspaceMembers } from "@/hooks/use-workspace-members";
import { invalidateTaskCaches } from "@/lib/invalidate-task-caches";
import { TaskDialog } from "./task-dialog";
import { toast } from "sonner";

async function fetchTasks(workspaceId: string | null) {
  const url = workspaceId ? `/api/tasks?workspaceId=${workspaceId}` : "/api/tasks";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
}

async function createTask(data: any) {
  const res = await fetch("/api/tasks", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const errorData = await res.json(); throw new Error(errorData.error || "Failed to create task"); }
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

async function deleteTask(id: string) {
  const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete task");
  return res.json();
}

export default function TasksPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("todo");
  const [priority, setPriority] = useState("medium");
  const [projectId, setProjectId] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspace();
  const { showUpgradePrompt } = usePopups();
  const { data: dbStatuses } = useWorkspaceStatuses(activeWorkspaceId);
  const statuses = (dbStatuses && dbStatuses.length > 0 ? dbStatuses : FALLBACK_STATUSES).map(s => ({
      id: getStatusValue(s.name),
      name: s.name,
  }));
  const activeWorkspaceIdRef = useRef(activeWorkspaceId);
  useEffect(() => { activeWorkspaceIdRef.current = activeWorkspaceId; }, [activeWorkspaceId]);

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ["tasks", activeWorkspaceId],
    queryFn: () => fetchTasks(activeWorkspaceId),
    enabled: !!activeWorkspaceId,
  });

  const tasks = Array.isArray(tasksData?.tasks) ? tasksData.tasks : Array.isArray(tasksData) ? tasksData : [];
  const taskLimits = tasksData?.limits || { max: -1, current: 0, hasAccess: true };

  const { data: projectsData } = useQuery({
    queryKey: ["projects", activeWorkspaceId],
    queryFn: async () => {
      const url = activeWorkspaceId ? `/api/projects?workspaceId=${activeWorkspaceId}` : "/api/projects";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
    enabled: !!activeWorkspaceId,
  });

  const projects = Array.isArray(projectsData?.projects) ? projectsData.projects : Array.isArray(projectsData) ? projectsData : [];

  const createMutation = useMutation({
    mutationFn: (data: any) => createTask({ ...data, workspaceId: activeWorkspaceIdRef.current! }),
    onSuccess: () => {
      invalidateTaskCaches({ queryClient, workspaceId: activeWorkspaceIdRef.current });
      setIsOpen(false);
      setTitle(""); setDescription(""); setStatus("todo"); setPriority("medium"); setProjectId(""); setCoverImage("");
      toast.success("Task created successfully");
    },
    onError: (error: any) => { toast.error(error.message || "Failed to create task"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTask(id, data),
    onSuccess: () => { invalidateTaskCaches({ queryClient, workspaceId: activeWorkspaceIdRef.current }); },
    onError: (error: any) => { toast.error(error.message || "Failed to update task"); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => { invalidateTaskCaches({ queryClient, workspaceId: activeWorkspaceIdRef.current }); },
    onError: (error: any) => { toast.error(error.message || "Failed to delete task"); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceIdRef.current) return;
    if (taskLimits.max !== -1 && taskLimits.current >= taskLimits.max) { showUpgradePrompt("tasks"); return; }
    createMutation.mutate({ title, description, status, priority, projectId: projectId || undefined, coverImage });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "done": return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case "in_progress": case "in-progress": return <Clock className="h-4 w-4 text-blue-600" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-muted text-foreground border border-border";
      case "medium": return "bg-muted text-muted-foreground border border-border";
      case "low": return "bg-muted text-muted-foreground/60 border border-border";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const [view, setView] = useState<"list" | "table">("list");
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (<Skeleton key={i} className="h-20 rounded-lg" />))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Project-wide task orchestration and tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="border rounded-md p-0.5 flex items-center">
            <Button variant={view === "list" ? "secondary" : "ghost"} size="sm" className="h-8 text-xs rounded-sm px-3" onClick={() => setView("list")}>List</Button>
            <Button variant={view === "table" ? "secondary" : "ghost"} size="sm" className="h-8 text-xs rounded-sm px-3" onClick={() => setView("table")}>Table</Button>
          </div>
          <Button onClick={() => setIsOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Task
          </Button>
        </div>
      </div>

      {view === "list" ? (
        <div className="space-y-2">
          {tasks?.map((task: any) => (
              <Card key={task.id} className="border-subtle hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => { setSelectedTask(task); setIsDetailOpen(true); }}>
              <CardHeader className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button onClick={() => updateMutation.mutate({ id: task.id, data: { status: task.status === "done" ? "todo" : "done" } })}
                      className="shrink-0 mt-0.5 hover:scale-110 transition-transform">
                      {getStatusIcon(task.status)}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={cn("text-sm font-medium", (task.status === "done") && "line-through text-muted-foreground")}>
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
                      </div>
                    </div>
                  </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(task.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b text-[11px] font-semibold text-muted-foreground">
                  <th className="p-2.5 w-8"></th>
                  <th className="p-2.5">Task</th>
                  <th className="p-2.5 w-28">Status</th>
                  <th className="p-2.5 w-24">Priority</th>
                  <th className="p-2.5 w-28 hidden md:table-cell">Assignee</th>
                  <th className="p-2.5 w-28 hidden md:table-cell">Due Date</th>
                  <th className="p-2.5 w-16 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {tasks?.map((task: any) => (
                  <TableRow
                    key={task.id}
                    task={task}
                    statuses={statuses}
                    onSelect={() => { setSelectedTask(task); setIsDetailOpen(true); }}
                    onUpdate={(data) => updateMutation.mutate({ id: task.id, data })}
                    onDelete={() => deleteMutation.mutate(task.id)}
                    workspaceId={activeWorkspaceId!}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {tasks?.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">No tasks found</div>
          )}
        </div>
      )}

      {!activeWorkspaceId && (
        <div className="text-center py-12 border-subtle rounded-lg">
          <p className="text-sm text-muted-foreground">Select a workspace to view tasks.</p>
        </div>
      )}

      {activeWorkspaceId && tasks?.length === 0 && (
        <div className="text-center py-12 border-subtle rounded-lg">
          <p className="text-sm text-muted-foreground mb-4">No tasks yet. Create your first task!</p>
          <Button onClick={() => setIsOpen(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" /> Create Task
          </Button>
        </div>
      )}

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
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Description</Label>
                <AiGenerator onGenerate={(text) => setDescription(text)} initialPrompt={`Description for a task titled "${title}"`} title="Generate" />
              </div>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="project">Project</Label>
              <Select value={projectId} onValueChange={(val) => setProjectId(val)}>
                <SelectTrigger id="project"><SelectValue placeholder="Select a project" /></SelectTrigger>
                <SelectContent>
                  {projects?.map((project: any) => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          workspaceId={activeWorkspaceId!}
        />
      )}
    </div>
  );
}

function TableRow({ task, statuses, onSelect, onUpdate, onDelete, workspaceId }: {
  task: any; statuses: any[]; onSelect: () => void;
  onUpdate: (data: any) => void; onDelete: () => void; workspaceId: string;
}) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { memberMap } = useWorkspaceMembers(workspaceId);

  useEffect(() => {
    if (editingField && inputRef.current) inputRef.current.focus();
  }, [editingField]);

  const statusColorMap: Record<string, string> = {
    todo: "#9ca3af", in_progress: "#3b82f6", "in-progress": "#3b82f6",
    review: "#8b5cf6", done: "#10b981", cancelled: "#ef4444", backlog: "#64748b",
  };

  const statusDot = (s: string) => {
    const color = statusColorMap[s] || statusColorMap.todo;
    return <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />;
  };

  const priorityColors: Record<string, string> = {
    urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    none: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  };

  const assignees = (task.assigneeIds || []).map((id: string) => memberMap[id]).filter(Boolean);

  const isDone = task.status === "done";

  if (editingField === "status") {
    return (
      <tr className="border-b border-subtle bg-muted/20">
        <td className="p-2.5 text-center">
          <button onClick={(e) => { e.stopPropagation(); onUpdate({ status: isDone ? "todo" : "done" }); }}
            className="hover:scale-110 transition-transform">
            {isDone ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
          </button>
        </td>
        <td className="p-2.5">
          <span className={cn("text-sm font-medium cursor-pointer hover:text-primary", isDone && "line-through text-muted-foreground")} onClick={onSelect}>
            {task.title}
          </span>
        </td>
        <td className="p-2.5" colSpan={5}>
          <div className="flex items-center gap-1.5 flex-wrap">
            {statuses.map((s: any) => (
              <button key={s.id} onClick={() => { onUpdate({ status: s.id }); setEditingField(null); }}
                className={cn("px-2 py-1 text-[11px] rounded-md border transition-all",
                  task.status === s.id ? "border-primary bg-primary/10 font-medium" : "border-border hover:border-primary/30")}>
                <span className="flex items-center gap-1.5">
                  {statusDot(s.id)}
                  {s.name}
                </span>
              </button>
            ))}
            <button onClick={() => setEditingField(null)} className="text-[11px] text-muted-foreground hover:text-foreground px-1">✕</button>
          </div>
        </td>
      </tr>
    );
  }

  if (editingField === "priority") {
    return (
      <tr className="border-b border-subtle bg-muted/20">
        <td className="p-2.5 text-center">
          <button onClick={(e) => { e.stopPropagation(); onUpdate({ status: isDone ? "todo" : "done" }); }}
            className="hover:scale-110 transition-transform">
            {isDone ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
          </button>
        </td>
        <td className="p-2.5">
          <span className={cn("text-sm font-medium cursor-pointer hover:text-primary", isDone && "line-through text-muted-foreground")} onClick={onSelect}>
            {task.title}
          </span>
        </td>
        <td className="p-2.5">
          <span className="flex items-center gap-1.5 text-xs" onClick={() => setEditingField("status")}>
            {statusDot(task.status)}
            <span className="cursor-pointer hover:text-primary">{task.status.replace(/[_-]/g, " ")}</span>
          </span>
        </td>
        <td className="p-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {["urgent", "high", "medium", "low", "none"].map((p) => (
              <button key={p} onClick={() => { onUpdate({ priority: p }); setEditingField(null); }}
                className={cn("px-2 py-1 text-[10px] rounded-md border transition-all capitalize",
                  task.priority === p ? "border-primary bg-primary/10 font-medium" : "border-border hover:border-primary/30")}>
                {p}
              </button>
            ))}
            <button onClick={() => setEditingField(null)} className="text-[11px] text-muted-foreground hover:text-foreground px-1">✕</button>
          </div>
        </td>
        <td className="p-2.5 hidden md:table-cell"></td>
        <td className="p-2.5 hidden md:table-cell"></td>
        <td className="p-2.5 text-right"></td>
      </tr>
    );
  }

  if (editingField === "dueDate") {
    return (
      <tr className="border-b border-subtle bg-muted/20">
        <td className="p-2.5 text-center">
          <button onClick={(e) => { e.stopPropagation(); onUpdate({ status: isDone ? "todo" : "done" }); }}
            className="hover:scale-110 transition-transform">
            {isDone ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
          </button>
        </td>
        <td className="p-2.5">
          <span className={cn("text-sm font-medium cursor-pointer hover:text-primary", isDone && "line-through text-muted-foreground")} onClick={onSelect}>
            {task.title}
          </span>
        </td>
        <td className="p-2.5">
          <span className="flex items-center gap-1.5 text-xs cursor-pointer hover:text-primary" onClick={() => setEditingField("status")}>
            {statusDot(task.status)}
            {task.status.replace(/[_-]/g, " ")}
          </span>
        </td>
        <td className="p-2.5">
          <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium cursor-pointer", priorityColors[task.priority] || priorityColors.none)}
            onClick={() => setEditingField("priority")}>
            {task.priority}
          </span>
        </td>
        <td className="p-2.5 hidden md:table-cell"></td>
        <td className="p-2.5 hidden md:table-cell">
          <input type="date" ref={inputRef}
            value={task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : ""}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => { if (editValue) onUpdate({ dueDate: new Date(editValue).toISOString() }); setEditingField(null); }}
            onKeyDown={(e) => { if (e.key === "Escape") setEditingField(null); }}
            className="h-7 text-xs border rounded px-1.5 w-full" />
        </td>
        <td className="p-2.5 text-right"></td>
      </tr>
    );
  }

  return (
    <>
      <tr className={cn("border-b border-subtle hover:bg-muted/10 transition-colors group relative",
        isDone && "opacity-60")}>
        {task.progress > 0 && (
          <td colSpan={7} className="absolute bottom-0 left-0 right-0 h-0.5 p-0">
            <div className="h-full bg-primary/40 transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, task.progress))}%` }} />
          </td>
        )}
        <td className="p-2.5 text-center">
          <button onClick={(e) => { e.stopPropagation(); onUpdate({ status: isDone ? "todo" : "done" }); }}
            className="hover:scale-110 transition-transform">
            {isDone ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
          </button>
        </td>
        <td className="p-2.5">
          <div className="flex items-center gap-2">
            {task.subtasks?.length > 0 && (
              <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="shrink-0 text-muted-foreground hover:text-foreground">
                {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            )}
            <span className={cn("text-sm font-medium cursor-pointer hover:text-primary transition-colors", isDone && "line-through text-muted-foreground")}
              onClick={onSelect}>
              {task.title}
            </span>
          </div>
          {task.description && (
            <p className="text-xs text-muted-foreground/60 mt-0.5 truncate max-w-xs">{task.description}</p>
          )}
        </td>
        <td className="p-2.5">
          <span className="inline-flex items-center gap-1.5 text-xs cursor-pointer hover:bg-muted rounded-md px-1.5 py-1 -ml-1.5 transition-colors"
            onClick={() => setEditingField("status")}>
            {statusDot(task.status)}
            <span className="capitalize">{task.status.replace(/[_-]/g, " ")}</span>
          </span>
        </td>
        <td className="p-2.5">
          <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium cursor-pointer inline-block", priorityColors[task.priority] || priorityColors.none)}
            onClick={() => setEditingField("priority")}>
            {task.priority}
          </span>
        </td>
        <td className="p-2.5 hidden md:table-cell">
          <div className="flex -space-x-1">
            {assignees.length === 0 && <User className="h-4 w-4 text-muted-foreground/40" />}
            {assignees.slice(0, 3).map((m: any) => (
              <div key={m.id} className="h-6 w-6 rounded-full ring-2 ring-background overflow-hidden" title={m.name}>
                {m.imageUrl ? (
                  <img src={m.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-primary/20 flex items-center justify-center text-[9px] font-medium text-primary">
                    {m.name?.[0] || "?"}
                  </div>
                )}
              </div>
            ))}
            {assignees.length > 3 && (
              <div className="h-6 w-6 rounded-full ring-2 ring-background bg-muted flex items-center justify-center text-[9px] font-medium text-muted-foreground">
                +{assignees.length - 3}
              </div>
            )}
          </div>
        </td>
        <td className="p-2.5 hidden md:table-cell">
          <span className={cn("text-xs cursor-pointer hover:bg-muted rounded px-1.5 py-1 -ml-1.5 inline-flex items-center gap-1 transition-colors",
            !task.dueDate && "text-muted-foreground/40")}
            onClick={() => { setEditValue(""); setEditingField("dueDate"); }}>
            <CalendarDays className="h-3 w-3" />
            {task.dueDate ? format(new Date(task.dueDate), "MMM d") : <span className="italic">Set date</span>}
          </span>
        </td>
        <td className="p-2.5 text-right">
          <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            {task.subtasks?.length > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <ListChecks className="h-3 w-3" />
                {task.subtasks.filter((s: any) => s.completed).length}/{task.subtasks.length}
              </span>
            )}
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </td>
      </tr>
      {expanded && task.subtasks?.map((st: any) => (
        <tr key={st.id} className="border-b border-subtle bg-muted/5 text-sm">
          <td colSpan={7} className="p-2 pl-10">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              {st.completed ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Circle className="h-3 w-3" />}
              {st.title}
            </span>
          </td>
        </tr>
      ))}
    </>
  );
}
