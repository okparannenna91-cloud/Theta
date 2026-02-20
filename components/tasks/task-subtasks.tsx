"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Subtask {
    id: string;
    title: string;
    completed: boolean;
    taskId: string;
}

interface TaskSubtasksProps {
    taskId: string;
}

export function TaskSubtasks({ taskId }: TaskSubtasksProps) {
    const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
    const queryClient = useQueryClient();

    const { data: subtasks, isLoading } = useQuery<Subtask[]>({
        queryKey: ["subtasks", taskId],
        queryFn: async () => {
            const res = await fetch(`/api/tasks/${taskId}/subtasks`);
            if (!res.ok) throw new Error("Failed to fetch subtasks");
            return res.json();
        },
    });

    const createSubtaskMutation = useMutation({
        mutationFn: async (title: string) => {
            const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title }),
            });
            if (!res.ok) throw new Error("Failed to create subtask");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["subtasks", taskId] });
            setNewSubtaskTitle("");
            toast.success("Subtask added");
        },
    });

    const toggleSubtaskMutation = useMutation({
        mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
            const res = await fetch(`/api/subtasks/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ completed }),
            });
            if (!res.ok) throw new Error("Failed to update subtask");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["subtasks", taskId] });
        },
    });

    const deleteSubtaskMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/subtasks/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete subtask");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["subtasks", taskId] });
            toast.success("Subtask removed");
        },
    });

    const handleCreateSubtask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubtaskTitle.trim()) return;
        createSubtaskMutation.mutate(newSubtaskTitle);
    };

    const completedCount = subtasks?.filter((s) => s.completed).length || 0;
    const totalCount = subtasks?.length || 0;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

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
            </div>

            {totalCount > 0 && (
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                        className="h-full bg-indigo-600 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            <div className="space-y-2">
                {subtasks?.map((subtask) => (
                    <div
                        key={subtask.id}
                        className="group flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                        <button
                            onClick={() =>
                                toggleSubtaskMutation.mutate({
                                    id: subtask.id,
                                    completed: !subtask.completed,
                                })
                            }
                            className="flex-shrink-0"
                        >
                            {subtask.completed ? (
                                <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                            ) : (
                                <Circle className="h-5 w-5 text-muted-foreground" />
                            )}
                        </button>
                        <span
                            className={cn(
                                "flex-1 text-sm transition-all",
                                subtask.completed && "text-muted-foreground line-through"
                            )}
                        >
                            {subtask.title}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => deleteSubtaskMutation.mutate(subtask.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>

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
