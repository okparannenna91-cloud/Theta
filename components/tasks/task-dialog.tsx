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
            <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden p-0 border-none bg-transparent selection:bg-indigo-500/30">
                <div className="flex flex-col lg:flex-row h-full w-full glass-card border-none rounded-[3rem] overflow-hidden bg-white/80 dark:bg-slate-950/80 backdrop-blur-3xl shadow-[0_50px_100px_rgba(0,0,0,0.3)]">
                    {/* Main Content */}
                    <div className="flex-1 p-10 sm:p-16 space-y-12 overflow-y-auto no-scrollbar">
                        <div className="space-y-10">
                            <div className="flex items-center justify-between gap-6">
                                <div className="flex items-center gap-6">
                                    <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-600/20 neural-glow">
                                        <Layout className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Node Synchronization</span>
                                        <div className="flex items-center gap-3">
                                            <div className="h-1 w-8 bg-indigo-600 rounded-full" />
                                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">
                                                Last Active {format(new Date(task.updatedAt), "HH:mm:ss")}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={onClose} className="h-12 w-12 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                                    <X className="h-6 w-6" />
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    onBlur={() => handleUpdate("title", title)}
                                    className="text-4xl sm:text-5xl font-black bg-transparent border-none p-0 focus-visible:ring-0 placeholder:text-slate-200 h-auto uppercase tracking-tighter leading-none"
                                    placeholder="NODE IDENTIFIER..."
                                />
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-4 text-slate-400">
                                    <AlignLeft className="h-4 w-4" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Operational Context</span>
                                </div>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    onBlur={() => handleUpdate("description", description)}
                                    className="min-h-[180px] bg-slate-100/50 dark:bg-slate-900/50 border-none rounded-[2rem] p-10 text-base font-bold resize-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 leading-relaxed placeholder:text-slate-400"
                                    placeholder="Define the scope of this operational node..."
                                />
                            </div>
                        </div>

                        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent" />

                        {/* Subtasks */}
                        <div className="space-y-8">
                            <div className="flex items-center gap-4">
                                <Sparkles className="h-4 w-4 text-indigo-600" />
                                <h3 className="text-xl font-black uppercase tracking-tighter">Sub-Process Integration</h3>
                            </div>
                            <TaskSubtasks taskId={task.id} />
                        </div>

                        {/* Attachments */}
                        <div className="space-y-8">
                            <div className="flex items-center gap-4">
                                <Palette className="h-4 w-4 text-indigo-600" />
                                <h3 className="text-xl font-black uppercase tracking-tighter">Data Artifacts</h3>
                            </div>
                            <TaskAttachments taskId={task.id} workspaceId={workspaceId} attachments={task.attachments || []} />
                        </div>

                        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent" />

                        {/* Comments */}
                        <div className="space-y-8">
                            <div className="flex items-center gap-4">
                                <Type className="h-4 w-4 text-indigo-600" />
                                <h3 className="text-xl font-black uppercase tracking-tighter">Stream Dialogue</h3>
                            </div>
                            <TaskComments taskId={task.id} workspaceId={workspaceId} />
                        </div>

                        {/* Activity */}
                        <div className="space-y-8">
                            <div className="flex items-center gap-4">
                                <Clock className="h-4 w-4 text-indigo-600" />
                                <h3 className="text-xl font-black uppercase tracking-tighter">Event Logs</h3>
                            </div>
                            <TaskActivity taskId={task.id} workspaceId={workspaceId} />
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="w-full lg:w-[380px] p-10 sm:p-12 space-y-10 bg-slate-50/50 dark:bg-slate-950/50 backdrop-blur-2xl border-l border-indigo-500/10 overflow-y-auto no-scrollbar">
                        <div className="space-y-8">
                            <TimeTracker taskId={task.id} />

                            <div className="space-y-4">
                                <Button
                                    variant="outline"
                                    className="w-full h-16 justify-start gap-5 bg-indigo-600 text-white hover:bg-indigo-700 border-none font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-xl shadow-indigo-600/20 transition-all active:scale-95 group"
                                    onClick={handleAISummary}
                                    disabled={isSummarizing}
                                >
                                    <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        {isSummarizing ? (
                                            <Spinner className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Sparkles className="h-4 w-4" />
                                        )}
                                    </div>
                                    {isSummarizing ? "Synthesizing..." : "Nova Intelligence"}
                                </Button>

                                <Button
                                    variant="outline"
                                    className="w-full h-14 justify-start gap-4 bg-white/50 dark:bg-slate-900/50 hover:bg-rose-600 hover:text-white text-rose-600 border-none font-black uppercase tracking-[0.2em] text-[9px] rounded-2xl transition-all duration-500 active:scale-95"
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
                                    <AlertCircle className="h-4 w-4" />
                                    Risk Matrix Analysis
                                </Button>

                                <AnimatePresence>
                                    {summary && (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="p-8 bg-indigo-600 text-white rounded-[2rem] border-none shadow-2xl neural-glow relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 p-4">
                                                <button onClick={() => setSummary(null)} className="text-white/40 hover:text-white transition-colors">
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                                                    <Sparkles className="h-4 w-4" />
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Neural Insights</span>
                                            </div>
                                            <p className="text-sm font-bold leading-relaxed italic opacity-90">
                                                "{summary}"
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="space-y-6 bg-white/30 dark:bg-slate-900/30 p-8 rounded-[2.5rem] border border-indigo-500/5">
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Process Status</Label>
                                    <Select
                                        value={status}
                                        onValueChange={(val: string) => {
                                            setStatus(val);
                                            handleUpdate("status", val);
                                        }}
                                    >
                                        <SelectTrigger className="w-full h-12 bg-white/50 dark:bg-slate-950/50 border-none rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl border-indigo-500/20 rounded-2xl p-2">
                                            {statuses.map((s: any) => (
                                                <SelectItem key={s.id} value={s.id} className="rounded-xl font-black uppercase tracking-widest text-[9px] p-3">{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Operational Priority</Label>
                                    <Select
                                        value={priority}
                                        onValueChange={(val: string) => {
                                            setPriority(val);
                                            handleUpdate("priority", val);
                                        }}
                                    >
                                        <SelectTrigger className="w-full h-12 bg-white/50 dark:bg-slate-950/50 border-none rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
                                            <SelectValue placeholder="Priority" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl border-indigo-500/20 rounded-2xl p-2">
                                            <SelectItem value="low" className="rounded-xl font-black uppercase tracking-widest text-[9px] p-3 text-emerald-500">STANDARD</SelectItem>
                                            <SelectItem value="medium" className="rounded-xl font-black uppercase tracking-widest text-[9px] p-3 text-amber-500">ELEVATED</SelectItem>
                                            <SelectItem value="high" className="rounded-xl font-black uppercase tracking-widest text-[9px] p-3 text-red-500">CRITICAL</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Deadline Vector</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full h-12 justify-start text-left font-black text-[10px] uppercase tracking-widest bg-white/50 dark:bg-slate-950/50 border-none rounded-xl shadow-sm",
                                                    !dueDate && "text-slate-400"
                                                )}
                                            >
                                                <CalendarIcon className="mr-3 h-4 w-4 text-indigo-600" />
                                                {dueDate ? format(dueDate, "PPP") : <span>Initialize Date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-6 bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl border-indigo-500/20 rounded-3xl shadow-2xl" align="start">
                                            <div className="flex flex-col gap-4">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Chronos</Label>
                                                <input
                                                    type="date"
                                                    className="w-full h-12 px-5 bg-white/50 dark:bg-slate-900/50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/20"
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

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Estimate (h)</Label>
                                        <Input
                                            type="number"
                                            value={estimatedHours}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 0;
                                                setEstimatedHours(val);
                                                handleUpdate("estimatedHours", val);
                                            }}
                                            className="h-12 bg-white/50 dark:bg-slate-950/50 border-none rounded-xl text-xs font-black shadow-sm text-center"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Completion (%)</Label>
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
                                            className="h-12 bg-white/50 dark:bg-slate-950/50 border-none rounded-xl text-xs font-black shadow-sm text-center"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Visual Signature</Label>
                                    <div className="grid grid-cols-5 gap-3">
                                        {["", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b", "#0f172a", "#4f46e5"].map((c) => (
                                            <button
                                                key={c}
                                                onClick={() => {
                                                    setColor(c);
                                                    handleUpdate("color", c);
                                                }}
                                                className={cn(
                                                    "h-8 w-8 rounded-full border border-white/10 transition-all duration-500",
                                                    color === c ? "ring-4 ring-indigo-500/20 scale-125 z-10 shadow-xl" : "hover:scale-110",
                                                    !c && "bg-slate-200 dark:bg-slate-800"
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

                            <div className="space-y-4 pt-4">
                                {!showDeleteConfirm ? (
                                    <Button
                                        variant="ghost"
                                        className="w-full h-14 justify-start gap-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-rose-600 hover:bg-rose-500/5 rounded-2xl transition-all duration-500"
                                        onClick={() => setShowDeleteConfirm(true)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Terminate Node
                                    </Button>
                                ) : (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="p-8 bg-rose-500/10 border border-rose-500/20 rounded-[2rem] space-y-6"
                                    >
                                        <div className="flex items-center gap-3 text-rose-600">
                                            <AlertCircle className="h-5 w-5" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Authorize Termination?</span>
                                        </div>
                                        <div className="flex gap-3">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="flex-1 h-12 rounded-xl text-[9px] font-black uppercase tracking-widest"
                                                onClick={() => setShowDeleteConfirm(false)}
                                            >
                                                Decline
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="flex-1 h-12 rounded-xl text-[9px] font-black uppercase tracking-widest bg-rose-600 hover:bg-rose-700 text-white shadow-xl shadow-rose-600/20"
                                                onClick={() => deleteMutation.mutate()}
                                                disabled={deleteMutation.isPending}
                                            >
                                                {deleteMutation.isPending ? "..." : "Terminate"}
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            <div className="pt-6 border-t border-indigo-500/5">
                                <div className="flex items-center gap-3 text-slate-400">
                                    <Clock className="h-3 w-3" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Genesis {format(new Date(task.createdAt), "MMM d, yyyy")}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
