"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link2, Plus, X, ArrowRight, ArrowDown, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TaskDependency {
    taskId: string;
    predecessorId: string;
    type: string;
    predecessor?: {
        id: string;
        title: string;
        status: string;
    };
}

interface TaskSearchResult {
    id: string;
    title: string;
    status: string;
}

interface TaskDependenciesProps {
    taskId: string;
    workspaceId: string;
}

export function TaskDependencies({ taskId, workspaceId }: TaskDependenciesProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const queryClient = useQueryClient();

    const invalidateRelated = () => {
        queryClient.invalidateQueries({ queryKey: ["dependencies", taskId, workspaceId] });
    };

    const { data: dependencies, isLoading, error: depError } = useQuery<TaskDependency[]>({
        queryKey: ["dependencies", taskId, workspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/tasks/dependencies?workspaceId=${workspaceId}&taskId=${taskId}`);
            if (!res.ok) throw new Error("Failed to fetch dependencies");
            return res.json();
        },
        enabled: !!workspaceId && !!taskId,
    });

    const { data: searchResults, isLoading: isSearching } = useQuery<TaskSearchResult[]>({
        queryKey: ["taskSearch", workspaceId, searchQuery],
        queryFn: async () => {
            const res = await fetch(`/api/tasks?workspaceId=${workspaceId}&search=${encodeURIComponent(searchQuery)}&exclude=${taskId}`);
            if (!res.ok) throw new Error("Failed to search tasks");
            return res.json();
        },
        enabled: !!workspaceId && showSearch && searchQuery.length > 0,
    });

    const addDependencyMutation = useMutation({
        mutationFn: async (predecessorId: string) => {
            const res = await fetch(`/api/tasks/dependencies`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ taskId, predecessorId, type: "FS" }),
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to add dependency");
            }
            return res.json();
        },
        onSuccess: () => {
            invalidateRelated();
            setShowSearch(false);
            setSearchQuery("");
            toast.success("Dependency added");
        },
        onError: (err: Error) => {
            toast.error(err.message);
        },
    });

    const removeDependencyMutation = useMutation({
        mutationFn: async (predecessorId: string) => {
            const res = await fetch(
                `/api/tasks/dependencies?workspaceId=${workspaceId}&taskId=${taskId}&predecessorId=${predecessorId}`,
                { method: "DELETE" }
            );
            if (!res.ok) throw new Error("Failed to remove dependency");
            return res.json();
        },
        onSuccess: () => {
            invalidateRelated();
            toast.success("Dependency removed");
        },
    });

    const blockedBy = dependencies?.filter((d) => d.taskId === taskId) || [];
    const blocking = dependencies?.filter((d) => d.predecessorId === taskId) || [];

    if (depError) {
        return (
            <div className="flex items-center justify-center p-4">
                <p className="text-xs text-muted-foreground">Failed to load dependencies. Please try again.</p>
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
                <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-indigo-500" />
                    <h3 className="text-sm font-semibold">Dependencies</h3>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setShowSearch(!showSearch)}
                >
                    <Plus className="h-3 w-3" />
                    Add
                </Button>
            </div>

            {showSearch && (
                <div className="space-y-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search tasks to link..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 text-xs pl-8"
                            autoFocus
                        />
                    </div>
                    <div className="border rounded-lg max-h-40 overflow-y-auto">
                        {isSearching ? (
                            <div className="flex items-center justify-center p-3">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        ) : searchResults?.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground text-center py-3">
                                No tasks found
                            </p>
                        ) : (
                            searchResults?.map((task) => (
                                <button
                                    key={task.id}
                                    onClick={() => addDependencyMutation.mutate(task.id)}
                                    disabled={addDependencyMutation.isPending}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-left transition-colors border-b last:border-b-0"
                                >
                                    <Link2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    <span className="text-xs font-medium truncate flex-1">{task.title}</span>
                                    <span className="text-[10px] text-muted-foreground capitalize">{task.status}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {blockedBy.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                            <ArrowDown className="h-3 w-3 text-amber-500" />
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Blocked By</span>
                        </div>
                        {blockedBy.map((dep) => (
                            <div
                                key={dep.predecessorId}
                                className="group flex items-center gap-2 pl-5 py-1.5 rounded-lg hover:bg-accent/50 transition-colors"
                            >
                                <Link2 className="h-3 w-3 text-amber-500 flex-shrink-0" />
                                <span className="text-xs font-medium text-indigo-600 hover:underline cursor-pointer truncate flex-1">
                                    {dep.predecessor?.title || dep.predecessorId}
                                </span>
                                <span className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize",
                                    dep.predecessor?.status === "done"
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                )}>
                                    {dep.predecessor?.status || "unknown"}
                                </span>
                                <button
                                    onClick={() => removeDependencyMutation.mutate(dep.predecessorId)}
                                    className="h-5 w-5 text-muted-foreground hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 inline-flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {blocking.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                            <ArrowRight className="h-3 w-3 text-blue-500" />
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Blocking</span>
                        </div>
                        {blocking.map((dep) => (
                            <div
                                key={dep.taskId}
                                className="group flex items-center gap-2 pl-5 py-1.5 rounded-lg hover:bg-accent/50 transition-colors"
                            >
                                <ArrowRight className="h-3 w-3 text-blue-500 flex-shrink-0" />
                                <span className="text-xs font-medium text-indigo-600 hover:underline cursor-pointer truncate flex-1">
                                    {dep.predecessor?.title || dep.taskId}
                                </span>
                                <button
                                    onClick={() => removeDependencyMutation.mutate(dep.taskId)}
                                    className="h-5 w-5 text-muted-foreground hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 inline-flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {blockedBy.length === 0 && blocking.length === 0 && (
                    <p className="text-xs text-muted-foreground italic pl-1">
                        No dependencies linked yet.
                    </p>
                )}
            </div>
        </div>
    );
}
