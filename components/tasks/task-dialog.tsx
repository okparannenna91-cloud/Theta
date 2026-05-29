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
            toast.error("Nova couldn't summarize this task.");
        } finally {
            setIsSummarizing(false);
        }
    };

    if (!task) return null;

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="right" className="fixed left-auto right-0 top-0 translate-x-0 translate-y-0 h-[100dvh] w-full sm:w-[95vw] md:w-[85vw] lg:w-[1100px] sm:max-w-none p-0 border-l border-indigo-500/10 bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl shadow-2xl rounded-none sm:rounded-l-[2rem] overflow-hidden flex flex-col selection:bg-indigo-500/30">
                {/* Top Bar (Breadcrumbs & Actions) */}
                <div className="h-16 border-b border-indigo-500/5 px-6 sm:px-8 flex items-center justify-between shrink-0 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md sticky top-0 z-20">
                    <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-slate-400">
                        <span className="hover:text-indigo-600 transition-colors cursor-pointer">Workspace</span>
                        <span>/</span>
                        <span className="hover:text-indigo-600 transition-colors cursor-pointer">Task Node</span>
                        <span>/</span>
                        <span className="text-slate-900 dark:text-white truncate max-w-[150px] sm:max-w-[300px]">
                            {task.title || "Unidentified"}
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Synchronized
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setShowDeleteConfirm(true)} className="h-8 w-8 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Main Content Area (70/30 Split) */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
                    <div className="flex flex-col lg:flex-row min-h-full">
                        {/* Left Column (70%) */}
                        <div className="flex-1 p-8 sm:p-12 lg:p-16 space-y-12 lg:border-r border-indigo-500/5">
                            {/* Title & Description */}
                            <div className="space-y-8">
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    onBlur={() => handleUpdate("title", title)}
                                    className="text-4xl sm:text-5xl font-black bg-transparent border-none p-0 focus-visible:ring-0 placeholder:text-slate-200 h-auto uppercase tracking-tighter leading-none"
                                    placeholder="NODE IDENTIFIER..."
                                />
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    onBlur={() => handleUpdate("description", description)}
                                    className="min-h-[120px] bg-transparent border border-transparent hover:border-indigo-500/10 focus-visible:border-indigo-500/20 focus-visible:bg-slate-50/50 dark:focus-visible:bg-slate-900/50 rounded-2xl p-6 text-base font-bold resize-y focus-visible:ring-0 leading-relaxed placeholder:text-slate-400 transition-all"
                                    placeholder="Define the scope of this operational node..."
                                />
                            </div>

                            {/* Subtasks */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <Sparkles className="h-4 w-4 text-indigo-600" />
                                    <h3 className="text-lg font-black uppercase tracking-tighter">Sub-Process Integration</h3>
                                </div>
                                <TaskSubtasks taskId={task.id} />
                            </div>

                            {/* Attachments */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <Palette className="h-4 w-4 text-indigo-600" />
                                    <h3 className="text-lg font-black uppercase tracking-tighter">Data Artifacts</h3>
                                </div>
                                <TaskAttachments taskId={task.id} workspaceId={workspaceId} attachments={task.attachments || []} />
                            </div>

                            <hr className="border-indigo-500/10 my-8" />

                            {/* Comments */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <Type className="h-4 w-4 text-indigo-600" />
                                    <h3 className="text-lg font-black uppercase tracking-tighter">Stream Dialogue</h3>
                                </div>
                                <TaskComments taskId={task.id} workspaceId={workspaceId} />
                            </div>

                            {/* Activity */}
                            <div className="space-y-6 pt-12 opacity-50 hover:opacity-100 transition-opacity">
                                <div className="flex items-center gap-3">
                                    <Clock className="h-4 w-4 text-indigo-600" />
                                    <h3 className="text-lg font-black uppercase tracking-tighter">Event Logs</h3>
                                </div>
                                <TaskActivity taskId={task.id} workspaceId={workspaceId} />
                            </div>
                        </div>

                        {/* Right Column (30%) */}
                        <div className="w-full lg:w-[320px] xl:w-[360px] shrink-0 p-8 sm:p-10 bg-slate-50/30 dark:bg-slate-950/30">
                            <div className="sticky top-8 space-y-10">
                                {/* Core Metadata */}
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Process Status</Label>
                                        <Select value={status} onValueChange={(val: string) => { setStatus(val); handleUpdate("status", val); }}>
                                            <SelectTrigger className="w-full h-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:border-indigo-500/30 transition-colors">
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border-indigo-500/20 rounded-2xl p-2">
                                                {statuses.map((s: any) => (
                                                    <SelectItem key={s.id} value={s.id} className="rounded-xl font-black uppercase tracking-widest text-[9px] p-3 cursor-pointer">{s.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Priority Level</Label>
                                        <Select value={priority} onValueChange={(val: string) => { setPriority(val); handleUpdate("priority", val); }}>
                                            <SelectTrigger className="w-full h-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:border-indigo-500/30 transition-colors">
                                                <SelectValue placeholder="Priority" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border-indigo-500/20 rounded-2xl p-2">
                                                <SelectItem value="low" className="rounded-xl font-black uppercase tracking-widest text-[9px] p-3 cursor-pointer text-emerald-500">STANDARD</SelectItem>
                                                <SelectItem value="medium" className="rounded-xl font-black uppercase tracking-widest text-[9px] p-3 cursor-pointer text-amber-500">ELEVATED</SelectItem>
                                                <SelectItem value="high" className="rounded-xl font-black uppercase tracking-widest text-[9px] p-3 cursor-pointer text-red-500">CRITICAL</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Deadline Vector</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className={cn("w-full h-11 justify-start text-left font-black text-[10px] uppercase tracking-widest bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:border-indigo-500/30 transition-colors", !dueDate && "text-slate-400")}>
                                                    <CalendarIcon className="mr-3 h-4 w-4 text-indigo-600" />
                                                    {dueDate ? format(dueDate, "PPP") : <span>Initialize Date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-6 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border-indigo-500/20 rounded-3xl shadow-2xl" align="start">
                                                <div className="flex flex-col gap-4">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Chronos</Label>
                                                    <input
                                                        type="date"
                                                        className="w-full h-12 px-5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/20"
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
                                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Est. (h)</Label>
                                            <Input
                                                type="number"
                                                value={estimatedHours}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    setEstimatedHours(val);
                                                    handleUpdate("estimatedHours", val);
                                                }}
                                                className="h-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black shadow-sm text-center hover:border-indigo-500/30 transition-colors"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Done (%)</Label>
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
                                                className="h-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black shadow-sm text-center hover:border-indigo-500/30 transition-colors"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Visual Signature</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {["", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b", "#0f172a", "#4f46e5"].map((c) => (
                                                <button
                                                    key={c}
                                                    onClick={() => {
                                                        setColor(c);
                                                        handleUpdate("color", c);
                                                    }}
                                                    className={cn(
                                                        "h-6 w-6 rounded-full border border-slate-200 dark:border-slate-800 transition-all duration-300",
                                                        color === c ? "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-950 scale-110 shadow-md" : "hover:scale-110",
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
                                </div>

                                {/* Advanced Utilities */}
                                <div className="space-y-4 pt-6 border-t border-indigo-500/10">
                                    <TimeTracker taskId={task.id} />
                                    
                                    <Button
                                        variant="outline"
                                        className="w-full h-12 justify-start gap-3 bg-indigo-600/5 hover:bg-indigo-600 border-none hover:text-white text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all group"
                                        onClick={handleAISummary}
                                        disabled={isSummarizing}
                                    >
                                        {isSummarizing ? <Spinner className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 group-hover:scale-110 transition-transform" />}
                                        {isSummarizing ? "Synthesizing..." : "Nova Intelligence"}
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className="w-full h-12 justify-start gap-3 bg-rose-500/5 hover:bg-rose-500 border-none hover:text-white text-rose-600 dark:text-rose-400 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all group"
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

                                    <AnimatePresence>
                                        {summary && (
                                            <motion.div 
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="p-5 mt-4 bg-indigo-600 text-white rounded-2xl relative shadow-lg">
                                                    <button onClick={() => setSummary(null)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Sparkles className="h-3.5 w-3.5" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Neural Insights</span>
                                                    </div>
                                                    <p className="text-xs font-medium leading-relaxed opacity-90">
                                                        {summary}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                
                                {showDeleteConfirm && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl space-y-4"
                                    >
                                        <div className="flex items-center gap-2 text-rose-600">
                                            <AlertCircle className="h-4 w-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Confirm Deletion?</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="ghost" className="flex-1 h-9 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-rose-500/10 hover:text-rose-600" onClick={() => setShowDeleteConfirm(false)}>
                                                Cancel
                                            </Button>
                                            <Button size="sm" className="flex-1 h-9 rounded-lg text-[9px] font-black uppercase tracking-widest bg-rose-600 hover:bg-rose-700 text-white" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                                                {deleteMutation.isPending ? "..." : "Delete"}
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
