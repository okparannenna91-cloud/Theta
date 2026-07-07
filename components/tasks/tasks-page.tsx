"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, CheckCircle2, Circle, Clock, Paperclip, Trash2 } from "lucide-react";
import { ImageUpload } from "@/components/common/image-upload";
import { AiGenerator } from "@/components/ai/ai-generator";
import { useWorkspace } from "@/hooks/use-workspace";
import { usePopups } from "@/components/popups/popup-manager";
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
    mutationFn: (data: any) => createTask({ ...data, workspaceId: activeWorkspaceId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", activeWorkspaceId] });
      setIsOpen(false);
      setTitle(""); setDescription(""); setStatus("todo"); setPriority("medium"); setProjectId(""); setCoverImage("");
      toast.success("Task created successfully");
    },
    onError: (error: any) => { toast.error(error.message || "Failed to create task"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTask(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks", activeWorkspaceId] }); },
    onError: (error: any) => { toast.error(error.message || "Failed to update task"); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks", activeWorkspaceId] }); },
    onError: (error: any) => { toast.error(error.message || "Failed to delete task"); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId) return;
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
      case "high": return "bg-red-500/10 text-red-600 border border-red-500/20";
      case "medium": return "bg-amber-500/10 text-amber-600 border border-amber-500/20";
      case "low": return "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20";
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
              <Card key={task.id} className="border shadow-sm hover:border-primary/30 transition-colors cursor-pointer"
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
                          <Badge variant="outline" className="text-xs rounded-md px-2 py-0 h-5 bg-primary/5 text-primary border-primary/20">
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
        <div className="border rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="p-3 text-xs font-medium text-muted-foreground w-12 text-center">Done</th>
                  <th className="p-3 text-xs font-medium text-muted-foreground">Task Name</th>
                  <th className="p-3 text-xs font-medium text-muted-foreground">Project</th>
                  <th className="p-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="p-3 text-xs font-medium text-muted-foreground">Priority</th>
                  <th className="p-3 text-xs font-medium text-muted-foreground text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {tasks?.map((task: any) => (
                  <tr key={task.id} className="border-b border-border hover:bg-muted/20 transition-colors group cursor-pointer"
                    onClick={() => { setSelectedTask(task); setIsDetailOpen(true); }}>
                    <td className="p-3 text-center">
                      <button onClick={() => updateMutation.mutate({ id: task.id, data: { status: task.status === "done" ? "todo" : "done" } })}
                        className="hover:scale-110 transition-transform">
                        {getStatusIcon(task.status)}
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col">
                        <span className={cn("text-sm font-medium truncate max-w-[200px]", (task.status === "done") && "line-through text-muted-foreground")}>{task.title}</span>
                        {task.description && <span className="text-xs text-muted-foreground truncate max-w-[200px] mt-0.5">{task.description}</span>}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary" className="text-xs rounded-md px-2 py-0 h-5 bg-primary/10 text-primary border-none">
                        {task.project?.name || "No Project"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <div className={cn("h-1.5 w-1.5 rounded-full",
                          (task.status === "done") ? "bg-emerald-500" :
                          (task.status === "in_progress" || task.status === "in-progress") ? "bg-blue-500" : "bg-muted-foreground"
                        )} />
                        {task.status.replace(/[_-]/g, " ")}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge className={cn("text-xs rounded-md px-2 py-0 h-5 font-medium", getPriorityColor(task.priority))}>
                        {task.priority}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(task.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!activeWorkspaceId && (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-sm text-muted-foreground">Select a workspace to view tasks.</p>
        </div>
      )}

      {activeWorkspaceId && tasks?.length === 0 && (
        <div className="text-center py-12 border rounded-lg">
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
                    <SelectItem value="todo">Todo</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Completed</SelectItem>
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
