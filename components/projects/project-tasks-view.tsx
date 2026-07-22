"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, CheckCircle2, Circle, Clock, Paperclip, Trash2 } from "lucide-react";
import { AiGenerator } from "@/components/ai/ai-generator";
import { useStatuses, getStatusValue, FALLBACK_STATUSES } from "@/hooks/use-statuses";
import { invalidateTaskCaches } from "@/lib/invalidate-task-caches";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { toast } from "sonner";

interface ProjectTasksViewProps {
    project: any;
}

async function fetchProjectTasks(projectId: string, workspaceId: string) {
    const res = await fetch(`/api/tasks?workspaceId=${workspaceId}&projectId=${projectId}&limit=200`);
    if (!res.ok) throw new Error("Failed to fetch tasks");
    return res.json();
}

export function ProjectTasksView({ project }: ProjectTasksViewProps) {
    const queryClient = useQueryClient();
    const [view, setView] = useState<"list" | "table">("list");
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState("todo");
    const [priority, setPriority] = useState("medium");

    const { data: dbStatuses } = useStatuses(project.workspaceId);
    const statuses = (dbStatuses && dbStatuses.length > 0 ? dbStatuses : FALLBACK_STATUSES).map(s => ({
        id: getStatusValue(s.name),
        name: s.name,
    }));

    const { data: tasksData, isLoading } = useQuery({
        queryKey: ["tasks", project.workspaceId, "project", project.id],
        queryFn: () => fetchProjectTasks(project.id, project.workspaceId),
        enabled: !!project.id && !!project.workspaceId,
    });

    const tasks = Array.isArray(tasksData?.tasks) ? tasksData.tasks : Array.isArray(tasksData) ? tasksData : [];

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to create task");
            }
            return res.json();
        },
        onSuccess: () => {
            invalidateTaskCaches({ queryClient, workspaceId: project.workspaceId, projectId: project.id });
            setShowCreate(false);
            setTitle(""); setDescription(""); setStatus("todo"); setPriority("medium");
            toast.success("Task created");
        },
        onError: (error: any) => { toast.error(error.message); },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const res = await fetch(`/api/tasks/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to update task");
            return res.json();
        },
        onSuccess: () => {
            invalidateTaskCaches({ queryClient, workspaceId: project.workspaceId, projectId: project.id });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/tasks/${id}?workspaceId=${project.workspaceId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete task");
            return res.json();
        },
        onSuccess: () => {
            invalidateTaskCaches({ queryClient, workspaceId: project.workspaceId, projectId: project.id });
            toast.success("Task deleted");
        },
        onError: (error: any) => { toast.error(error.message); },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        createMutation.mutate({
            title, description, status, priority,
            projectId: project.id,
            workspaceId: project.workspaceId,
        });
    };

    const getStatusIcon = (s: string) => {
        switch (s) {
            case "done": return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
            case "in_progress": case "in-progress": return <Clock className="h-4 w-4 text-blue-600" />;
            default: return <Circle className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const getPriorityColor = (p: string) => {
        switch (p) {
            case "high": return "bg-red-500/10 text-red-600 border border-red-500/20";
            case "medium": return "bg-amber-500/10 text-amber-600 border border-amber-500/20";
            case "low": return "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20";
            default: return "bg-muted text-muted-foreground";
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground">Tasks ({tasks.length})</h3>
                <div className="flex items-center gap-2">
                    <div className="border rounded-md p-0.5 flex items-center">
                        <Button variant={view === "list" ? "secondary" : "ghost"} size="sm" className="h-8 text-xs rounded-sm px-3" onClick={() => setView("list")}>List</Button>
                        <Button variant={view === "table" ? "secondary" : "ghost"} size="sm" className="h-8 text-xs rounded-sm px-3" onClick={() => setView("table")}>Table</Button>
                    </div>
                    <Button size="sm" onClick={() => setShowCreate(true)}>
                        <Plus className="h-4 w-4 mr-1.5" /> New Task
                    </Button>
                </div>
            </div>

            {tasks.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg">
                    <p className="text-sm text-muted-foreground mb-4">No tasks in this project yet.</p>
                    <Button size="sm" onClick={() => setShowCreate(true)} variant="outline">
                        <Plus className="h-4 w-4 mr-1.5" /> Create Task
                    </Button>
                </div>
            ) : view === "list" ? (
                <div className="space-y-2">
                    {tasks.map((task: any) => (
                        <Card key={task.id} className="border shadow-sm hover:border-primary/30 transition-colors cursor-pointer"
                            onClick={() => { setSelectedTask(task); setIsDetailOpen(true); }}>
                            <CardHeader className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <button onClick={(e) => { e.stopPropagation(); updateMutation.mutate({ id: task.id, data: { status: task.status === "done" ? "todo" : "done" } }); }}
                                            className="shrink-0 mt-0.5 hover:scale-110 transition-transform">
                                            {getStatusIcon(task.status)}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className={cn("text-sm font-medium", task.status === "done" && "line-through text-muted-foreground")}>
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
                                                {task.dueDate && (
                                                    <span className="text-[10px] text-muted-foreground font-medium">
                                                        Due {new Date(task.dueDate).toLocaleDateString()}
                                                    </span>
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
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/50 border-b">
                                <th className="p-3 text-xs font-medium text-muted-foreground w-12 text-center">Done</th>
                                <th className="p-3 text-xs font-medium text-muted-foreground">Task Name</th>
                                <th className="p-3 text-xs font-medium text-muted-foreground">Status</th>
                                <th className="p-3 text-xs font-medium text-muted-foreground">Priority</th>
                                <th className="p-3 text-xs font-medium text-muted-foreground text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map((task: any) => (
                                <tr key={task.id} className="border-b border-border hover:bg-muted/20 transition-colors group cursor-pointer"
                                    onClick={() => { setSelectedTask(task); setIsDetailOpen(true); }}>
                                    <td className="p-3 text-center">
                                        <button onClick={(e) => { e.stopPropagation(); updateMutation.mutate({ id: task.id, data: { status: task.status === "done" ? "todo" : "done" } }); }}
                                            className="hover:scale-110 transition-transform">
                                            {getStatusIcon(task.status)}
                                        </button>
                                    </td>
                                    <td className="p-3">
                                        <span className={cn("text-sm font-medium truncate max-w-[200px]", task.status === "done" && "line-through text-muted-foreground")}>
                                            {task.title}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <div className={cn("h-1.5 w-1.5 rounded-full",
                                                task.status === "done" ? "bg-emerald-500" :
                                                task.status === "in_progress" ? "bg-blue-500" : "bg-muted-foreground"
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
            )}

            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>New Task</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="pt-title">Title</Label>
                            <Input id="pt-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="pt-desc">Description</Label>
                                <AiGenerator onGenerate={(text) => setDescription(text)} initialPrompt={`Description for "${title}"`} title="Generate" />
                            </div>
                            <Textarea id="pt-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Status</Label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {statuses.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Priority</Label>
                                <Select value={priority} onValueChange={setPriority}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
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
                    workspaceId={project.workspaceId}
                />
            )}
        </div>
    );
}
