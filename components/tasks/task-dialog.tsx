"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Clock, Sparkles, X, Trash2, Palette, AlertCircle, MessageSquare, CheckSquare, Link2, ArrowUpLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

import { useAbly } from "@/hooks/use-ably";
import { getTaskChannel } from "@/lib/ably";
import { DateField } from "@/components/ui/date-field";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useStatuses, getStatusValue, FALLBACK_STATUSES } from "@/hooks/use-statuses";
import { invalidateTaskCaches } from "@/lib/invalidate-task-caches";
import dynamic from "next/dynamic";

const sectionFallback = () => <div className="h-12 animate-pulse rounded-lg bg-muted/50" />;

const TaskAssignees = dynamic(() => import("./task-assignees").then(m => m.TaskAssignees), { ssr: false, loading: sectionFallback });
const TagSelector = dynamic(() => import("./tag-selector").then(m => m.TagSelector), { ssr: false, loading: sectionFallback });
const TimeTracker = dynamic(() => import("./time-tracker").then(m => m.TimeTracker), { ssr: false, loading: sectionFallback });
const TaskSubtasks = dynamic(() => import("./task-subtasks").then(m => m.TaskSubtasks), { ssr: false, loading: sectionFallback });
const TaskChecklist = dynamic(() => import("./task-checklist").then(m => m.TaskChecklist), { ssr: false, loading: sectionFallback });
const TaskDependencies = dynamic(() => import("./task-dependencies").then(m => m.TaskDependencies), { ssr: false, loading: sectionFallback });
const TaskAttachments = dynamic(() => import("./task-attachments").then(m => m.TaskAttachments), { ssr: false, loading: sectionFallback });
const TaskComments = dynamic(() => import("./task-comments").then(m => m.TaskComments), { ssr: false, loading: sectionFallback });
const TaskActivity = dynamic(() => import("./task-activity").then(m => m.TaskActivity), { ssr: false, loading: sectionFallback });
const CustomFieldsSection = dynamic(() => import("./task-custom-fields").then(m => m.CustomFieldsSection), { ssr: false, loading: sectionFallback });

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

