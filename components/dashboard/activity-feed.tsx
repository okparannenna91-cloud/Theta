"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
    CheckCircle2,
    PlusCircle,
    MessageSquare,
    UserPlus,
    Settings,
    ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAblyContext } from "@/components/providers/ably-provider";
import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Activity {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    createdAt: string;
    metadata?: Record<string, unknown>;
    user?: {
        name: string;
        imageUrl: string;
    } | null;
}

const ACTION_DISPLAY: Record<string, string> = {
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
};

const displayAction = (action: string) => {
    const lower = action.toLowerCase();
    return ACTION_DISPLAY[lower] || lower + "ed";
};

const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
        case "create":
        case "created": return <PlusCircle className="h-4 w-4 text-blue-500" />;
        case "update":
        case "updated": return <Settings className="h-4 w-4 text-amber-500" />;
        case "delete":
        case "deleted": return <CheckCircle2 className="h-4 w-4 text-rose-500" />;
        case "comment":
        case "commented": return <MessageSquare className="h-4 w-4 text-indigo-500" />;
        case "complete":
        case "completed": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
        case "invite":
        case "invited": return <UserPlus className="h-4 w-4 text-purple-500" />;
        default: return <PlusCircle className="h-4 w-4 text-slate-500" />;
    }
};

export function ActivityFeed({ workspaceId }: { workspaceId: string }) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const ablyClient = useAblyContext();

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["activities", workspaceId],
        queryFn: async () => {
            if (!workspaceId) return [];
            const res = await fetch(`/api/activity?workspaceId=${workspaceId}`);
            if (!res.ok) throw new Error("Failed to fetch activities");
            const json = await res.json();
            return json.activities as Activity[];
        },
        enabled: !!workspaceId,
        refetchInterval: 120_000, // 2 min – Ably subscription handles real-time; this is just backup
    });

    const handleActivityEvent = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["activities", workspaceId] });
    }, [queryClient, workspaceId]);

    useEffect(() => {
        if (!ablyClient || !workspaceId) return;

        const channel = ablyClient.channels.get(`workspace:${workspaceId}`);
        channel.subscribe("activity:created", handleActivityEvent);

        return () => {
            channel.unsubscribe("activity:created", handleActivityEvent);
        };
    }, [ablyClient, workspaceId, handleActivityEvent]);

    const activities = Array.isArray(data) ? data : [];

    if (!workspaceId) {
        return null;
    }

    if (isLoading) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Stay updated with what&apos;s happening</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex gap-4">
                            <Skeleton variant="circle" width={32} height={32} />
                            <div className="space-y-2 flex-1">
                                <Skeleton variant="text" width={100} height={16} />
                                <Skeleton variant="text" width={30} height={12} />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (isError) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Stay updated with what&apos;s happening</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12 text-muted-foreground italic">
                        Failed to load activities. {(error as Error)?.message}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full shadow-lg border-muted/20">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-xl">Activity Feed</CardTitle>
                    <CardDescription>Real-time updates from your workspace</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => router.push("/activity")}>
                    View All <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {activities && activities.length > 0 ? (
                        activities.map((activity, i) => (
                            <div key={activity.id} className="relative flex gap-4">
                                {i !== activities.length - 1 && (
                                    <div className="absolute left-[15px] top-8 w-[2px] h-[calc(100%+8px)] bg-muted/30" />
                                )}

                                <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm">
                                    {getActionIcon(activity.action)}
                                </div>

                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-medium leading-none">
                                            <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                                                {activity.user?.name || "Someone"}
                                            </span>
                                            {" "}{displayAction(activity.action)}{" "}
                                            <span className="font-semibold">{activity.entityType.toLowerCase().replace(/_/g, " ")}</span>
                                        </p>
                                        <time className="text-[10px] text-muted-foreground whitespace-nowrap">
                                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                                        </time>
                                    </div>
                                    {(activity.metadata as Record<string, unknown> | undefined)?.title ? (
                                        <p className="text-xs text-muted-foreground line-clamp-1 italic bg-muted/30 p-1 rounded mt-1">
                                            &quot;{String((activity.metadata as Record<string, unknown>).title)}&quot;
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 text-muted-foreground italic">
                            No recent activity recorded.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
