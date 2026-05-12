"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
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
import { motion, AnimatePresence } from "framer-motion";
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

    const taskChannel = getTaskChannel(workspaceId, task.id);

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
    }, [task]);

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
            queryClient.invalidateQueries({ queryKey: ["board"] });
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
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
            queryClient.invalidateQueries({ queryKey: ["board"] });
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
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
            toast.error("Nova couldn't summarize this task.");
        } finally {
            setIsSummarizing(false);
        }
    };

    if (!task) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-none bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col lg:flex-row h-full">
                    {/* Main Content */}
                    <div className="flex-1 p-6 sm:p-8 space-y-8 bg-white dark:bg-slate-900 shadow-xl rounded-l-2xl">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-3 mb-1">
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <Layout className="h-4 w-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Task Details</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-muted-foreground font-medium italic">
                                        Updated {format(new Date(task.updatedAt), "HH:mm")}
                                    </span>
                                </div>
                            </div>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onBlur={() => handleUpdate("title", title)}
                                className="text-2xl font-black bg-transparent border-none p-0 focus-visible:ring-0 placeholder:text-slate-300 h-auto"
                                placeholder="Task Title"
                            />
                            <div className="flex items-center gap-2">
                                <AlignLeft className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Description</span>
                            </div>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                onBlur={() => handleUpdate("description", description)}
                                className="min-h-[120px] bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl p-4 text-sm resize-none focus-visible:ring-1 focus-visible:ring-indigo-500/30"
                                placeholder="Add a more detailed description..."
                            />
                        </div>

                        <hr className="border-slate-100 dark:border-slate-800" />

                        {/* Subtasks */}
                        <TaskSubtasks taskId={task.id} />

                        {/* Attachments */}
                        <TaskAttachments taskId={task.id} workspaceId={workspaceId} attachments={task.attachments || []} />

                        <hr className="border-slate-100 dark:border-slate-800" />

                        {/* Comments */}
                        <TaskComments taskId={task.id} workspaceId={workspaceId} />

                        <hr className="border-slate-100 dark:border-slate-800" />

                        {/* Activity */}
                        <TaskActivity taskId={task.id} workspaceId={workspaceId} />
                    </div>

                    {/* Sidebar */}
                    <div className="w-full lg:w-72 p-6 space-y-8 bg-slate-50 dark:bg-slate-950/50 rounded-r-2xl border-l border-slate-200/50 dark:border-slate-800/50">
                        <TimeTracker taskId={task.id} />

                        <div className="space-y-6">
                            <Button
                                variant="outline"
                                className="w-full justify-start gap-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50 font-bold text-xs"
                                onClick={handleAISummary}
                                disabled={isSummarizing}
                            >
                                {isSummarizing ? (
                                    <Spinner className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Sparkles className="h-4 w-4" />
                                )}
                                {isSummarizing ? "Analyzing..." : "Nova Insights"}
                            </Button>

                            <AnimatePresence>
                                {summary && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm"
                                    >
                                        <div className="flex items-center gap-1.5 mb-2 text-indigo-600">
                                            <Sparkles className="h-3 w-3" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Nova AI Insights</span>
                                            <button onClick={() => setSummary(null)} className="ml-auto text-muted-foreground hover:text-foreground">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                        <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 italic">
                                            {summary}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</Label>
                                <Select
                                    value={status}
                                    onValueChange={(val: string) => {
                                        setStatus(val);
                                        handleUpdate("status", val);
                                    }}
                                >
                                    <SelectTrigger className="w-full h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statuses.map((s: any) => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Priority</Label>
                                <Select
                                    value={priority}
                                    onValueChange={(val: string) => {
                                        setPriority(val);
                                        handleUpdate("priority", val);
                                    }}
                                >
                                    <SelectTrigger className="w-full h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold">
                                        <SelectValue placeholder="Priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Due Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full h-10 justify-start text-left font-bold text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl",
                                                !dueDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4 text-indigo-500" />
                                            {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-4" align="start">
                                        <div className="flex flex-col gap-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Date</Label>
                                            <input
                                                type="date"
                                                className="w-full h-10 px-3 bg-white dark:bg-slate-900 border rounded-lg text-sm"
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
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Estimate (h)</Label>
                                    <Input
                                        type="number"
                                        value={estimatedHours}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            setEstimatedHours(val);
                                            handleUpdate("estimatedHours", val);
                                        }}
                                        className="h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Progress (%)</Label>
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
                                        className="h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Task Color</Label>
                                <div className="grid grid-cols-5 gap-2">
                                    {["", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b", "#0f172a", "#4f46e5"].map((c) => (
                                        <button
                                            key={c}
                                            onClick={() => {
                                                setColor(c);
                                                handleUpdate("color", c);
                                            }}
                                            className={cn(
                                                "h-6 w-6 rounded-full border border-slate-200 dark:border-slate-800 transition-all",
                                                color === c ? "ring-2 ring-indigo-500 ring-offset-2 scale-110" : "hover:scale-105",
                                                !c && "bg-slate-100 dark:bg-slate-800"
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

                            <hr className="border-slate-100 dark:border-slate-800" />

                            <div className="space-y-4">
                                {!showDeleteConfirm ? (
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start gap-2 text-xs font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                                        onClick={() => setShowDeleteConfirm(true)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Delete Task
                                    </Button>
                                ) : (
                                    <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl space-y-3 animate-in zoom-in-95">
                                        <div className="flex items-center gap-2 text-red-600">
                                            <AlertCircle className="h-4 w-4" />
                                            <span className="text-[10px] font-black uppercase">Confirm Delete?</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="flex-1 h-8 text-[10px] font-bold"
                                                onClick={() => setShowDeleteConfirm(false)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="flex-1 h-8 text-[10px] font-bold bg-red-600 hover:bg-red-700 text-white"
                                                onClick={() => deleteMutation.mutate()}
                                                disabled={deleteMutation.isPending}
                                            >
                                                {deleteMutation.isPending ? "..." : "Delete"}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 space-y-4">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span className="text-[10px] font-medium italic">Created {format(new Date(task.createdAt), "MMM d, yyyy")}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
