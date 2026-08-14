"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link2, Plus, X, ArrowRight, ArrowDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DEPENDENCY_TYPE_META: Record<string, { label: string; dot: string; className: string }> = {
    FS: { label: "Finish → Start", dot: "bg-violet-500", className: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" },
    SS: { label: "Start → Start", dot: "bg-blue-500", className: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
    FF: { label: "Finish → Finish", dot: "bg-emerald-500", className: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" },
    SF: { label: "Start → Finish", dot: "bg-amber-500", className: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" },
};

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
    parentId?: string | null;
    parent?: {
        id: string;
        title: string;
    } | null;
}

interface TaskDependenciesProps {
    taskId: string;
    workspaceId: string;
    projectId?: string;
}

export function TaskDependencies({ taskId, workspaceId, projectId }: TaskDependenciesProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [depType, setDepType] = useState<keyof typeof DEPENDENCY_TYPE_META>("FS");
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
            const res = await fetch(`/api/tasks?workspaceId=${workspaceId}&projectId=${projectId || ""}&search=${encodeURIComponent(searchQuery)}&exclude=${taskId}&includeSubtasks=1`);
            if (!res.ok) throw new Error("Failed to search tasks");
            const data = await res.json();
            return data.tasks || [];
        },
        enabled: !!workspaceId && showSearch && searchQuery.length > 0,
    });

    const addDependencyMutation = useMutation({
        mutationFn: async ({ predecessorId, type }: { predecessorId: string; type: string }) => {
            const res = await fetch(`/api/tasks/dependencies`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ taskId, predecessorId, type, workspaceId }),
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                let message: string = "Failed to add dependency";
                if (typeof errData?.error === "string") {
                    message = errData.error;
                } else if (Array.isArray(errData?.error)) {
                    message = errData.error.map((e: any) => e?.message || e?.path?.join(".") || JSON.stringify(e)).join(", ") || message;
                }
                throw new Error(message);
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
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-indigo-500" />
                    <Skeleton className="h-4 w-28" />
                </div>
                <div className="space-y-2 pl-5">
                    <Skeleton className="h-8 w-full rounded-lg" />
                    <Skeleton className="h-8 w-full rounded-lg" />
                </div>
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
                    aria-label={showSearch ? "Close search" : "Add dependency"}
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
                    <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-lg">
                        {(Object.keys(DEPENDENCY_TYPE_META) as Array<keyof typeof DEPENDENCY_TYPE_META>).map((key) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setDepType(key)}
                                title={DEPENDENCY_TYPE_META[key].label}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md text-[10px] font-semibold transition-colors",
                                    depType === key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", DEPENDENCY_TYPE_META[key].dot)} />
                                {key}
                            </button>
                        ))}
                    </div>
                    <div className="border rounded-lg max-h-40 overflow-y-auto">
                        {isSearching ? (
                            <div className="flex items-center justify-center p-3">
                                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : searchResults?.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground text-center py-3">
                                No tasks found
                            </p>
                        ) : (
                            searchResults?.map((task) => (
                                <button
                                    key={task.id}
                                    onClick={() => addDependencyMutation.mutate({ predecessorId: task.id, type: depType })}
                                    disabled={addDependencyMutation.isPending}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-left transition-colors border-b last:border-b-0"
                                >
                                    <Link2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    <span className="text-xs font-medium truncate flex-1">
                                        {task.title}
                                        {task.parentId && (
                                            <span className="block text-[10px] text-muted-foreground font-normal truncate">
                                                Subtask of {task.parent?.title || "parent task"}
                                            </span>
                                        )}
                                    </span>
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
                                {DEPENDENCY_TYPE_META[dep.type] && (
                                    <span
                                        title={DEPENDENCY_TYPE_META[dep.type].label}
                                        className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-semibold", DEPENDENCY_TYPE_META[dep.type].className)}
                                    >
                                        {dep.type}
                                    </span>
                                )}
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
                                    aria-label={`Remove dependency on ${dep.predecessor?.title || "task"}`}
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
                                {DEPENDENCY_TYPE_META[dep.type] && (
                                    <span
                                        title={DEPENDENCY_TYPE_META[dep.type].label}
                                        className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-semibold", DEPENDENCY_TYPE_META[dep.type].className)}
                                    >
                                        {dep.type}
                                    </span>
                                )}
                                <button
                                    onClick={() => removeDependencyMutation.mutate(dep.taskId)}
                                    className="h-5 w-5 text-muted-foreground hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 inline-flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                                    aria-label={`Remove dependency blocking ${dep.predecessor?.title || "task"}`}
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
