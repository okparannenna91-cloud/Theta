"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
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
import { Plus, CheckCircle2, Circle, Clock, AlertCircle, Paperclip, X } from "lucide-react";
import { ImageUpload } from "@/components/common/image-upload";
import { AiGenerator } from "@/components/ai/ai-generator";
import { useWorkspace } from "@/hooks/use-workspace";
import { usePopups } from "@/components/popups/popup-manager";

async function fetchTasks(workspaceId: string | null) {
  const url = workspaceId ? `/api/tasks?workspaceId=${workspaceId}` : "/api/tasks";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
}

async function createTask(data: any) {
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to create task");
  }
  return res.json();
}

async function updateTask(id: string, data: any) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update task");
  return res.json();
}

async function deleteTask(id: string) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "DELETE",
  });
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
      setTitle("");
      setDescription("");
      setStatus("todo");
      setPriority("medium");
      setProjectId("");
      setCoverImage("");
      import("sonner").then(({ toast }) => toast.success("Task created successfully"));
    },
    onError: (error: any) => {
      import("sonner").then(({ toast }) => toast.error(error.message || "Failed to create task"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", activeWorkspaceId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", activeWorkspaceId] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !activeWorkspaceId) return;

    // Proactive Task Limit Check
    if (taskLimits.max !== -1 && taskLimits.current >= taskLimits.max) {
      showUpgradePrompt("tasks");
      return;
    }

    createMutation.mutate({
      title,
      description,
      status,
      priority,
      projectId,
      coverImage,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "in-progress":
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const [view, setView] = useState<"list" | "table">("list");

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-8 w-48 sm:w-64 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }



  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50/30 dark:bg-slate-950/30 min-h-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1"
        >
          <div className="flex items-center gap-3 mb-1">
             <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
               <CheckCircle2 className="h-5 w-5 text-white" />
             </div>
             <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Tasks</h1>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            Project-wide task orchestration and tracking
          </p>
        </motion.div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl flex items-center shadow-sm">
             <Button 
               variant={view === "list" ? "secondary" : "ghost"} 
               size="sm" 
               className={cn("h-8 rounded-lg text-xs font-bold", view === "list" && "shadow-sm")}
               onClick={() => setView("list")}
             >
               List
             </Button>
             <Button 
               variant={view === "table" ? "secondary" : "ghost"} 
               size="sm"
               className={cn("h-8 rounded-lg text-xs font-bold", view === "table" && "shadow-sm")}
               onClick={() => setView("table")}
             >
               Table
             </Button>
          </div>

          <Button onClick={() => setIsOpen(true)} className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 font-bold transition-all active:scale-95">
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {view === "list" ? (
        <div className="space-y-4 max-w-5xl mx-auto">
          {tasks?.map((task: any, i: number) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className="hover:border-indigo-500/30 transition-all cursor-default shadow-sm hover:shadow-md border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm group">
                <CardHeader className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        onClick={() =>
                          updateMutation.mutate({
                            id: task.id,
                            data: {
                              status:
                                task.status === "completed" ? "todo" : "completed",
                            },
                          })
                        }
                        className="flex-shrink-0 mt-1 hover:scale-125 transition-transform active:scale-90"
                      >
                        {getStatusIcon(task.status)}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className={cn("text-base font-bold transition-all", task.status === "completed" && "line-through text-muted-foreground")}>
                            {task.title}
                          </CardTitle>
                          {task.attachments?.length > 0 && (
                             <Badge variant="outline" className="text-[10px] h-4 px-1 border-slate-200 dark:border-slate-800 font-bold">
                               <Paperclip className="h-2.5 w-2.5 mr-0.5 rotate-45" />
                               {task.attachments.length}
                             </Badge>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">
                            {task.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <Badge className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border-none", getPriorityColor(task.priority))}>
                            {task.priority}
                          </Badge>
                          {task.project && (
                            <Badge variant="outline" className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 border-none px-2 py-0.5">
                               {task.project.name}
                            </Badge>
                          )}
                          <div className="ml-auto text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                             <Clock className="h-3 w-3" />
                             Added Recently
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(task.id)}
                      className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-500/5 transition-all"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl bg-white dark:bg-slate-900 animate-in fade-in slide-in-from-bottom-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 w-12 text-center">Done</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Task Name</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Project</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Priority</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {tasks?.map((task: any) => (
                  <tr key={task.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/5 transition-colors group">
                    <td className="p-4 text-center">
                      <button
                        onClick={() =>
                          updateMutation.mutate({
                            id: task.id,
                            data: {
                              status:
                                task.status === "completed" ? "todo" : "completed",
                            },
                          })
                        }
                        className="hover:scale-110 transition-transform active:scale-95"
                      >
                        {getStatusIcon(task.status)}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                         <span className={cn("text-xs font-bold truncate max-w-[200px]", task.status === "completed" && "line-through text-muted-foreground")}>
                           {task.title}
                         </span>
                         {task.description && <span className="text-[10px] text-muted-foreground truncate max-w-[200px] mt-0.5 italic">{task.description}</span>}
                      </div>
                    </td>
                    <td className="p-4">
                       <Badge variant="secondary" className="text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-none">
                         {task.project?.name || "No Project"}
                       </Badge>
                    </td>
                    <td className="p-4">
                       <div className="flex items-center gap-1.5 capitalize text-[10px] font-bold text-slate-600 dark:text-slate-400">
                          <div className={cn("h-1.5 w-1.5 rounded-full", 
                            task.status === "completed" ? "bg-emerald-500" : 
                            task.status === "in-progress" ? "bg-blue-500" : "bg-slate-400"
                          )} />
                          {task.status.replace(/-/g, " ")}
                       </div>
                    </td>
                    <td className="p-4">
                      <Badge className={cn("text-[9px] font-black uppercase tracking-widest px-2", getPriorityColor(task.priority))}>
                        {task.priority}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(task.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <AlertCircle className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tasks?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            No tasks yet. Create your first task!
          </p>
          <Button onClick={() => setIsOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Task
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
                <ImageUpload
                  value={coverImage}
                  onChange={setCoverImage}
                  onRemove={() => setCoverImage("")}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Description</Label>
                <AiGenerator
                  onGenerate={(text) => setDescription(text)}
                  initialPrompt={`Description for a task titled "${title}"`}
                  title="Generate Task Description"
                />
              </div>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="project">Project</Label>
              <Select
                value={projectId}
                onValueChange={(val) => setProjectId(val)}
              >
                <SelectTrigger id="project">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((project: any) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(val) => setStatus(val)}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">Todo</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(val) => setPriority(val)}
                >
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

