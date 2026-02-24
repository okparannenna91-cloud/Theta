"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { History, PlusCircle, CheckCircle2, AlertCircle, Edit, Trash2 } from "lucide-react";

interface Activity {
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
    user: {
        name: string | null;
        imageUrl: string | null;
    };
    metadata: any;
}

export function TaskActivity({ taskId, workspaceId }: { taskId: string; workspaceId: string }) {
    const { data: activities, isLoading } = useQuery<Activity[]>({
        queryKey: ["activity", taskId],
        queryFn: async () => {
            const res = await fetch(`/api/activity?workspaceId=${workspaceId}&entityId=${taskId}&entityType=task`);
            if (!res.ok) throw new Error("Failed");
            return res.json();
        },
    });

    const getActionIcon = (action: string) => {
        switch (action.toLowerCase()) {
            case "created": return <PlusCircle className="h-3 w-3 text-emerald-500" />;
            case "updated": return <Edit className="h-3 w-3 text-indigo-500" />;
            case "deleted": return <Trash2 className="h-3 w-3 text-red-500" />;
            case "completed": return <CheckCircle2 className="h-3 w-3 text-emerald-500" />;
            default: return <AlertCircle className="h-3 w-3 text-slate-400" />;
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
                {activities?.map((activity) => (
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
                                <span className="font-bold text-slate-700 dark:text-slate-300 capitalize">{activity.action}</span> this task
                            </p>
                        </div>
                    </div>
                ))}

                {activities?.length === 0 && (
                    <p className="text-[11px] text-muted-foreground italic pl-8">No recent activity.</p>
                )}
            </div>
        </div>
    );
}
