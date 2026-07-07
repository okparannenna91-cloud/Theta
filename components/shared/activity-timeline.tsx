"use client";

import { formatDistanceToNow } from "date-fns";
import { Clock, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ActivityTimelineItem {
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
    user?: { name?: string; imageUrl?: string } | null;
    metadata?: { taskTitle?: string; title?: string };
}

interface ActivityTimelineProps {
    activities: ActivityTimelineItem[];
    emptyMessage?: string;
    showUserAvatar?: boolean;
}

const ACTION_LABELS: Record<string, string> = {
    created: "created",
    updated: "updated",
    deleted: "deleted",
    completed: "completed",
    commented: "commented on",
    invited: "invited",
    assigned: "assigned",
    unassigned: "unassigned",
    moved: "moved",
    archived: "archived",
    nova_execution: "nova executed",
    nova_query: "nova queried",
    nova_suggestion: "nova suggested",
};

function getActionLabel(action: string): string {
    const lower = action.toLowerCase();
    return ACTION_LABELS[lower] || lower;
}

export function ActivityTimeline({ activities, emptyMessage, showUserAvatar }: ActivityTimelineProps) {
    if (!activities || activities.length === 0) {
        return (
            <div className="text-center py-12">
                <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{emptyMessage || "No recent activity"}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 relative">
            <div className="absolute left-[17px] top-0 bottom-0 w-px bg-border" />
            {activities.map((activity) => {
                const createdAt = activity.createdAt ? new Date(activity.createdAt) : null;
                const title = activity.metadata?.taskTitle || activity.metadata?.title;
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
                                <Badge variant="outline" className="text-xs rounded-md px-2 py-0 h-5">
                                    {activity.entityType.replace(/_/g, " ")}
                                </Badge>
                            </div>
                            {title && (
                                <p className="text-sm text-muted-foreground mt-1 italic">
                                    &ldquo;{title}&rdquo;
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {createdAt ? formatDistanceToNow(createdAt, { addSuffix: true }) : "unknown"}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
