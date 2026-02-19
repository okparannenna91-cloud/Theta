"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
    CheckCircle2,
    PlusCircle,
    MessageSquare,
    UserPlus,
    Settings,
    Clock,
    ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface Activity {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    createdAt: string;
    metadata?: any;
    user?: {
        name: string;
        imageUrl: string;
    };
}

const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
        case "create": return <PlusCircle className="h-4 w-4 text-blue-500" />;
        case "update": return <Settings className="h-4 w-4 text-amber-500" />;
        case "delete": return <Clock className="h-4 w-4 text-rose-500" />;
        case "comment": return <MessageSquare className="h-4 w-4 text-indigo-500" />;
        case "complete": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
        case "invite": return <UserPlus className="h-4 w-4 text-purple-500" />;
        default: return <PlusCircle className="h-4 w-4 text-slate-500" />;
    }
};

export function ActivityFeed({ workspaceId }: { workspaceId: string }) {
    const { data: activities, isLoading } = useQuery({
        queryKey: ["activities", workspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/activity?workspaceId=${workspaceId}`);
            if (!res.ok) throw new Error("Failed to fetch activities");
            return res.json() as Promise<Activity[]>;
        }
    });

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
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                        </div>
                    ))}
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
                <Button variant="ghost" size="sm" className="text-xs">
                    View All <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {activities && activities.length > 0 ? (
                        activities.map((activity, i) => (
                            <div key={activity.id} className="relative flex gap-4">
                                {/* Timeline logic line */}
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
                                            {" "}{activity.action.toLowerCase()}{"d "}
                                            <span className="font-semibold">{activity.entityType.toLowerCase()}</span>
                                        </p>
                                        <time className="text-[10px] text-muted-foreground whitespace-nowrap">
                                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                                        </time>
                                    </div>
                                    {activity.metadata?.title && (
                                        <p className="text-xs text-muted-foreground line-clamp-1 italic bg-muted/30 p-1 rounded mt-1">
                                            &quot;{activity.metadata.title}&quot;
                                        </p>
                                    )}
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
