"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { Clock, Activity, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/hooks/use-workspace";
import { useInView } from "react-intersection-observer";

interface ActivityTimelineItem {
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
    user?: { name?: string; imageUrl?: string } | null;
    metadata?: { taskTitle?: string; title?: string; entityName?: string; changes?: Record<string, { old: unknown; new: unknown }> };
}

interface ActivityTimelineProps {
    activities?: ActivityTimelineItem[];
    entityType?: string;
    entityId?: string;
    emptyMessage?: string;
    showUserAvatar?: boolean;
    limit?: number;
}

const ACTION_LABELS: Record<string, string> = {
    created: "created",
    updated: "updated",
    deleted: "deleted",
    completed: "completed",
    commented: "commented on",
    comment_created: "commented on",
    comment_deleted: "deleted comment on",
    invited: "invited",
    assigned: "assigned",
    unassigned: "unassigned",
    moved: "moved",
    archived: "archived",
    restored: "restored",
    status_changed: "changed status of",
    priority_changed: "changed priority of",
    due_date_changed: "changed due date of",
    start_date_changed: "changed start date of",
    description_edited: "edited description of",
    checklist_updated: "updated checklist on",
    attachment_uploaded: "uploaded attachment to",
    attachment_removed: "removed attachment from",
    dependency_created: "created dependency for",
    dependency_removed: "removed dependency from",
    member_invited: "invited member to",
    member_removed: "removed member from",
    project_renamed: "renamed project",
    project_archived: "archived project",
    project_restored: "restored project",
    team_created: "created team",
    board_created: "created board",
    sprint_started: "started sprint",
    milestone_completed: "completed milestone",
    nova_execution: "Nova executed",
    nova_query: "Nova queried",
    nova_suggestion: "Nova suggested",
    nova_created_task: "Nova created task",
    nova_updated_project: "Nova updated project",
    ai_generation: "AI generated",
};

function getActionLabel(action: string): string {
    const lower = action.toLowerCase();
    return ACTION_LABELS[lower] || lower.replace(/_/g, " ");
}

export function ActivityTimeline({
    activities: propActivities,
    entityType,
    entityId,
    emptyMessage,
    showUserAvatar,
    limit = 20,
}: ActivityTimelineProps) {
    const { activeWorkspaceId } = useWorkspace();
    const [fetchedActivities, setFetchedActivities] = useState<ActivityTimelineItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const { ref, inView } = useInView();

    const isFetchMode = !!entityType && !!entityId;

    const fetchActivities = useCallback(async (skip: number) => {
        if (!activeWorkspaceId || !entityType || !entityId) return;
        setIsLoading(true);
        try {
            const res = await fetch(
                `/api/activity?workspaceId=${activeWorkspaceId}&entityType=${entityType}&entityId=${entityId}&skip=${skip}&take=${limit}`
            );
            if (!res.ok) throw new Error("Failed");
            const data = await res.json();
            setFetchedActivities(prev => skip === 0 ? data.activities : [...prev, ...data.activities]);
            setHasMore(data.activities?.length === limit);
        } catch {
            // silent
        } finally {
            setIsLoading(false);
        }
    }, [activeWorkspaceId, entityType, entityId, limit]);

    useEffect(() => {
        if (isFetchMode) {
            fetchActivities(0);
        }
    }, [isFetchMode, fetchActivities]);

    useEffect(() => {
        if (inView && isFetchMode && hasMore && !isLoading) {
            fetchActivities(fetchedActivities.length);
        }
    }, [inView, isFetchMode, hasMore, isLoading, fetchedActivities.length, fetchActivities]);

    const activities = isFetchMode ? fetchedActivities : (propActivities || []);

    if (!isFetchMode && (!activities || activities.length === 0)) {
        return (
            <div className="text-center py-12">
                <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{emptyMessage || "No recent activity"}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 relative">
            <div className="absolute left-[17px] top-0 bottom-0 w-px bg-border" />
            {activities.map((activity) => {
                const createdAt = activity.createdAt ? new Date(activity.createdAt) : null;
                const title = activity.metadata?.taskTitle || activity.metadata?.title || activity.metadata?.entityName;
                const changes = activity.metadata?.changes;
                return (
                    <div key={activity.id} className="flex gap-4 relative pl-8">
                        <div className="absolute left-0 top-1.5 w-[10px] h-[10px] rounded-full bg-primary border-2 border-background z-10" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-foreground">
                                    {activity.user?.name || "System"}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    {getActionLabel(activity.action)}
                                </span>
                                <Badge variant="outline" className="text-[10px] rounded-md px-1.5 py-0 h-4">
                                    {activity.entityType.replace(/_/g, " ")}
                                </Badge>
                            </div>
                            {title && (
                                <p className="text-sm text-muted-foreground mt-1 italic">
                                    &ldquo;{title}&rdquo;
                                </p>
                            )}
                            {changes && Object.keys(changes).length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                    {Object.entries(changes).map(([field, change]) => (
                                        <span key={field} className="text-[10px] bg-muted/60 rounded-md px-1.5 py-0.5">
                                            <span className="font-medium text-muted-foreground">{field}:</span>{" "}
                                            <span className="text-red-500 line-through">{String(change.old)}</span>{" "}
                                            <span className="text-muted-foreground">&rarr;</span>{" "}
                                            <span className="text-emerald-600 dark:text-emerald-400">{String(change.new)}</span>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" />
                                {createdAt ? formatDistanceToNow(createdAt, { addSuffix: true }) : "unknown"}
                            </p>
                        </div>
                    </div>
                );
            })}
            {isFetchMode && (
                <div ref={ref} className="h-8 flex items-center justify-center">
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    {!hasMore && activities.length > 0 && !isLoading && (
                        <p className="text-[10px] text-muted-foreground">End of activity</p>
                    )}
                </div>
            )}
        </div>
    );
}
