"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
    arrayMove,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Trash2, CheckCircle2, Circle, Loader2, GripVertical, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAbly } from "@/hooks/use-ably";
import { getWorkspaceChannel, getTaskChannel } from "@/lib/ably";
import { invalidateTaskCaches } from "@/lib/invalidate-task-caches";
import { useWorkspaceStatuses, FALLBACK_STATUSES } from "@/hooks/use-statuses";

interface SubtaskChild {
    id: string;
    title: string;
    status: string;
    priority: string;
    progress: number;
    taskType?: string;
    assigneeIds?: string[];
    dueDate?: string | null;
    startDate?: string | null;
    order: number;
    color?: string;
    parentId: string;
    completedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
    projectId?: string;
}

interface WorkspaceMember {
    id: string;
    name: string | null;
    email: string | null;
    imageUrl: string | null;
}

interface TaskSubtasksProps {
    taskId: string;
    workspaceId: string;
    projectId?: string;
    onOpenChild?: (child: SubtaskChild) => void;
}

type Filter = "all" | "active" | "done";

export function TaskSubtasks({ taskId, workspaceId, projectId, onOpenChild }: TaskSubtasksProps) {
    const queryClient = useQueryClient();
    const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
    const [filter, setFilter] = useState<Filter>("all");

    const invalidateRelated = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["task-children", taskId] });
        queryClient.invalidateQueries({ queryKey: ["task-detail", taskId] });
        invalidateTaskCaches({ queryClient, workspaceId });
    }, [queryClient, taskId, workspaceId]);

    const { data: children, isLoading, error: subtasksError } = useQuery<SubtaskChild[]>({
        queryKey: ["task-children", taskId],
        queryFn: async () => {
            const res = await fetch(`/api/tasks/${taskId}`);
            if (!res.ok) throw new Error("Failed to fetch subtasks");
            const data = await res.json();
            return data.children || [];
        },
    });

    const { data: members } = useQuery<WorkspaceMember[]>({
        queryKey: ["members", workspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/workspaces/${workspaceId}/members`);
            if (!res.ok) throw new Error("Failed to fetch members");
            return res.json();
        },
        enabled: !!workspaceId,
    });

    const { data: dbStatuses } = useWorkspaceStatuses(workspaceId);
    const statuses = useMemo(() => {
        const src = dbStatuses && dbStatuses.length > 0 ? dbStatuses : FALLBACK_STATUSES;
        return src.map((s) => ({
            id: s.id,
            name: s.name,
            color: s.color || "#64748b",
        }));
    }, [dbStatuses]);

    const upsertChild = useCallback((prev: SubtaskChild[], incoming: any) => {
        if (!incoming?.id) return prev;
        const exists = prev.some((c) => c.id === incoming.id);
        return exists
            ? prev.map((c) => (c.id === incoming.id ? { ...c, ...incoming } : c))
            : [...prev, incoming];
    }, []);

    const handleWorkspaceUpdate = useCallback(
        (msg: any) => {
            if (!msg?.id) return;
            queryClient.setQueryData<SubtaskChild[]>(["task-children", taskId], (prev = []) =>
                msg.parentId === taskId
                    ? upsertChild(prev, msg)
                    : msg.id === taskId
                        ? prev
                        : prev.filter((c) => c.id !== msg.id)
            );
        },
        [queryClient, taskId, upsertChild]
    );

    const handleWorkspaceDelete = useCallback(
        (msg: any) => {
            if (!msg?.id) return;
            queryClient.setQueryData<SubtaskChild[]>(["task-children", taskId], (prev = []) =>
                prev.filter((c) => c.id !== msg.id)
            );
        },
        [queryClient, taskId]
    );

    const handleParentUpdate = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["task-children", taskId] });
    }, [queryClient, taskId]);

    const handleTaskChannelChildCreated = useCallback(
        (msg: any) => {
            if (!msg?.id || msg.parentId !== taskId) return;
            queryClient.setQueryData<SubtaskChild[]>(["task-children", taskId], (prev = []) =>
                upsertChild(prev, msg)
            );
        },
        [queryClient, taskId, upsertChild]
    );

    const handleTaskChannelChildDeleted = useCallback(
        (msg: any) => {
            if (!msg?.id) return;
            queryClient.setQueryData<SubtaskChild[]>(["task-children", taskId], (prev = []) =>
                prev.filter((c) => c.id !== msg.id)
            );
        },
        [queryClient, taskId]
    );

    const handleSubtasksReordered = useCallback(
        (msg: any) => {
            if (!msg || msg.parentTaskId !== taskId || !Array.isArray(msg.items)) return;
            queryClient.setQueryData<SubtaskChild[]>(["task-children", taskId], (prev = []) => {
                const orderMap = new Map<string, number>(
                    msg.items.map((i: any) => [String(i.id), Number(i.order)] as [string, number])
                );
                return [...prev].sort((a, b) => {
                    const oa = orderMap.has(a.id) ? orderMap.get(a.id) ?? a.order : a.order;
                    const ob = orderMap.has(b.id) ? orderMap.get(b.id) ?? b.order : b.order;
                    return oa - ob;
                });
            });
        },
        [queryClient, taskId]
    );

    const taskChannel = getTaskChannel(workspaceId, taskId);
    useAbly(getWorkspaceChannel(workspaceId), "task:created", handleWorkspaceUpdate);
    useAbly(getWorkspaceChannel(workspaceId), "task:updated", handleWorkspaceUpdate);
    useAbly(getWorkspaceChannel(workspaceId), "task:deleted", handleWorkspaceDelete);
    useAbly(taskChannel, "task:updated", handleParentUpdate);
    useAbly(taskChannel, "subtask:created", handleTaskChannelChildCreated);
    useAbly(taskChannel, "subtask:deleted", handleTaskChannelChildDeleted);
    useAbly(taskChannel, "subtasks:reordered", handleSubtasksReordered);

    const createSubtaskMutation = useMutation({
        mutationFn: async (title: string) => {
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    parentId: taskId,
                    workspaceId,
                    ...(projectId ? { projectId } : {}),
                    status: "todo",
                }),
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to create subtask");
            }
            return res.json();
        },
        onSuccess: (task) => {
            queryClient.setQueryData<SubtaskChild[]>(["task-children", taskId], (prev = []) =>
                upsertChild(prev, task)
            );
            setNewSubtaskTitle("");
            toast.success("Subtask added");
        },
        onError: (err: Error) => {
            toast.error(err.message);
        },
    });

    const updateSubtaskMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const res = await fetch(`/api/tasks/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to update subtask");
            }
            return res.json();
        },
        onMutate: async ({ id, data }: { id: string; data: any }) => {
            queryClient.setQueryData<SubtaskChild[]>(["task-children", taskId], (prev = []) =>
                (prev || []).map((c) => (c.id === id ? { ...c, ...data } : c))
            );
        },
        onSuccess: () => {
            invalidateRelated();
        },
        onError: (error: Error) => {
            invalidateRelated();
            toast.error(error.message);
        },
    });

    const toggleSubtaskMutation = useMutation({
        mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
            const res = await fetch(`/api/tasks/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: completed ? "completed" : "todo",
                    progress: completed ? 100 : 0,
                }),
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to update subtask");
            }
            return res.json();
        },
        onMutate: async ({ id, completed }) => {
            queryClient.setQueryData<SubtaskChild[]>(["task-children", taskId], (prev = []) =>
                prev.map((c) =>
                    c.id === id
                        ? { ...c, status: completed ? "completed" : "todo", progress: completed ? 100 : 0 }
                        : c
                )
            );
        },
        onSuccess: () => {
            invalidateRelated();
        },
        onError: () => {
            invalidateRelated();
        },
    });

    const deleteSubtaskMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/tasks/${id}?workspaceId=${workspaceId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete subtask");
            return res.json();
        },
        onSuccess: () => {
            queryClient.setQueryData<SubtaskChild[]>(["task-children", taskId], (prev = []) =>
                (prev || []).filter((c) => c.id !== deleteSubtaskMutation.variables)
            );
            invalidateRelated();
            toast.success("Subtask removed");
        },
        onError: (err: Error) => {
            toast.error(err.message);
        },
    });

    const reorderMutation = useMutation({
        mutationFn: async (items: { id: string; order: number }[]) => {
            const res = await fetch(`/api/tasks/${taskId}/subtasks/reorder`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items }),
            });
            if (!res.ok) throw new Error("Failed to reorder subtasks");
            return res.json();
        },
        onError: () => {
            invalidateRelated();
        },
    });

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
    );

    const handleDragEnd = useCallback(
        (event: any) => {
            const { active, over } = event;
            if (!over || active.id === over.id) return;
            queryClient.setQueryData<SubtaskChild[]>(["task-children", taskId], (prev = []) => {
                const oldIndex = prev.findIndex((c) => c.id === active.id);
                const newIndex = prev.findIndex((c) => c.id === over.id);
                if (oldIndex < 0 || newIndex < 0) return prev;
                const reordered = arrayMove(prev, oldIndex, newIndex);
                reorderMutation.mutate(
                    reordered.map((c, i) => ({ id: c.id, order: i }))
                );
                return reordered;
            });
        },
        [queryClient, taskId, reorderMutation]
    );

    const filtered = useMemo(() => {
        const list = Array.isArray(children) ? children : [];
        if (filter === "active") return list.filter((c) => c.status !== "completed");
        if (filter === "done") return list.filter((c) => c.status === "completed");
        return list;
    }, [children, filter]);

    const childList = Array.isArray(children) ? children : [];
    const completedCount = childList.filter((c) => c.status === "completed").length;
    const totalCount = childList.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    const handleCreateSubtask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubtaskTitle.trim()) return;
        createSubtaskMutation.mutate(newSubtaskTitle);
    };

    if (subtasksError) {
        return (
            <div className="flex items-center justify-center p-4">
                <p className="text-xs text-muted-foreground">Failed to load subtasks. Please try again.</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                    Subtasks
                    <span className="text-xs font-normal text-muted-foreground">
                        ({completedCount}/{totalCount})
                    </span>
                </h3>
                {totalCount > 0 && (
                    <div className="flex items-center gap-1">
                        {(["all", "active", "done"] as Filter[]).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={cn(
                                    "text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors capitalize",
                                    filter === f
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {totalCount > 0 && (
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                        className="h-full bg-indigo-600 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            {filtered.length > 0 && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={filtered.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-1">
                            {filtered.map((subtask) => (
                                <SortableSubtaskRow
                                    key={subtask.id}
                                    subtask={subtask}
                                    workspaceId={workspaceId}
                                    members={members || []}
                                    statuses={statuses}
                                    onToggle={() =>
                                        toggleSubtaskMutation.mutate({
                                            id: subtask.id,
                                            completed: subtask.status !== "completed",
                                        })
                                    }
                                    onRename={(title) =>
                                        updateSubtaskMutation.mutate({ id: subtask.id, data: { title } })
                                    }
                                    onStatusChange={(status) =>
                                        updateSubtaskMutation.mutate({ id: subtask.id, data: { status } })
                                    }
                                    onAssign={(assigneeIds) =>
                                        updateSubtaskMutation.mutate({ id: subtask.id, data: { assigneeIds } })
                                    }
                                    onDelete={() => deleteSubtaskMutation.mutate(subtask.id)}
                                    onOpen={onOpenChild ? () => onOpenChild(subtask) : undefined}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            {totalCount > 0 && filtered.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                    No subtasks in this view.
                </p>
            )}

            {totalCount === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                    Break this task into smaller pieces. Subtasks inherit progress, estimates, and dates.
                </p>
            )}

            <form onSubmit={handleCreateSubtask} className="flex items-center gap-2">
                <Input
                    placeholder="Add a subtask..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    className="flex-1 h-9 bg-accent/30 border-none px-3"
                    disabled={createSubtaskMutation.isPending}
                />
                <Button
                    type="submit"
                    size="sm"
                    disabled={!newSubtaskTitle.trim() || createSubtaskMutation.isPending}
                >
                    {createSubtaskMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Plus className="h-4 w-4" />
                    )}
                </Button>
            </form>
        </div>
    );
}

interface SortableSubtaskRowProps {
    subtask: SubtaskChild;
    workspaceId: string;
    members: WorkspaceMember[];
    statuses: { id: string; name: string; color: string }[];
    onToggle: () => void;
    onRename: (title: string) => void;
    onStatusChange: (status: string) => void;
    onAssign: (assigneeIds: string[]) => void;
    onDelete: () => void;
    onOpen?: () => void;
}

function SortableSubtaskRow({
    subtask,
    members,
    statuses,
    onToggle,
    onRename,
    onStatusChange,
    onAssign,
    onDelete,
    onOpen,
}: SortableSubtaskRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: subtask.id });

    const [editing, setEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(subtask.title);
    const [statusOpen, setStatusOpen] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);

    useEffect(() => {
        if (editing) setEditTitle(subtask.title);
    }, [editing, subtask.title]);

    const completed = subtask.status === "completed";
    const overdue = !completed && subtask.dueDate && new Date(subtask.dueDate) < new Date();

    const statusInfo =
        statuses.find((s) => s.id === subtask.status || s.name.toLowerCase() === subtask.status.toLowerCase()) ||
        statuses.find((s) => s.id === "todo");

    const assignees = (subtask.assigneeIds || [])
        .map((id) => members.find((m) => m.id === id))
        .filter(Boolean) as WorkspaceMember[];
    const visibleAssignees = assignees.slice(0, 2);
    const extraAssignees = assignees.length - visibleAssignees.length;

    const commitRename = () => {
        setEditing(false);
        const trimmed = editTitle.trim();
        if (!trimmed || trimmed === subtask.title) return;
        onRename(trimmed);
    };

    const toggleAssignee = (memberId: string) => {
        const current = subtask.assigneeIds || [];
        const next = current.includes(memberId)
            ? current.filter((id) => id !== memberId)
            : [...current, memberId];
        onAssign(next);
        setAssignOpen(false);
    };

    const statusColor = statusInfo?.color || "#64748b";

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={cn(
                "group flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors",
                isDragging && "opacity-60 bg-accent shadow-lg z-10 relative"
            )}
        >
            <button
                type="button"
                className="flex-shrink-0 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground"
                {...attributes}
                {...listeners}
                aria-label="Drag to reorder"
            >
                <GripVertical className="h-4 w-4" />
            </button>

            <button
                onClick={onToggle}
                className="flex-shrink-0"
                aria-label={completed ? "Mark incomplete" : "Mark complete"}
            >
                {completed ? (
                    <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                )}
            </button>

            <div className="flex-1 min-w-0">
                {editing ? (
                    <Input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename();
                            if (e.key === "Escape") setEditing(false);
                        }}
                        className="h-8 text-sm px-2"
                    />
                ) : (
                    <button
                        onClick={onOpen}
                        onDoubleClick={() => setEditing(true)}
                        className={cn(
                            "w-full flex items-center gap-2 min-w-0 text-left text-sm transition-all",
                            completed && "text-muted-foreground line-through"
                        )}
                    >
                        <span className="truncate">{subtask.title}</span>
                        {subtask.priority === "high" && (
                            <span className="text-[10px] font-medium text-red-500 shrink-0">High</span>
                        )}
                        {subtask.priority === "urgent" && (
                            <span className="text-[10px] font-medium text-red-600 shrink-0">Urgent</span>
                        )}
                        {subtask.dueDate && (
                            <span
                                className={cn(
                                    "text-[10px] shrink-0",
                                    overdue ? "text-red-500 font-medium" : "text-muted-foreground"
                                )}
                            >
                                {new Date(subtask.dueDate).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                })}
                            </span>
                        )}
                        {onOpen && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />}
                    </button>
                )}

                <div className="flex items-center gap-2 mt-1">
                    <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                        <PopoverTrigger asChild>
                            <button
                                className={cn(
                                    "text-[10px] font-medium px-1.5 py-0.5 rounded-full border transition-colors",
                                    completed && "opacity-70"
                                )}
                                style={{
                                    color: statusColor,
                                    backgroundColor: `${statusColor}14`,
                                    borderColor: `${statusColor}33`,
                                }}
                                aria-label="Change subtask status"
                            >
                                {statusInfo?.name || subtask.status.replace(/_/g, " ")}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-44 p-1.5" align="start">
                            <div className="space-y-0.5">
                                {statuses.map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => {
                                            onStatusChange(s.id);
                                            setStatusOpen(false);
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left transition-colors hover:bg-accent",
                                            (subtask.status === s.id ||
                                                subtask.status.toLowerCase() === s.name.toLowerCase()) &&
                                                "bg-accent/70"
                                        )}
                                    >
                                        <span
                                            className="h-2 w-2 rounded-full shrink-0"
                                            style={{ backgroundColor: s.color || "#64748b" }}
                                        />
                                        <span className="truncate flex-1">{s.name}</span>
                                        {(subtask.status === s.id ||
                                            subtask.status.toLowerCase() === s.name.toLowerCase()) && (
                                            <Check className="h-3 w-3 text-primary shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Popover open={assignOpen} onOpenChange={setAssignOpen}>
                        <PopoverTrigger asChild>
                            <button className="flex items-center" aria-label="Assign subtask">
                                {visibleAssignees.map((member) => (
                                    <Avatar
                                        key={member.id}
                                        className="h-[18px] w-[18px] -ml-1 first:ml-0 ring-1 ring-background"
                                    >
                                        <AvatarImage src={member.imageUrl || ""} />
                                        <AvatarFallback className="text-[8px]">
                                            {member.name?.[0] || "U"}
                                        </AvatarFallback>
                                    </Avatar>
                                ))}
                                {extraAssignees > 0 && (
                                    <span className="h-[18px] min-w-[18px] px-1 -ml-1 inline-flex items-center justify-center rounded-full bg-muted text-[8px] font-medium ring-1 ring-background">
                                        +{extraAssignees}
                                    </span>
                                )}
                                <span className="h-[18px] w-[18px] -ml-1 inline-flex items-center justify-center rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground text-[10px] hover:border-primary hover:text-primary transition-colors">
                                    +
                                </span>
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2" align="start">
                            <p className="text-[10px] font-medium text-muted-foreground px-1 pb-1.5">Assign to</p>
                            <div className="max-h-52 overflow-y-auto space-y-0.5">
                                {members.length === 0 && (
                                    <p className="text-xs text-muted-foreground text-center py-3">
                                        No members yet
                                    </p>
                                )}
                                {members.map((member) => {
                                    const assigned = (subtask.assigneeIds || []).includes(member.id);
                                    return (
                                        <button
                                            key={member.id}
                                            onClick={() => toggleAssignee(member.id)}
                                            className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded-md text-left transition-colors"
                                        >
                                            <Avatar className="h-5 w-5">
                                                <AvatarImage src={member.imageUrl || ""} />
                                                <AvatarFallback className="text-[9px]">
                                                    {member.name?.[0] || "U"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="flex-1 text-xs font-medium truncate">
                                                {member.name || "Anonymous"}
                                            </span>
                                            {assigned && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={onDelete}
                aria-label="Delete subtask"
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );
}
