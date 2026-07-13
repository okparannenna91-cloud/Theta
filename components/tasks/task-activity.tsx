"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { History, PlusCircle, CheckCircle2, AlertCircle, Edit, Trash2, ArrowRightLeft, Users, Loader2 } from "lucide-react";
import { useInView } from "react-intersection-observer";
import { useEffect } from "react";

interface ActivityChange {
    old: unknown;
    new: unknown;
}

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

const STATUS_LABELS: Record<string, string> = {
    todo: "Todo",
    in_progress: "In Progress",
    done: "Done",
    cancelled: "Cancelled",
    backlog: "Backlog",
    review: "Review",
};

const PRIORITY_LABELS: Record<string, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",
};

function formatFieldValue(field: string, value: unknown): string {
    if (value === null || value === undefined) return "none";
    if (typeof value === "string") {
        if (field === "status") return STATUS_LABELS[value] || value;
        if (field === "priority") return PRIORITY_LABELS[value] || value;
    }
    if (Array.isArray(value)) return `${value.length} item${value.length !== 1 ? "s" : ""}`;
    return String(value);
}

function renderChangeDescription(fieldName: string, change: ActivityChange): string {
    const oldLabel = formatFieldValue(fieldName, change.old);
    const newLabel = formatFieldValue(fieldName, change.new);

    if (fieldName === "assigneeIds") {
        if (Array.isArray(change.new) && Array.isArray(change.old)) {
            const added = (change.new as string[]).filter((id) => !(change.old as string[]).includes(id));
            const removed = (change.old as string[]).filter((id) => !(change.new as string[]).includes(id));
            const parts: string[] = [];
            if (added.length > 0) parts.push(`Added ${added.length} assignee${added.length > 1 ? "s" : ""}`);
            if (removed.length > 0) parts.push(`Removed ${removed.length} assignee${removed.length > 1 ? "s" : ""}`);
            return parts.join(", ") || "Updated assignees";
        }
        return `Updated assignees from ${oldLabel} to ${newLabel}`;
    }

    if (fieldName === "status") {
        return `Status changed from ${oldLabel} to ${newLabel}`;
    }

    if (fieldName === "priority") {
        return `Priority changed from ${oldLabel} to ${newLabel}`;
    }

    if (fieldName === "title") {
        return `Title changed`;
    }

    return `Updated ${fieldName} from ${oldLabel} to ${newLabel}`;
}

function ChangesBlock({ changes }: { changes: Record<string, ActivityChange> }) {
    const entries = Object.entries(changes);
    if (entries.length === 0) return null;

    return (
        <div className="mt-1 space-y-0.5">
            {entries.map(([field, change]) => (
                <p key={field} className="text-[10px] text-muted-foreground flex items-start gap-1">
                    <ArrowRightLeft className="h-2.5 w-2.5 mt-0.5 flex-shrink-0 text-indigo-400" />
                    <span>{renderChangeDescription(field, change)}</span>
                </p>
            ))}
        </div>
    );
}

export function TaskActivity({ taskId, workspaceId }: { taskId: string; workspaceId: string }) {
    const { ref, inView } = useInView();

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
            const json = await res.json();
            return json;
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            const currentCount = allPages.length * 20;
            return lastPage.hasMore ? currentCount : undefined;
        },
        enabled: !!workspaceId && !!taskId,
    });

    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    const activities: Activity[] = data?.pages.flatMap(page => page.activities) || [];

    if (isError) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <History className="h-4 w-4" />
                    <h3 className="text-sm font-semibold tracking-tight">Activity Log</h3>
                </div>
                <p className="text-[10px] text-red-500">Failed to load activity history. {(error as Error)?.message}</p>
            </div>
        );
    }

    const getActionIcon = (action: string) => {
        switch (action.toLowerCase()) {
            case "created": return <PlusCircle className="h-3 w-3 text-emerald-500" />;
            case "updated": return <Edit className="h-3 w-3 text-indigo-500" />;
            case "deleted": return <Trash2 className="h-3 w-3 text-red-500" />;
            case "completed": return <CheckCircle2 className="h-3 w-3 text-emerald-500" />;
            default: return <AlertCircle className="h-3 w-3 text-slate-400" />;
        }
    };

    const getActionLabel = (activity: Activity) => {
        const changes = activity.metadata?.changes;
        if (activity.action.toLowerCase() === "updated" && changes && Object.keys(changes).length > 0) {
            const fields = Object.keys(changes);
            if (fields.length === 1) {
                return renderChangeDescription(fields[0], changes[fields[0]]);
            }
            return `Updated ${fields.length} field${fields.length > 1 ? "s" : ""}: ${fields.join(", ")}`;
        }
        switch (activity.action.toLowerCase()) {
            case "created": return "Created this task";
            case "deleted": return "Deleted this task";
            case "completed": return "Completed this task";
            case "updated": return "Updated this task";
            default: return `${activity.action.charAt(0).toUpperCase() + activity.action.slice(1)} this task`;
        }
    };

    if (isLoading) return <div className="text-[10px] text-muted-foreground animate-pulse">Loading history...</div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
                <History className="h-4 w-4" />
                <h3 className="text-sm font-semibold tracking-tight">Activity Log</h3>
            </div>

            <div className="space-y-4 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 dark:before:bg-slate-800">
                {activities.map((activity) => (
                    <div key={activity.id} className="relative flex gap-4 pl-0">
                        <div className="bg-white dark:bg-slate-950 ring-4 ring-slate-50 dark:ring-slate-900 rounded-full z-10">
                            {getActionIcon(activity.action)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <Avatar className="h-4 w-4">
                                    <AvatarImage src={activity.user?.imageUrl || ""} />
                                    <AvatarFallback>{activity.user?.name?.[0] || "U"}</AvatarFallback>
                                </Avatar>
                                <span className="text-[11px] font-bold">{activity.user?.name || "System"}</span>
                                <span className="text-[10px] text-muted-foreground">
                                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                                </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                <span className="font-bold text-slate-700 dark:text-slate-300">{getActionLabel(activity)}</span>
                            </p>
                            {activity.metadata?.changes && Object.keys(activity.metadata.changes).length > 0 && (
                                <ChangesBlock changes={activity.metadata.changes} />
                            )}
                        </div>
                    </div>
                ))}

                {activities.length === 0 && (
                    <p className="text-[11px] text-muted-foreground italic pl-8">No recent activity.</p>
                )}

                <div ref={ref} className="h-4 flex items-center justify-center">
                    {isFetchingNextPage && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                </div>
            </div>
        </div>
    );
}