const TASK_COLORS = ["", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b", "#0f172a", "#4f46e5"];

export function TaskDialog({ task, isOpen, onClose, workspaceId }: TaskDialogProps) {
    const queryClient = useQueryClient();
    const taskIdRef = useRef(task?.id);
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
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [color, setColor] = useState(task?.color || "");
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [assigneeIds, setAssigneeIds] = useState<string[]>(task?.assigneeIds || []);
    const [openChild, setOpenChild] = useState<any>(null);
    const [openParent, setOpenParent] = useState<any>(null);

    const titleRef = useRef<HTMLInputElement>(null);
    const hasAutoFocusedRef = useRef(false);
    const taskChannel = task?.id ? getTaskChannel(workspaceId, task.id) : null;

    const lastCommittedRef = useRef<Record<string, any>>({});

    const syncCommitted = useCallback((t: any) => {
        lastCommittedRef.current = {
            title: t.title,
            description: t.description || "",
            status: t.status,
            priority: t.priority,
            taskType: t.taskType || "task",
            startDate: t.startDate || null,
            dueDate: t.dueDate || null,
            estimatedHours: t.estimatedHours || 0,
            progress: t.progress || 0,
            color: t.color || "",
            assigneeIds: t.assigneeIds || [],
        };
    }, []);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === "Escape" && !showDeleteConfirm) {
            onClose();
        }
    }, [onClose, showDeleteConfirm]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
            if (!hasAutoFocusedRef.current) {
                hasAutoFocusedRef.current = true;
                const timer = setTimeout(() => titleRef.current?.focus(), 300);
                return () => {
                    document.removeEventListener("keydown", handleKeyDown);
                    clearTimeout(timer);
                };
            }
            return () => {
                document.removeEventListener("keydown", handleKeyDown);
            };
        } else {
            hasAutoFocusedRef.current = false;
        }
    }, [isOpen, handleKeyDown]);

    const handleAblyTaskUpdate = useCallback((updatedTask: any) => {
        if (!taskIdRef.current || updatedTask.id !== taskIdRef.current) return;
        const committed = lastCommittedRef.current;
        if (committed.title !== updatedTask.title) setTitle(updatedTask.title);
        if (committed.description !== (updatedTask.description || "")) setDescription(updatedTask.description || "");
        if (committed.status !== updatedTask.status) setStatus(updatedTask.status);
        if (committed.priority !== updatedTask.priority) setPriority(updatedTask.priority);
        if (committed.taskType !== (updatedTask.taskType || "task")) setTaskType(updatedTask.taskType || "task");
        if (committed.dueDate !== (updatedTask.dueDate || null))
            setDueDate(updatedTask.dueDate ? new Date(updatedTask.dueDate) : undefined);
        if (committed.startDate !== (updatedTask.startDate || null))
            setStartDate(updatedTask.startDate ? new Date(updatedTask.startDate) : undefined);
        if (committed.estimatedHours !== (updatedTask.estimatedHours || 0)) setEstimatedHours(updatedTask.estimatedHours || 0);
        if (committed.progress !== (updatedTask.progress || 0)) setProgress(updatedTask.progress || 0);
        if (committed.color !== (updatedTask.color || "")) setColor(updatedTask.color || "");
        if (committed.assigneeIds?.join(",") !== (updatedTask.assigneeIds || []).join(","))
            setAssigneeIds(updatedTask.assigneeIds || []);
    }, []);

    useAbly(taskChannel, "task:updated", handleAblyTaskUpdate);

    const { data: taskDetail } = useQuery({
        queryKey: ["task-detail", task?.id],
        queryFn: async () => {
            const res = await fetch(`/api/tasks/${task.id}`);
            if (!res.ok) throw new Error("Failed to fetch task");
            return res.json();
        },
        enabled: Boolean(task?.id),
    });

    const parentTitle = taskDetail?.parent?.title;

    const handleOpenParent = useCallback(() => {
        if (!taskDetail?.parent || !task) return;
        setOpenParent({
            id: taskDetail.parent.id,
            title: taskDetail.parent.title,
            status: taskDetail.parent.status,
            progress: taskDetail.parent.progress,
color: taskDetail.parent.color,
        dueDate: taskDetail.parent.dueDate,
        completedAt: taskDetail.parent.completedAt,
        createdAt: taskDetail.parent.createdAt,
        updatedAt: taskDetail.parent.updatedAt,
            projectId: task.projectId,
            workspaceId: task.workspaceId,
        });
    }, [taskDetail, task]);

    const { data: dbStatuses } = useStatuses(workspaceId, task?.projectId);
    const statuses = useMemo(() => {
        const src = dbStatuses && dbStatuses.length > 0 ? dbStatuses : FALLBACK_STATUSES;
        return src.map(s => ({
            id: getStatusValue(s.name),
            name: s.name,
            color: s.color,
        }));
    }, [dbStatuses]);

    useEffect(() => {
        if (task && taskIdRef.current !== task.id) {
            taskIdRef.current = task.id;
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
            syncCommitted(task);
        }
    }, [task, syncCommitted]);

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
        onSuccess: (_, variables) => {
            invalidateTaskCaches({ queryClient, workspaceId, projectId: task?.projectId });
            const field = Object.keys(variables)[0];
            if (field) lastCommittedRef.current[field] = variables[field];
            setLastSaved(new Date());
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to update task");
        },
    });

    const handleUpdate = useCallback((field: string, value: any) => {
        if (lastCommittedRef.current[field] === value) return;
        updateMutation.mutate({ [field]: value });
    }, [updateMutation]);

    const handleAssigneesUpdate = useCallback((ids: string[]) => {
        setAssigneeIds(ids);
        handleUpdate("assigneeIds", ids);
    }, [handleUpdate]);

    const handleTypeChange = useCallback((val: string) => {
        setTaskType(val);
        handleUpdate("taskType", val);
    }, [handleUpdate]);

    const handleStatusChange = useCallback((val: string) => {
        setStatus(val);
        handleUpdate("status", val);
    }, [handleUpdate]);

    const handlePriorityChange = useCallback((val: string) => {
        setPriority(val);
        handleUpdate("priority", val);
    }, [handleUpdate]);

    const handleStartDateChange = useCallback((date?: Date) => {
        setStartDate(date);
        handleUpdate("startDate", date?.toISOString() || null);
    }, [handleUpdate]);

    const handleDueDateChange = useCallback((date?: Date) => {
        setDueDate(date);
        handleUpdate("dueDate", date?.toISOString() || null);
    }, [handleUpdate]);

    const handleEstimatedChange = useCallback((val: number) => setEstimatedHours(val), []);
    const handleEstimatedBlur = useCallback((val: number) => {
        setEstimatedHours(val);
        handleUpdate("estimatedHours", val);
    }, [handleUpdate]);

    const handleProgressChange = useCallback((val: number) => {
        setProgress(val);
        handleUpdate("progress", val);
    }, [handleUpdate]);

    const handleColorChange = useCallback((c: string) => {
        setColor(c);
        handleUpdate("color", c);
    }, [handleUpdate]);

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/tasks/${task.id}?workspaceId=${workspaceId}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to delete task");
            return res.json();
        },
        onSuccess: () => {
            invalidateTaskCaches({ queryClient, workspaceId, projectId: task?.projectId });
            toast.success("Task deleted");
            onClose();
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to delete task");
        }
    });

    const totalTracked = task?.timeLogs?.reduce((sum: number, log: any) => sum + (log.duration || 0), 0) || task?.timeSpent || 0;
    const remainingHours = Math.max(0, estimatedHours - totalTracked / 3600);

    const typeInfo = TASK_TYPES.find(t => t.value === taskType) || TASK_TYPES[0];

    const handleDeleteRequest = useCallback(() => setShowDeleteConfirm(true), []);
    const handleCancelDelete = useCallback(() => setShowDeleteConfirm(false), []);
    const handleConfirmDelete = useCallback(() => deleteMutation.mutate(), [deleteMutation]);

    if (!task) return null;

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="right" className="fixed left-auto right-0 top-0 translate-x-0 translate-y-0 h-[100dvh] w-full sm:w-[95vw] md:w-[85vw] lg:w-[1100px] sm:max-w-none p-0 border-l bg-background shadow-2xl rounded-none sm:rounded-l-xl overflow-hidden flex flex-col" lazy>
                <TaskDialogHeader
                    title={task.title || "Untitled"}
                    parentTitle={task.parentId ? parentTitle : undefined}
                    isPending={updateMutation.isPending}
                    lastSaved={lastSaved}
                    onDelete={handleDeleteRequest}
                    onClose={onClose}
                    onOpenParent={handleOpenParent}
                />

                <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
                    <div className="flex flex-col lg:flex-row min-h-full">
                        <div className="flex-1 p-8 sm:p-12 lg:p-16 space-y-12 lg:border-r">
                            <div className="space-y-8">
                                {task.parentId && taskDetail?.parent && (
                                    <button
                                        onClick={handleOpenParent}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-muted/40 hover:bg-muted/70 hover:border-primary/30 transition-colors text-left group"
                                        aria-label={`Open parent task ${taskDetail.parent.title}`}
                                    >
                                        <span className="h-8 w-8 shrink-0 rounded-lg bg-primary/10 text-primary inline-flex items-center justify-center">
                                            <ArrowUpLeft className="h-4 w-4" />
                                        </span>
                                        <span className="flex-1 min-w-0">
                                            <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                                Parent Task
                                            </span>
                                            <span className="block text-sm font-semibold truncate group-hover:text-primary transition-colors">
                                                {taskDetail.parent.title}
                                            </span>
                                        </span>
                                        {taskDetail.parent.status && (
                                            <span
                                                className="text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0"
                                                style={{
                                                    color: taskDetail.parent.color || "#64748b",
                                                    backgroundColor: `${taskDetail.parent.color || "#64748b"}14`,
                                                    borderColor: `${taskDetail.parent.color || "#64748b"}33`,
                                                }}
                                            >
                                                {taskDetail.parent.status.replace(/_/g, " ")}
                                            </span>
                                        )}
                                        {typeof taskDetail.parent.progress === "number" && (
                                            <span className="text-[10px] font-semibold text-muted-foreground tabular-nums shrink-0">
                                                {taskDetail.parent.progress}%
                                            </span>
                                        )}
                                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 group-hover:text-primary transition-colors" />
                                    </button>
                                )}
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

                            <LazySections
                                taskId={task.id}
                                task={task}
                                workspaceId={workspaceId}
                                projectId={task.projectId}
                                attachments={task.fieldValues?.attachments || []}
                                onOpenChild={setOpenChild}
                            />
                        </div>

                        <TaskDialogSidebar
                            task={task}
                            statuses={statuses}
                            status={status}
                            priority={priority}
                            taskType={taskType}
                            startDate={startDate}
                            dueDate={dueDate}
                            estimatedHours={estimatedHours}
                            progress={progress}
                            color={color}
                            assigneeIds={assigneeIds}
                            totalTracked={totalTracked}
                            remainingHours={remainingHours}
                            workspaceId={workspaceId}
                            showDeleteConfirm={showDeleteConfirm}
                            isDeleting={deleteMutation.isPending}
                            onAssigneesUpdate={handleAssigneesUpdate}
                            onTypeChange={handleTypeChange}
                            onStatusChange={handleStatusChange}
                            onPriorityChange={handlePriorityChange}
                            onStartDateChange={handleStartDateChange}
                            onDueDateChange={handleDueDateChange}
                            onEstimatedChange={handleEstimatedChange}
                            onEstimatedBlur={handleEstimatedBlur}
                            onProgressChange={handleProgressChange}
                            onColorChange={handleColorChange}
                            onCancelDelete={handleCancelDelete}
                            onConfirmDelete={handleConfirmDelete}
                        />
                    </div>
                </div>
            </SheetContent>

            {openChild && (
                <TaskDialog
                    task={openChild}
                    isOpen
                    onClose={() => setOpenChild(null)}
                    workspaceId={workspaceId}
                />
            )}

            {openParent && (
                <TaskDialog
                    task={openParent}
                    isOpen
                    onClose={() => setOpenParent(null)}
                    workspaceId={workspaceId}
                />
            )}
        </Sheet>
    );
}

