"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
    Activity as ActivityIcon, 
    CheckCircle2, 
    MessageSquare, 
    Plus, 
    RefreshCcw, 
    Trash2,
    Clock,
    ArrowRight,
    Loader2
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useInView } from "react-intersection-observer";
import { useEffect } from "react";

interface ActivityItem {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    createdAt: string;
    user?: { name: string; imageUrl?: string } | null;
    project?: { name: string } | null;
    metadata?: { entityName?: string; changes?: Record<string, { old: string; new: string }> };
}

interface ProjectActivityProps {
    projectId: string;
    workspaceId: string;
}

export function ProjectActivity({ projectId, workspaceId }: ProjectActivityProps) {
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
        queryKey: ["project-activity", projectId, workspaceId],
        queryFn: async ({ pageParam }) => {
            const res = await fetch(`/api/activity?workspaceId=${workspaceId}&projectId=${projectId}&skip=${pageParam}&take=20`);
            if (!res.ok) throw new Error("Failed to fetch activity");
            return res.json();
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            const currentCount = allPages.length * 20;
            return lastPage.hasMore ? currentCount : undefined;
        },
        enabled: !!workspaceId && !!projectId,
    });

    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    const activities: ActivityItem[] = data?.pages.flatMap(page => page.activities) || [];

    const getActionIcon = (action: string) => {
        switch (action.toLowerCase()) {
            case "created": return <Plus className="h-4 w-4 text-emerald-500" />;
            case "updated": return <RefreshCcw className="h-4 w-4 text-blue-500" />;
            case "deleted": return <Trash2 className="h-4 w-4 text-red-500" />;
            case "commented": return <MessageSquare className="h-4 w-4 text-primary" />;
            case "status_updated": return <CheckCircle2 className="h-4 w-4 text-purple-500" />;
            default: return <ActivityIcon className="h-4 w-4 text-slate-400" />;
        }
    };

    if (isError) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <p className="text-sm text-red-500">Failed to load activity. {(error as Error)?.message}</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex gap-4">
                        <Skeleton variant="circle" width={40} height={40} />
                        <div className="space-y-2 flex-1">
                            <Skeleton variant="text" width={25} height={16} />
                            <Skeleton variant="rectangle" width={100} height={40} />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="max-w-4xl space-y-8 h-full overflow-y-auto pr-2 pb-10">
            <div className="flex items-center justify-between mb-8">
                <div>
                     <h3 className="text-xl font-semibold">Project Activity Feed</h3>
                     <p className="text-xs font-semibold text-primary mt-1">Real-time audit log and evolution</p>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-muted flex items-center justify-center text-primary">
                     <Clock className="h-5 w-5" />
                </div>
            </div>

            <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-5 space-y-10 py-4">
                {activities.map((activity: ActivityItem) => (
                    <div key={activity.id} className="relative pl-10">
                        <div className="absolute -left-[17px] top-0 h-8 w-8 rounded-xl bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-sm">
                            {getActionIcon(activity.action)}
                        </div>

                        <Card className="border-none shadow-sm bg-slate-50/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 transition-all cursor-default">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={activity.user?.imageUrl} />
                                            <AvatarFallback>{activity.user?.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-bold flex items-center gap-2">
                                                {activity.user?.name}
                                                <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{activity.action}</span>
                                            </p>
                                            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                                                {activity.entityType} • {activity.metadata?.entityName || activity.entityId}
                                            </p>
                                        </div>
                                    </div>
                                    <time className="text-[10px] font-semibold text-slate-400 whitespace-nowrap">
                                        {format(new Date(activity.createdAt), "PPp")}
                                    </time>
                                </div>

                                {activity.metadata?.changes && (
                                    <div className="mt-4 p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/50 space-y-2">
                                         {Object.entries(activity.metadata.changes).map(([field, values]) => (
                                             <div key={field} className="flex items-center gap-2 text-[10px] font-bold">
                                                 <span className="text-muted-foreground">{field}:</span>
                                                 <span className="text-red-500 line-through opacity-50">{String((values as { old: string }).old)}</span>
                                                 <ArrowRight className="h-3 w-3 text-slate-300" />
                                                 <span className="text-primary">{String((values as { new: string }).new)}</span>
                                             </div>
                                         ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                ))}

                {activities.length === 0 && (
                    <div className="pl-10 py-10 text-center text-slate-400 italic font-semibold text-[10px]">
                        The silence of progress... No activities yet.
                    </div>
                )}

                <div ref={ref} className="h-8 flex items-center justify-center">
                    {isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                </div>
            </div>
        </div>
    );
}
