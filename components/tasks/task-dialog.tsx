"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, Flag, Layout, Type, AlignLeft, Clock, Sparkles, Loader2 as Spinner, X, Trash2, Palette, AlertCircle } from "lucide-react";
import { format } from "date-fns";

import { useAbly } from "@/hooks/use-ably";
import { getTaskChannel } from "@/lib/ably";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TaskSubtasks } from "./task-subtasks";
import { TaskComments } from "./task-comments";
import { TagSelector } from "./tag-selector";
import { TimeTracker } from "./time-tracker";
import { TaskActivity } from "./task-activity";
import { TaskAttachments } from "./task-attachments";

interface TaskDialogProps {
    task: any;
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
}

export function TaskDialog({ task, isOpen, onClose, workspaceId }: TaskDialogProps) {
    const queryClient = useQueryClient();
    const [title, setTitle] = useState(task?.title || "");
    const [description, setDescription] = useState(task?.description || "");
    const [status, setStatus] = useState(task?.status || "todo");
    const [priority, setPriority] = useState(task?.priority || "medium");
    const [dueDate, setDueDate] = useState<Date | undefined>(
        task?.dueDate ? new Date(task?.dueDate) : undefined
    );
    const [estimatedHours, setEstimatedHours] = useState(task?.estimatedHours || 0);
    const [progress, setProgress] = useState(task?.progress || 0);
    const [dependencyIds, setDependencyIds] = useState<string[]>(task?.dependencyIds || []);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [summary, setSummary] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [color, setColor] = useState(task?.color || "");

    const taskChannel = task?.id ? getTaskChannel(workspaceId, task.id) : null;

    useAbly(taskChannel, "task:updated", (updatedTask) => {
        if (updatedTask.id === task.id) {
            setTitle(updatedTask.title);
            setDescription(updatedTask.description || "");
            setStatus(updatedTask.status);
            setPriority(updatedTask.priority);
            setDueDate(updatedTask.dueDate ? new Date(updatedTask.dueDate) : undefined);
            setEstimatedHours(updatedTask.estimatedHours || 0);
            setProgress(updatedTask.progress || 0);
            setColor(updatedTask.color || "");
        }
    });

    const activeWorkspace = queryClient.getQueryData<any[]>(["workspaces"])?.find(w => w.id === workspaceId);
    const statuses = activeWorkspace?.statuses || [
        { id: "todo", name: "To Do" },
        { id: "in_progress", name: "In Progress" },
        { id: "done", name: "Done" },
    ];

    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setDescription(task.description || "");
            setStatus(task.status);
            setPriority(task.priority);
            setDueDate(task.dueDate ? new Date(task.dueDate) : undefined);
            setEstimatedHours(task.estimatedHours || 0);
            setProgress(task.progress || 0);
            setDependencyIds(task.dependencyIds || []);
            setColor(task.color || "");
        }
    }, [task?.id]);

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch(`/api/tasks/${task.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to update task");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["board", workspaceId] });
            queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
            toast.success("Task updated");
        },
    });

    const handleUpdate = (field: string, value: any) => {
        updateMutation.mutate({ [field]: value });
    };

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/tasks/${task.id}?workspaceId=${workspaceId}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to delete task");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["board", workspaceId] });
            queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
            toast.success("Task deleted");
            onClose();
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to delete task");
        }
    });

    const handleAISummary = async () => {
        setIsSummarizing(true);
        try {
            const res = await fetch("/api/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: `/summarize Summarize the current state of this task and recommend next steps.
Task: ${title}
Current Progress: ${progress}%
Subtasks: ${task.subtasks?.map((s:any) => s.title).join(", ") || "None"}
Last Description: ${description}`,
                    workspaceId,
                }),
            });
            if (!res.ok) throw new Error("AI failed");
            const data = await res.json();
            setSummary(data.text);
        } catch (error) {
            toast.error("Couldn't summarize this task.");
        } finally {
            setIsSummarizing(false);
        }
    };

    if (!task) return null;

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="right" className="fixed left-auto right-0 top-0 translate-x-0 translate-y-0 h-[100dvh] w-full sm:w-[95vw] md:w-[85vw] lg:w-[1100px] sm:max-w-none p-0 border-l bg-background/95 backdrop-blur-3xl shadow-2xl rounded-none sm:rounded-l-xl overflow-hidden flex flex-col">
                {/* Top Bar (Breadcrumbs & Actions) */}
                <div className="h-16 border-b px-6 sm:px-8 flex items-center justify-between shrink-0 bg-background/50 backdrop-blur-md sticky top-0 z-20">
                    <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
                        <span className="hover:text-primary transition-colors cursor-pointer">Workspace</span>
                        <span>/</span>
                        <span className="hover:text-primary transition-colors cursor-pointer">Tasks</span>
                        <span>/</span>
                        <span className="text-foreground truncate max-w-[150px] sm:max-w-[300px]">
                            {task.title || "Untitled"}
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            Synced
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setShowDeleteConfirm(true)} className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-muted transition-colors">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Main Content Area (70/30 Split) */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
                    <div className="flex flex-col lg:flex-row min-h-full">
                        {/* Left Column (70%) */}
                        <div className="flex-1 p-8 sm:p-12 lg:p-16 space-y-12 lg:border-r">
                            {/* Title & Description */}
                            <div className="space-y-8">
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    onBlur={() => handleUpdate("title", title)}
                                    className="text-4xl sm:text-5xl font-semibold bg-transparent border-none p-0 focus-visible:ring-0 placeholder:text-muted-foreground/30 h-auto tracking-tight leading-none"
                                    placeholder="Task title"
                                />
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    onBlur={() => handleUpdate("description", description)}
                                    className="min-h-[120px] bg-transparent border border-transparent hover:border-primary/10 focus-visible:border-primary/20 focus-visible:bg-muted/50 rounded-lg p-6 text-base resize-y focus-visible:ring-0 leading-relaxed placeholder:text-muted-foreground transition-all"
                                    placeholder="Add a description..."
                                />
                            </div>

                            {/* Subtasks */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                    <h3 className="text-lg font-semibold tracking-tight">Subtasks</h3>
                                </div>
                                <TaskSubtasks taskId={task.id} />
                            </div>

                            {/* Attachments */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <Palette className="h-4 w-4 text-primary" />
                                    <h3 className="text-lg font-semibold tracking-tight">Attachments</h3>
                                </div>
                                <TaskAttachments taskId={task.id} workspaceId={workspaceId} attachments={task.attachments || []} />
                            </div>

                            <hr className="border-border/10 my-8" />

                            {/* Comments */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <Type className="h-4 w-4 text-primary" />
                                    <h3 className="text-lg font-semibold tracking-tight">Comments</h3>
                                </div>
                                <TaskComments taskId={task.id} workspaceId={workspaceId} />
                            </div>

                            {/* Activity */}
                            <div className="space-y-6 pt-12 opacity-50 hover:opacity-100 transition-opacity">
                                <div className="flex items-center gap-3">
                                    <Clock className="h-4 w-4 text-primary" />
                                    <h3 className="text-lg font-semibold tracking-tight">Activity</h3>
                                </div>
                                <TaskActivity taskId={task.id} workspaceId={workspaceId} />
                            </div>
                        </div>

                        {/* Right Column (30%) */}
                        <div className="w-full lg:w-[320px] xl:w-[360px] shrink-0 p-8 sm:p-10 bg-muted/30">
                            <div className="sticky top-8 space-y-10">
                                {/* Core Metadata */}
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <Label className="text-xs font-medium text-muted-foreground ml-1">Status</Label>
                                        <Select value={status} onValueChange={(val: string) => { setStatus(val); handleUpdate("status", val); }}>
                                            <SelectTrigger className="w-full h-11 bg-background border rounded-lg text-xs shadow-sm hover:border-primary/30 transition-colors">
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-background/95 backdrop-blur-2xl border rounded-lg p-2">
                                                {statuses.map((s: any) => (
                                                    <SelectItem key={s.id} value={s.id} className="rounded-md text-xs p-3 cursor-pointer">{s.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-xs font-medium text-muted-foreground ml-1">Priority</Label>
                                        <Select value={priority} onValueChange={(val: string) => { setPriority(val); handleUpdate("priority", val); }}>
                                            <SelectTrigger className="w-full h-11 bg-background border rounded-lg text-xs shadow-sm hover:border-primary/30 transition-colors">
                                                <SelectValue placeholder="Priority" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-background/95 backdrop-blur-2xl border rounded-lg p-2">
                                                <SelectItem value="low" className="rounded-md text-xs p-3 cursor-pointer text-emerald-500">Low</SelectItem>
                                                <SelectItem value="medium" className="rounded-md text-xs p-3 cursor-pointer text-amber-500">Medium</SelectItem>
                                                <SelectItem value="high" className="rounded-md text-xs p-3 cursor-pointer text-red-500">High</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-xs font-medium text-muted-foreground ml-1">Due Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className={cn("w-full h-11 justify-start text-left font-medium text-xs bg-background border rounded-lg shadow-sm hover:border-primary/30 transition-colors", !dueDate && "text-muted-foreground")}>
                                                    <CalendarIcon className="mr-3 h-4 w-4 text-primary" />
                                                    {dueDate ? format(dueDate, "PPP") : <span>Set date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-6 bg-background/95 backdrop-blur-2xl border rounded-xl shadow-2xl" align="start">
                                                <div className="flex flex-col gap-4">
                                                    <Label className="text-xs font-medium text-muted-foreground">Date</Label>
                                                    <Input
                                                        type="date"
                                                        className="w-full h-12 px-5 bg-muted border-none rounded-lg text-xs focus:ring-2 focus:ring-primary/20"
                                                        value={dueDate ? format(dueDate, "yyyy-MM-dd") : ""}
                                                        onChange={(e) => {
                                                            const date = e.target.value ? new Date(e.target.value) : undefined;
                                                            setDueDate(date);
                                                            handleUpdate("dueDate", date?.toISOString());
                                                        }}
                                                    />
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-3">
                                            <Label className="text-xs font-medium text-muted-foreground ml-1">Est. (h)</Label>
                                            <Input
                                                type="number"
                                                value={estimatedHours}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    setEstimatedHours(val);
                                                    handleUpdate("estimatedHours", val);
                                                }}
                                                className="h-11 bg-background border rounded-lg text-xs shadow-sm text-center hover:border-primary/30 transition-colors"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-xs font-medium text-muted-foreground ml-1">Done (%)</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={progress}
                                                onChange={(e) => {
                                                    const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                                    setProgress(val);
                                                    handleUpdate("progress", val);
                                                }}
                                                className="h-11 bg-background border rounded-lg text-xs shadow-sm text-center hover:border-primary/30 transition-colors"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <Label className="text-xs font-medium text-muted-foreground ml-1">Color</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {["", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b", "#0f172a", "#4f46e5"].map((c) => (
                                                <button
                                                    key={c}
                                                    onClick={() => {
                                                        setColor(c);
                                                        handleUpdate("color", c);
                                                    }}
                                                    className={cn(
                                                        "h-6 w-6 rounded-full border transition-all duration-300",
                                                        color === c ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-background scale-110 shadow-md" : "hover:scale-110",
                                                        !c && "bg-muted"
                                                    )}
                                                    style={c ? { backgroundColor: c } : {}}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <TagSelector
                                        taskId={task.id}
                                        workspaceId={workspaceId}
                                        currentTagIds={task.tagIds || []}
                                    />
                                </div>

                                {/* Advanced Utilities */}
                                <div className="space-y-4 pt-6 border-t">
                                    <TimeTracker taskId={task.id} />
                                    
                                    <Button
                                        variant="outline"
                                        className="w-full h-12 justify-start gap-3 bg-primary/5 hover:bg-primary border-none hover:text-primary-foreground text-primary font-semibold text-xs rounded-lg transition-all group"
                                        onClick={handleAISummary}
                                        disabled={isSummarizing}
                                    >
                                        {isSummarizing ? <Spinner className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 group-hover:scale-110 transition-transform" />}
                                        {isSummarizing ? "Summarizing..." : "AI Summary"}
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className="w-full h-12 justify-start gap-3 bg-destructive/5 hover:bg-destructive border-none hover:text-destructive-foreground text-destructive font-semibold text-xs rounded-lg transition-all group"
                                        onClick={async () => {
                                            setIsSummarizing(true);
                                            try {
                                                const res = await fetch("/api/ai", {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({
                                                        prompt: `/risks Analyze potential risks for this task: ${title}`,
                                                        workspaceId,
                                                    }),
                                                });
                                                const data = await res.json();
                                                setSummary(data.text);
                                            } finally {
                                                setIsSummarizing(false);
                                            }
                                        }}
                                        disabled={isSummarizing}
                                    >
                                        <AlertCircle className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                        Risk Analysis
                                    </Button>

                                    {summary && (
                                        <div className="overflow-hidden">
                                            <div className="p-5 mt-4 bg-primary/10 text-foreground rounded-lg relative">
                                                <button onClick={() => setSummary(null)} className="absolute top-4 right-4 text-muted-foreground/50 hover:text-foreground transition-colors">
                                                    <X className="h-4 w-4" />
                                                </button>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                                                    <span className="text-xs font-semibold text-primary">Insights</span>
                                                </div>
                                                <p className="text-xs leading-relaxed text-muted-foreground">
                                                    {summary}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {showDeleteConfirm && (
                                    <div className="p-5 bg-destructive/10 border border-destructive/20 rounded-lg space-y-4">
                                        <div className="flex items-center gap-2 text-destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            <span className="text-xs font-semibold">Delete task?</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="ghost" className="flex-1 h-9 rounded-md hover:bg-destructive/10 hover:text-destructive" onClick={() => setShowDeleteConfirm(false)}>
                                                Cancel
                                            </Button>
                                            <Button size="sm" className="flex-1 h-9 rounded-md bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                                                {deleteMutation.isPending ? "..." : "Delete"}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
