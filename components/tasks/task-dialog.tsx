"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Sheet,
    SheetContent,
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
import { Calendar as CalendarIcon, Clock, Sparkles, Loader2 as Spinner, X, Trash2, Palette, AlertCircle, MessageSquare, CheckSquare, Link2, Users } from "lucide-react";
import { format } from "date-fns";

import { useAbly } from "@/hooks/use-ably";
import { generateAiText } from "@/lib/call-ai";
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
import { TaskChecklist } from "./task-checklist";
import { TaskAssignees } from "./task-assignees";
import { TaskDependencies } from "./task-dependencies";

interface TaskDialogProps {
    task: any;
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
}

const TASK_TYPES = [
    { value: "task", label: "Task", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
    { value: "bug", label: "Bug", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    { value: "feature", label: "Feature", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    { value: "story", label: "Story", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    { value: "epic", label: "Epic", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
    { value: "improvement", label: "Improvement", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
];

export function TaskDialog({ task, isOpen, onClose, workspaceId }: TaskDialogProps) {
    const queryClient = useQueryClient();
    const taskIdRef = useRef(task?.id);
    const lastPropUpdateRef = useRef(Date.now());
    const lastAblyUpdateRef = useRef(0);
    const [title, setTitle] = useState(task?.title || "");
    const [description, setDescription] = useState(task?.description || "");
    const [status, setStatus] = useState(task?.status || "todo");
    const [priority, setPriority] = useState(task?.priority || "medium");
    const [taskType, setTaskType] = useState(task?.taskType || "task");
    const [dueDate, setDueDate] = useState<Date | undefined>(
        task?.dueDate ? new Date(task?.dueDate) : undefined
    );
    const [startDate, setStartDate] = useState<Date | undefined>(
        task?.startDate ? new Date(task?.startDate) : undefined
    );
    const [estimatedHours, setEstimatedHours] = useState(task?.estimatedHours || 0);
    const [progress, setProgress] = useState(task?.progress || 0);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [summary, setSummary] = useState<string | null>(null);
    const [riskAnalysis, setRiskAnalysis] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [color, setColor] = useState(task?.color || "");
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [assigneeIds, setAssigneeIds] = useState<string[]>(task?.assigneeIds || []);

    const titleRef = useRef<HTMLInputElement>(null);
    const taskChannel = task?.id ? getTaskChannel(workspaceId, task.id) : null;

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === "Escape" && !showDeleteConfirm) {
            onClose();
        }
    }, [onClose, showDeleteConfirm]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
            // Auto-focus title after a brief delay to let the sheet animate in
            const timer = setTimeout(() => titleRef.current?.focus(), 300);
            return () => {
                document.removeEventListener("keydown", handleKeyDown);
                clearTimeout(timer);
            };
        }
    }, [isOpen, handleKeyDown]);

    useAbly(taskChannel, "task:updated", (updatedTask) => {
        if (updatedTask.id === task.id && updatedTask.id === taskIdRef.current) {
            const now = Date.now();
            if (now < lastPropUpdateRef.current) return;
            lastAblyUpdateRef.current = now;
            setTitle(updatedTask.title);
            setDescription(updatedTask.description || "");
            setStatus(updatedTask.status);
            setPriority(updatedTask.priority);
            setTaskType(updatedTask.taskType || "task");
            setDueDate(updatedTask.dueDate ? new Date(updatedTask.dueDate) : undefined);
            setStartDate(updatedTask.startDate ? new Date(updatedTask.startDate) : undefined);
            setEstimatedHours(updatedTask.estimatedHours || 0);
            setProgress(updatedTask.progress || 0);
            setColor(updatedTask.color || "");
            setAssigneeIds(updatedTask.assigneeIds || []);
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
            taskIdRef.current = task.id;
            lastPropUpdateRef.current = Date.now();
            setTitle(task.title);
            setDescription(task.description || "");
            setStatus(task.status);
            setPriority(task.priority);
            setTaskType(task.taskType || "task");
            setDueDate(task.dueDate ? new Date(task.dueDate) : undefined);
            setStartDate(task.startDate ? new Date(task.startDate) : undefined);
            setEstimatedHours(task.estimatedHours || 0);
            setProgress(task.progress || 0);
            setColor(task.color || "");
            setAssigneeIds(task.assigneeIds || []);
            setShowDeleteConfirm(false);
        }
    }, [task]);

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch(`/api/tasks/${task.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to update task");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["board"] });
            queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
            setLastSaved(new Date());
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to update task");
        },
    });

    const handleUpdate = (field: string, value: any) => {
        updateMutation.mutate({ [field]: value });
    };

    const handleAssigneesUpdate = (ids: string[]) => {
        setAssigneeIds(ids);
        handleUpdate("assigneeIds", ids);
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
            const prompt = `/summarize Summarize the current state of this task and recommend next steps.
Task: ${title}
Current Progress: ${progress}%
Subtasks: ${task.subtasks?.map((s:any) => s.title).join(", ") || "None"}
Last Description: ${description}`;
            const text = await generateAiText({ prompt, workspaceId });
            setSummary(text);
        } catch (error: any) {
            toast.error(error.message || "Couldn't summarize this task.");
        } finally {
            setIsSummarizing(false);
        }
    };

    const totalTracked = task?.timeLogs?.reduce((sum: number, log: any) => sum + (log.duration || 0), 0) || task?.timeSpent || 0;
    const remainingHours = Math.max(0, estimatedHours - totalTracked / 3600);

    const typeInfo = TASK_TYPES.find(t => t.value === taskType) || TASK_TYPES[0];

    if (!task) return null;

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="right" className="fixed left-auto right-0 top-0 translate-x-0 translate-y-0 h-[100dvh] w-full sm:w-[95vw] md:w-[85vw] lg:w-[1100px] sm:max-w-none p-0 border-l bg-background/95 backdrop-blur-3xl shadow-2xl rounded-none sm:rounded-l-xl overflow-hidden flex flex-col">
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
                            {updateMutation.isPending ? "Saving..." : lastSaved ? "Saved" : "Synced"}
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setShowDeleteConfirm(true)} className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" aria-label="Delete task">
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-muted transition-colors" aria-label="Close task dialog">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
                    <div className="flex flex-col lg:flex-row min-h-full">
                        <div className="flex-1 p-8 sm:p-12 lg:p-16 space-y-12 lg:border-r">
                            <div className="space-y-8">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <span className={cn("text-[10px] font-semibold px-2.5 py-1 rounded-full", typeInfo.color)}>
                                        {typeInfo.label}
                                    </span>
                                    {task.completedAt && (
                                        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                            Completed {format(new Date(task.completedAt), "MMM d")}
                                        </span>
                                    )}
                                </div>
                                <Input
                                    ref={titleRef}
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    onBlur={() => handleUpdate("title", title)}
                                    className="text-4xl sm:text-5xl font-semibold bg-transparent border-none p-0 focus-visible:ring-0 placeholder:text-muted-foreground/30 h-auto tracking-tight leading-none"
                                    placeholder="Task title"
                                    aria-label="Task title"
                                />
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    onBlur={() => handleUpdate("description", description)}
                                    className="min-h-[120px] bg-transparent border border-transparent hover:border-primary/10 focus-visible:border-primary/20 focus-visible:bg-muted/50 rounded-lg p-6 text-base resize-y focus-visible:ring-0 leading-relaxed placeholder:text-muted-foreground transition-all"
                                    placeholder="Add a description..."
                                />
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                    <h3 className="text-lg font-semibold tracking-tight">Subtasks</h3>
                                </div>
                                <TaskSubtasks taskId={task.id} workspaceId={workspaceId} />
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <CheckSquare className="h-4 w-4 text-primary" />
                                    <h3 className="text-lg font-semibold tracking-tight">Checklist</h3>
                                </div>
                                <TaskChecklist taskId={task.id} workspaceId={workspaceId} />
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <Link2 className="h-4 w-4 text-primary" />
                                    <h3 className="text-lg font-semibold tracking-tight">Dependencies</h3>
                                </div>
                                <TaskDependencies taskId={task.id} workspaceId={workspaceId} />
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <Palette className="h-4 w-4 text-primary" />
                                    <h3 className="text-lg font-semibold tracking-tight">Attachments</h3>
                                </div>
                                <TaskAttachments taskId={task.id} workspaceId={workspaceId} attachments={task.fieldValues?.attachments || []} />
                            </div>

                            <hr className="border-border/10 my-8" />

                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <MessageSquare className="h-4 w-4 text-primary" />
                                    <h3 className="text-lg font-semibold tracking-tight">Comments</h3>
                                </div>
                                <TaskComments taskId={task.id} workspaceId={workspaceId} />
                            </div>

                            <div className="space-y-6 pt-12">
                                <div className="flex items-center gap-3">
                                    <Clock className="h-4 w-4 text-primary" />
                                    <h3 className="text-lg font-semibold tracking-tight">Activity</h3>
                                </div>
                                <TaskActivity taskId={task.id} workspaceId={workspaceId} />
                            </div>
                        </div>

                        <div className="w-full lg:w-[320px] xl:w-[360px] shrink-0 p-8 sm:p-10 bg-muted/30">
                            <div className="sticky top-8 space-y-10">
                                <div className="space-y-6">
                                    <TaskAssignees
                                        assigneeIds={assigneeIds}
                                        workspaceId={workspaceId}
                                        onUpdate={handleAssigneesUpdate}
                                    />

                                    <div className="space-y-3">
                                        <Label className="text-xs font-medium text-muted-foreground ml-1">Type</Label>
                                        <Select value={taskType} onValueChange={(val: string) => { setTaskType(val); handleUpdate("taskType", val); }}>
                                            <SelectTrigger className="w-full h-11 bg-background border rounded-lg text-xs shadow-sm hover:border-primary/30 transition-colors">
                                                <SelectValue placeholder="Type" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-background/95 backdrop-blur-2xl border rounded-lg p-2">
                                                {TASK_TYPES.map((t) => (
                                                    <SelectItem key={t.value} value={t.value} className="rounded-md text-xs p-3 cursor-pointer">{t.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

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
                                                <SelectItem value="urgent" className="rounded-md text-xs p-3 cursor-pointer text-red-600">Urgent</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-xs font-medium text-muted-foreground ml-1">Start Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className={cn("w-full h-11 justify-start text-left font-medium text-xs bg-background border rounded-lg shadow-sm hover:border-primary/30 transition-colors", !startDate && "text-muted-foreground")}>
                                                    <CalendarIcon className="mr-3 h-4 w-4 text-primary" />
                                                    {startDate ? format(startDate, "PPP") : <span>Set start date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-6 bg-background/95 backdrop-blur-2xl border rounded-xl shadow-2xl" align="start">
                                                <div className="flex flex-col gap-4">
                                                    <Label className="text-xs font-medium text-muted-foreground">Start Date</Label>
                                                    <Input
                                                        type="date"
                                                        className="w-full h-12 px-5 bg-muted border-none rounded-lg text-xs focus:ring-2 focus:ring-primary/20"
                                                        value={startDate ? format(startDate, "yyyy-MM-dd") : ""}
                                                        onChange={(e) => {
                                                            const date = e.target.value ? new Date(e.target.value) : undefined;
                                                            setStartDate(date);
                                                            handleUpdate("startDate", date?.toISOString() || null);
                                                        }}
                                                    />
                                                </div>
                                            </PopoverContent>
                                        </Popover>
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
                                                            handleUpdate("dueDate", date?.toISOString() || null);
                                                        }}
                                                    />
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-xs font-medium text-muted-foreground ml-1">Time</Label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-muted-foreground">Estimated (h)</span>
                                                <Input
                                                    type="number"
                                                    value={estimatedHours}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        setEstimatedHours(val);
                                                    }}
                                                    onBlur={(e) => {
                                                        const val = parseInt(e.currentTarget.value) || 0;
                                                        handleUpdate("estimatedHours", val);
                                                    }}
                                                    className="h-9 bg-background border rounded-lg text-xs shadow-sm text-center hover:border-primary/30 transition-colors"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-muted-foreground">Remaining</span>
                                                <div className="h-9 bg-background border rounded-lg text-xs shadow-sm flex items-center justify-center text-muted-foreground">
                                                    {remainingHours.toFixed(1)}h
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-muted-foreground">Tracked</span>
                                                <span className="text-[10px] font-medium">{(totalTracked / 3600).toFixed(1)}h</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary transition-all duration-500"
                                                    style={{ width: `${Math.min(100, estimatedHours > 0 ? (totalTracked / 3600 / estimatedHours) * 100 : 0)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-xs font-medium text-muted-foreground ml-1">Progress (%)</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={progress}
                                            onChange={(e) => {
                                                const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                                setProgress(val);
                                            }}
                                            onBlur={(e) => {
                                                const val = Math.min(100, Math.max(0, parseInt(e.currentTarget.value) || 0));
                                                handleUpdate("progress", val);
                                            }}
                                            className="h-11 bg-background border rounded-lg text-xs shadow-sm text-center hover:border-primary/30 transition-colors"
                                        />
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
                                                    aria-label={c ? `Set color to ${c}` : "Remove color"}
                                                    aria-pressed={color === c}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <TagSelector
                                        taskId={task.id}
                                        workspaceId={workspaceId}
                                        currentTagIds={task.tagIds || []}
                                    />

                                    <div className="pt-4 border-t space-y-2">
                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                            <span>Created</span>
                                            <span>{format(new Date(task.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                            <span>Updated</span>
                                            <span>{format(new Date(task.updatedAt), "MMM d, yyyy 'at' h:mm a")}</span>
                                        </div>
                                        {task.completedAt && (
                                            <div className="flex items-center justify-between text-[10px] text-emerald-600 dark:text-emerald-400">
                                                <span>Completed</span>
                                                <span>{format(new Date(task.completedAt), "MMM d, yyyy 'at' h:mm a")}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-6 border-t">
                                    <TimeTracker taskId={task.id} />
                                    
                                    <Button
                                        variant="outline"
                                        className="w-full h-12 justify-start gap-3 bg-primary/5 hover:bg-primary border-none hover:text-primary-foreground text-primary font-semibold text-xs rounded-lg transition-all group"
                                        onClick={handleAISummary}
                                        disabled={isSummarizing}
                                        aria-label="Generate AI summary"
                                    >
                                        {isSummarizing ? <Spinner className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 group-hover:scale-110 transition-transform" />}
                                        {isSummarizing ? "Summarizing..." : "AI Summary"}
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className="w-full h-12 justify-start gap-3 bg-destructive/5 hover:bg-destructive border-none hover:text-destructive-foreground text-destructive font-semibold text-xs rounded-lg transition-all group"
                                        onClick={async () => {
                                            setIsAnalyzing(true);
                                            try {
                                                const prompt = `/risks Analyze potential risks for this task: ${title}`;
                                                const text = await generateAiText({ prompt, workspaceId });
                                                setRiskAnalysis(text);
                                            } catch (error: any) {
                                                toast.error(error.message || "Risk analysis failed.");
                                            } finally {
                                                setIsAnalyzing(false);
                                            }
                                        }}
                                        disabled={isAnalyzing}
                                        aria-label="Run risk analysis"
                                    >
                                        <AlertCircle className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                        Risk Analysis
                                    </Button>

                                    {riskAnalysis && (
                                        <div className="overflow-hidden">
                                            <div className="p-5 mt-4 bg-destructive/10 text-foreground rounded-lg relative">
                                                <button onClick={() => setRiskAnalysis(null)} className="absolute top-4 right-4 text-muted-foreground/50 hover:text-foreground transition-colors" aria-label="Dismiss risk analysis">
                                                    <X className="h-4 w-4" />
                                                </button>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                                                    <span className="text-xs font-semibold text-destructive">Risk Analysis</span>
                                                </div>
                                                <p className="text-xs leading-relaxed text-muted-foreground">
                                                    {riskAnalysis}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {summary && (
                                        <div className="overflow-hidden">
                                            <div className="p-5 mt-4 bg-primary/10 text-foreground rounded-lg relative">
                                                <button onClick={() => setSummary(null)} className="absolute top-4 right-4 text-muted-foreground/50 hover:text-foreground transition-colors" aria-label="Dismiss summary">
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
                                            <Button size="sm" variant="ghost" className="flex-1 h-9 rounded-md hover:bg-destructive/10 hover:text-destructive" onClick={() => setShowDeleteConfirm(false)} aria-label="Cancel delete">
                                                Cancel
                                            </Button>
                                            <Button size="sm" className="flex-1 h-9 rounded-md bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} aria-label="Confirm delete task">
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
