"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { History, PlusCircle, CheckCircle2, AlertCircle, Edit, Trash2, ChevronDown, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { describeChange, humanize, type ActivityChange } from "@/lib/activity-format";

interface Activity {
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
    user: {
        name: string | null;
        imageUrl: string | null;
    } | null;
    metadata?: {
        changes?: Record<string, ActivityChange>;
        [key: string]: unknown;
    };
}

function getActionIcon(action: string) {
    switch (action.toLowerCase()) {
        case "created": return <PlusCircle className="h-3.5 w-3.5 text-emerald-500" />;
        case "updated": return <Edit className="h-3.5 w-3.5 text-indigo-500" />;
        case "deleted": return <Trash2 className="h-3.5 w-3.5 text-red-500" />;
        case "completed": return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
        default: return <AlertCircle className="h-3.5 w-3.5 text-slate-400" />;
    }
}

function getActionLabel(activity: Activity): { main: string; lines: string[] } {
    const changes = activity.metadata?.changes;
    const action = activity.action.toLowerCase();

    if (action === "updated" && changes && Object.keys(changes).length > 0) {
        const fields = Object.keys(changes);
        const lines = fields.map((field) => describeChange(field, changes[field]));
        if (fields.length === 1) return { main: lines[0], lines: [] };
        return { main: `updated ${fields.length} things`, lines };
    }

    switch (action) {
        case "created": return { main: "created this task", lines: [] };
        case "deleted": return { main: "deleted this task", lines: [] };
        case "completed": return { main: "marked this task as done", lines: [] };
        case "updated": return { main: "updated this task", lines: [] };
        default: return { main: `${humanize(action)} this task`, lines: [] };
    }
}

export function TaskActivity({ taskId, workspaceId }: { taskId: string; workspaceId: string }) {
    const [expanded, setExpanded] = useState(false);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        error,
    } = useInfiniteQuery({
        queryKey: ["activity", taskId, workspaceId],
        queryFn: async ({ pageParam }) => {
            const res = await fetch(`/api/activity?workspaceId=${workspaceId}&entityId=${taskId}&entityType=task&skip=${pageParam}&take=20`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            const currentCount = allPages.length * 20;
            return lastPage.hasMore ? currentCount : undefined;
        },
        enabled: !!workspaceId && !!taskId,
    });

    const activities: Activity[] = data?.pages.flatMap((page) => page.activities) || [];

    return (
        <div className="overflow-hidden rounded-xl border border-border/50 bg-card/60 shadow-sm">
            <button
                onClick={() => setExpanded((v) => !v)}
                className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors duration-fast ease-out hover:bg-muted/40"
                aria-expanded={expanded}
            >
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <History className="h-3 w-3 text-primary" />
                </span>
                <span className="text-sm font-semibold tracking-tight text-foreground">Activity</span>
                {activities.length > 0 && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                        {activities.length}
                    </span>
                )}
                <ChevronDown
                    className={cn(
                        "ml-auto h-4 w-4 text-muted-foreground/60 transition-transform duration-200 ease-out",
                        expanded && "rotate-180"
                    )}
                />
            </button>

            {expanded && (
                <div className="border-t border-border/50 px-4 pb-4 pt-3">
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex gap-3">
                                    <Skeleton className="h-6 w-6 rounded-full" />
                                    <div className="flex-1 space-y-1">
                                        <Skeleton className="h-3 w-40" />
                                        <Skeleton className="h-3 w-64" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : isError ? (
                        <p className="text-[11px] text-red-500">Failed to load activity history. {(error as Error)?.message}</p>
                    ) : activities.length === 0 ? (
                        <p className="py-4 text-center text-[11px] text-muted-foreground">No activity yet.</p>
                    ) : (
                        <>
                            <div className="space-y-3.5">
                                {activities.map((activity) => {
                                    const { main, lines } = getActionLabel(activity);
                                    return (
                                        <div key={activity.id} className="flex gap-3">
                                            <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted/70 ring-1 ring-border/40">
                                                {getActionIcon(activity.action)}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-4 w-4">
                                                        <AvatarImage src={activity.user?.imageUrl || ""} />
                                                        <AvatarFallback className="text-[8px]">{activity.user?.name?.[0] || "U"}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-[11px] font-semibold text-foreground">{activity.user?.name || "Someone"}</span>
                                                    <span className="text-[10px] text-muted-foreground/70">
                                                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                        {main.charAt(0).toUpperCase() + main.slice(1)}
                                                    </span>
                                                </p>
                                                {lines.length > 0 && (
                                                    <ul className="mt-1 space-y-0.5">
                                                        {lines.map((line, i) => (
                                                            <li key={i} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                                                                <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-primary/40" />
                                                                <span>{line.charAt(0).toUpperCase() + line.slice(1)}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {hasNextPage && (
                                <button
                                    onClick={() => fetchNextPage()}
                                    disabled={isFetchingNextPage}
                                    className="mt-4 flex h-8 w-full items-center justify-center gap-2 rounded-lg border border-border/60 text-[11px] font-medium text-muted-foreground transition-colors duration-fast ease-out hover:bg-muted/50 hover:text-foreground disabled:opacity-50"
                                >
                                    {isFetchingNextPage ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                                    {isFetchingNextPage ? "Loading..." : "Load older activity"}
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