const TaskDialogHeader = React.memo(function TaskDialogHeader({ title, parentTitle, isPending, lastSaved, onDelete, onClose, onOpenParent }: {
    title: string;
    parentTitle?: string;
    isPending: boolean;
    lastSaved: Date | null;
    onDelete: () => void;
    onClose: () => void;
    onOpenParent: () => void;
}) {
    return (
        <div className="h-16 border-b px-6 sm:px-8 flex items-center justify-between shrink-0 bg-background sticky top-0 z-20">
            <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground min-w-0">
                <span className="hover:text-primary transition-colors cursor-pointer">Workspace</span>
                <span>/</span>
                <span className="hover:text-primary transition-colors cursor-pointer">Tasks</span>
                {parentTitle && (
                    <>
                        <span>/</span>
                        <span
                            className="text-muted-foreground/70 truncate max-w-[150px] hover:text-primary cursor-pointer transition-colors"
                            onClick={onOpenParent}
                        >
                            {parentTitle}
                        </span>
                    </>
                )}
                <span>/</span>
                <span className="text-foreground truncate max-w-[150px] sm:max-w-[300px]">
                    {title}
                </span>
            </div>

            <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    {isPending ? "Saving..." : lastSaved ? "Saved" : "Synced"}
                </div>
                <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" aria-label="Delete task">
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-muted transition-colors" aria-label="Close task dialog">
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
});

function LazySection({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
    const [visible, setVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
        }, { rootMargin: "200px" });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    return (
        <div ref={ref} className="space-y-4">
            <div className="flex items-center gap-2.5">
                <Icon className="h-3.5 w-3.5 text-primary" />
                <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
            </div>
            {visible ? children : <div className="h-12 animate-pulse rounded-lg bg-muted/50" />}
        </div>
    );
}

const SubtasksContent = React.memo(function SubtasksContent({ taskId, workspaceId, projectId, onOpenChild }: { taskId: string; workspaceId: string; projectId?: string; onOpenChild: (child: any) => void }) {
    return <TaskSubtasks taskId={taskId} workspaceId={workspaceId} projectId={projectId} onOpenChild={onOpenChild} />;
});
const ChecklistContent = React.memo(function ChecklistContent({ taskId, workspaceId }: { taskId: string; workspaceId: string }) {
    return <TaskChecklist taskId={taskId} workspaceId={workspaceId} />;
});
const DependenciesContent = React.memo(function DependenciesContent({ taskId, workspaceId, projectId }: { taskId: string; workspaceId: string; projectId?: string }) {
    return <TaskDependencies taskId={taskId} workspaceId={workspaceId} projectId={projectId} />;
});
const AttachmentsContent = React.memo(function AttachmentsContent({ taskId, workspaceId, attachments }: { taskId: string; workspaceId: string; attachments?: any[] }) {
    return <TaskAttachments taskId={taskId} workspaceId={workspaceId} attachments={attachments || []} />;
});
const CommentsContent = React.memo(function CommentsContent({ taskId, workspaceId }: { taskId: string; workspaceId: string }) {
    return <TaskComments taskId={taskId} workspaceId={workspaceId} />;
});
const ActivityContent = React.memo(function ActivityContent({ taskId, workspaceId }: { taskId: string; workspaceId: string }) {
    return <TaskActivity taskId={taskId} workspaceId={workspaceId} />;
});

const LazySections = React.memo(function LazySections({ task, taskId, workspaceId, projectId, attachments, onOpenChild }: { task: any; taskId: string; workspaceId: string; projectId?: string; attachments?: any[]; onOpenChild: (child: any) => void }) {
    return (
        <>
            <LazySection icon={Sparkles} title="Subtasks">
                <SubtasksContent taskId={taskId} workspaceId={workspaceId} projectId={projectId} onOpenChild={onOpenChild} />
            </LazySection>

            <LazySection icon={CheckSquare} title="Checklist">
                <ChecklistContent taskId={taskId} workspaceId={workspaceId} />
            </LazySection>

            <LazySection icon={Link2} title="Dependencies">
                <DependenciesContent taskId={taskId} workspaceId={workspaceId} projectId={projectId} />
            </LazySection>

            <LazySection icon={Palette} title="Attachments">
                <AttachmentsContent taskId={taskId} workspaceId={workspaceId} attachments={attachments || []} />
            </LazySection>

            <CustomFieldsSection task={task} workspaceId={workspaceId} />

            <hr className="border-border/10 my-8" />

            <LazySection icon={MessageSquare} title="Comments">
                <CommentsContent taskId={taskId} workspaceId={workspaceId} />
            </LazySection>

            <LazySection icon={Clock} title="Activity">
                <ActivityContent taskId={taskId} workspaceId={workspaceId} />
            </LazySection>
        </>
    );
});

interface TaskDialogSidebarProps {
    task: any;
    statuses: any[];
    status: string;
    priority: string;
    taskType: string;
    startDate?: Date;
    dueDate?: Date;
    estimatedHours: number;
    progress: number;
    color: string;
    assigneeIds: string[];
    totalTracked: number;
    remainingHours: number;
    workspaceId: string;
    showDeleteConfirm: boolean;
    isDeleting: boolean;
    onAssigneesUpdate: (ids: string[]) => void;
    onTypeChange: (val: string) => void;
    onStatusChange: (val: string) => void;
    onPriorityChange: (val: string) => void;
    onStartDateChange: (date?: Date) => void;
    onDueDateChange: (date?: Date) => void;
    onEstimatedChange: (val: number) => void;
    onEstimatedBlur: (val: number) => void;
    onProgressChange: (val: number) => void;
    onColorChange: (color: string) => void;
    onCancelDelete: () => void;
    onConfirmDelete: () => void;
}

const TaskDialogSidebar = React.memo(function TaskDialogSidebar({
    task,
    statuses,
    status,
    priority,
    taskType,
    startDate,
    dueDate,
    estimatedHours,
    progress,
    color,
    assigneeIds,
    totalTracked,
    remainingHours,
    workspaceId,
    showDeleteConfirm,
    isDeleting,
    onAssigneesUpdate,
    onTypeChange,
    onStatusChange,
    onPriorityChange,
    onStartDateChange,
    onDueDateChange,
    onEstimatedChange,
    onEstimatedBlur,
    onProgressChange,
    onColorChange,
    onCancelDelete,
    onConfirmDelete,
}: TaskDialogSidebarProps) {
    return (
        <div className="w-full lg:w-[320px] xl:w-[360px] shrink-0 p-8 sm:p-10 bg-muted/30">
            <div className="sticky top-8 space-y-10">
                <div className="space-y-6">
                    <TaskAssignees
                        assigneeIds={assigneeIds}
                        workspaceId={workspaceId}
                        onUpdate={onAssigneesUpdate}
                    />

                    <div className="space-y-3">
                        <Label className="text-xs font-medium text-muted-foreground ml-1">Type</Label>
                        <Select value={taskType} onValueChange={onTypeChange}>
                            <SelectTrigger className="w-full h-11 bg-background border rounded-lg text-xs shadow-sm hover:border-primary/30 transition-colors">
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent className="bg-background/95 border rounded-lg p-2">
                                {TASK_TYPES.map((t) => (
                                    <SelectItem key={t.value} value={t.value} className="rounded-md text-xs p-3 cursor-pointer">{t.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-xs font-medium text-muted-foreground ml-1">Status</Label>
                        <Select value={status} onValueChange={onStatusChange}>
                            <SelectTrigger className="w-full h-11 bg-background border rounded-lg text-xs shadow-sm hover:border-primary/30 transition-colors">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="bg-background/95 border rounded-lg p-2">
                                {statuses.map((s: any) => (
                                    <SelectItem key={s.id} value={s.id} className="rounded-md text-xs p-3 cursor-pointer">{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-xs font-medium text-muted-foreground ml-1">Priority</Label>
                        <Select value={priority} onValueChange={onPriorityChange}>
                            <SelectTrigger className="w-full h-11 bg-background border rounded-lg text-xs shadow-sm hover:border-primary/30 transition-colors">
                                <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent className="bg-background/95 border rounded-lg p-2">
                                <SelectItem value="low" className="rounded-md text-xs p-3 cursor-pointer text-emerald-500">Low</SelectItem>
                                <SelectItem value="medium" className="rounded-md text-xs p-3 cursor-pointer text-amber-500">Medium</SelectItem>
                                <SelectItem value="high" className="rounded-md text-xs p-3 cursor-pointer text-red-500">High</SelectItem>
                                <SelectItem value="urgent" className="rounded-md text-xs p-3 cursor-pointer text-red-600">Urgent</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-xs font-medium text-muted-foreground ml-1">Start Date</Label>
                        <DateField
                            value={startDate}
                            onChange={onStartDateChange}
                            placeholder="Set start date"
                        />
                    </div>

                    <div className="space-y-3">
                        <Label className="text-xs font-medium text-muted-foreground ml-1">Due Date</Label>
                        <DateField
                            value={dueDate}
                            onChange={onDueDateChange}
                            placeholder="Set date"
                        />
                    </div>

                    <div className="space-y-3">
                        <Label className="text-xs font-medium text-muted-foreground ml-1">Time</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <span className="text-[10px] text-muted-foreground">Estimated (h)</span>
                                <Input
                                    type="number"
                                    value={estimatedHours}
                                    onChange={(e) => onEstimatedChange(parseInt(e.target.value) || 0)}
                                    onBlur={(e) => onEstimatedBlur(parseInt(e.currentTarget.value) || 0)}
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

                    <ProgressSection
                        progress={progress}
                        status={status}
                        statuses={statuses}
                        onProgressChange={onProgressChange}
                    />

                    <div className="space-y-3">
                        <Label className="text-xs font-medium text-muted-foreground ml-1">Color</Label>
                        <div className="flex flex-wrap gap-2">
                            {TASK_COLORS.map((c) => (
                                <button
                                    key={c}
                                    onClick={() => onColorChange(c)}
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
                            <span>{task.createdAt ? format(new Date(task.createdAt), "MMM d, yyyy 'at' h:mm a") : "—"}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>Updated</span>
                            <span>{task.updatedAt ? format(new Date(task.updatedAt), "MMM d, yyyy 'at' h:mm a") : "—"}</span>
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
                </div>

                {showDeleteConfirm && (
                    <div className="p-5 bg-destructive/10 border border-destructive/20 rounded-lg space-y-4">
                        <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs font-semibold">Delete task?</span>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" variant="ghost" className="flex-1 h-9 rounded-md hover:bg-destructive/10 hover:text-destructive" onClick={onCancelDelete} aria-label="Cancel delete">
                                Cancel
                            </Button>
                            <Button size="sm" className="flex-1 h-9 rounded-md bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={onConfirmDelete} disabled={isDeleting} aria-label="Confirm delete task">
                                {isDeleting ? "..." : "Delete"}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

function ProgressSection({ progress, status, statuses, onProgressChange }: { progress: number; status: string; statuses: any[]; onProgressChange: (val: number) => void }) {
    const statusIdx = statuses.findIndex((s: any) => s.id === status);
    const statusProgress = statusIdx >= 0 ? Math.round((statusIdx / Math.max(1, statuses.length - 1)) * 100) : 0;
    const [draft, setDraft] = useState<number | null>(null);
    const value = draft ?? progress;

    const commitDraft = useCallback(() => {
        setDraft((d) => {
            if (d !== null) onProgressChange(d);
            return null;
        });
    }, [onProgressChange]);

    return (
        <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground ml-1">Progress</Label>
            <div className="flex items-center gap-2">
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={value}
                    onChange={(e) => setDraft(parseInt(e.target.value))}
                    onPointerUp={commitDraft}
                    onKeyUp={commitDraft}
                    onBlur={commitDraft}
                    className="flex-1 h-1.5 accent-primary cursor-pointer"
                />
                <span className="text-xs font-medium w-8 text-right tabular-nums">{value}%</span>
            </div>
            {statuses.length > 2 && (
                <div className="flex justify-between px-0.5">
                    {statuses.filter((_: any, i: number) => i === 0 || i === Math.floor(statuses.length / 2) || i === statuses.length - 1).map((s: any) => (
                        <span key={s.id} className="text-[9px] text-muted-foreground">{s.name}</span>
                    ))}
                </div>
            )}
            <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground w-8 text-right">
                    {statusProgress > 0 && value !== statusProgress ? `${statusProgress}% from status` : ""}
                </span>
            </div>
        </div>
    );
}
