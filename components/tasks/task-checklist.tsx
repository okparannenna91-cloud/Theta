"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Plus, Trash2, ChevronUp, ChevronDown, Square, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChecklistItem {
    id: string;
    title: string;
    completed: boolean;
    order: number;
    taskId: string;
}

interface TaskChecklistProps {
    taskId: string;
    workspaceId: string;
}

export function TaskChecklist({ taskId, workspaceId }: TaskChecklistProps) {
    const [newItemTitle, setNewItemTitle] = useState("");
    const queryClient = useQueryClient();

    const invalidateRelated = () => {
        queryClient.invalidateQueries({ queryKey: ["checklist", taskId] });
        queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
        queryClient.invalidateQueries({ queryKey: ["board", workspaceId] });
    };

    const { data: items, isLoading, error: itemsError } = useQuery<ChecklistItem[]>({
        queryKey: ["checklist", taskId],
        queryFn: async () => {
            const res = await fetch(`/api/tasks/${taskId}/checklist`);
            if (!res.ok) throw new Error("Failed to fetch checklist");
            return res.json();
        },
    });

    const createItemMutation = useMutation({
        mutationFn: async (title: string) => {
            const res = await fetch(`/api/tasks/${taskId}/checklist`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title }),
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to create checklist item");
            }
            return res.json();
        },
        onSuccess: () => {
            invalidateRelated();
            setNewItemTitle("");
            toast.success("Item added");
        },
        onError: (err: Error) => {
            toast.error(err.message);
        },
    });

    const updateItemMutation = useMutation({
        mutationFn: async (payload: { items: { id: string; completed: boolean }[] }) => {
            const res = await fetch(`/api/tasks/${taskId}/checklist`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error("Failed to update checklist");
            return res.json();
        },
        onSuccess: () => {
            invalidateRelated();
        },
    });

    const deleteItemMutation = useMutation({
        mutationFn: async (itemId: string) => {
            const res = await fetch(`/api/tasks/${taskId}/checklist?itemId=${itemId}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to delete checklist item");
            return res.json();
        },
        onSuccess: () => {
            invalidateRelated();
            toast.success("Item removed");
        },
    });

    const handleToggle = (item: ChecklistItem) => {
        updateItemMutation.mutate({
            items: [{ id: item.id, completed: !item.completed }],
        });
    };

    const handleMoveUp = (item: ChecklistItem) => {
        if (!items) return;
        const sorted = [...items].sort((a, b) => a.order - b.order);
        const idx = sorted.findIndex((i) => i.id === item.id);
        if (idx <= 0) return;
        const prevItem = sorted[idx - 1];
        updateItemMutation.mutate({
            items: [
                { id: prevItem.id, completed: prevItem.completed },
                { id: item.id, completed: item.completed },
            ],
        });
    };

    const handleMoveDown = (item: ChecklistItem) => {
        if (!items) return;
        const sorted = [...items].sort((a, b) => a.order - b.order);
        const idx = sorted.findIndex((i) => i.id === item.id);
        if (idx >= sorted.length - 1) return;
        const nextItem = sorted[idx + 1];
        updateItemMutation.mutate({
            items: [
                { id: item.id, completed: item.completed },
                { id: nextItem.id, completed: nextItem.completed },
            ],
        });
    };

    const handleCreateItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemTitle.trim()) return;
        createItemMutation.mutate(newItemTitle);
    };

    const completedCount = items?.filter((i) => i.completed).length || 0;
    const totalCount = items?.length || 0;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    if (itemsError) {
        return (
            <div className="flex items-center justify-center p-4">
                <p className="text-xs text-muted-foreground">Failed to load checklist. Please try again.</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-indigo-500" />
                    <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-indigo-500" />
                    Checklist
                    <span className="text-xs font-normal text-muted-foreground">
                        ({completedCount}/{totalCount})
                    </span>
                </h3>
            </div>

            {totalCount > 0 && (
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                        className="h-full bg-indigo-600 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            <div className="space-y-1">
                {items?.length === 0 && (
                    <p className="text-xs text-muted-foreground italic py-2 text-center">
                        No checklist items yet. Add one below.
                    </p>
                )}
                {items?.sort((a, b) => a.order - b.order).map((item, index) => (
                    <div
                        key={item.id}
                        className="group flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                        <button
                            onClick={() => handleToggle(item)}
                            className="flex-shrink-0"
                            aria-label={item.completed ? `Mark "${item.title}" as incomplete` : `Mark "${item.title}" as complete`}
                        >
                            {item.completed ? (
                                <CheckSquare className="h-5 w-5 text-indigo-600" />
                            ) : (
                                <Square className="h-5 w-5 text-muted-foreground" />
                            )}
                        </button>
                        <span
                            className={cn(
                                "flex-1 text-sm transition-all",
                                item.completed && "text-muted-foreground line-through"
                            )}
                        >
                            {item.title}
                        </span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => handleMoveUp(item)}
                                disabled={index === 0}
                                className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent inline-flex items-center justify-center transition-colors disabled:opacity-30 disabled:pointer-events-none"
                                aria-label="Move item up"
                            >
                                <ChevronUp className="h-3 w-3" />
                            </button>
                            <button
                                onClick={() => handleMoveDown(item)}
                                disabled={index === (items?.length ?? 0) - 1}
                                className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent inline-flex items-center justify-center transition-colors disabled:opacity-30 disabled:pointer-events-none"
                                aria-label="Move item down"
                            >
                                <ChevronDown className="h-3 w-3" />
                            </button>
                            <button
                                onClick={() => deleteItemMutation.mutate(item.id)}
                                className="h-6 w-6 text-muted-foreground hover:text-red-600 rounded-md hover:bg-accent inline-flex items-center justify-center transition-colors"
                                aria-label={`Delete "${item.title}"`}
                            >
                                <Trash2 className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <form onSubmit={handleCreateItem} className="flex items-center gap-2">
                <Input
                    placeholder="Add a checklist item..."
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    className="flex-1 h-9 bg-accent/30 border-none px-3"
                    disabled={createItemMutation.isPending}
                />
                <Button
                    type="submit"
                    size="sm"
                    disabled={!newItemTitle.trim() || createItemMutation.isPending}
                    aria-label="Add checklist item"
                >
                    {createItemMutation.isPending ? (
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Plus className="h-4 w-4" />
                    )}
                </Button>
            </form>
        </div>
    );
}
