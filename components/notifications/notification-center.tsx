"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
    Bell, 
    Check, 
    X, 
    AlertCircle, 
    CheckCircle2, 
    UserPlus, 
    Briefcase,
    Loader2,
    Settings,
    MoreHorizontal,
    Inbox
} from "lucide-react";
import Link from "next/link";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useAbly } from "@/hooks/use-ably";
import { getWorkspaceChannel } from "@/lib/ably";

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
}

interface NotificationCenterProps {
    workspaceId: string;
    userId: string;
}

export function NotificationCenter({ workspaceId, userId }: NotificationCenterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery<{ notifications: Notification[], unreadCount: number }>({
        queryKey: ["notifications", workspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/notifications?workspaceId=${workspaceId}`);
            if (!res.ok) throw new Error("Failed to fetch notifications");
            return res.json();
        },
        enabled: !!workspaceId,
    });

    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            await fetch(`/api/notifications?workspaceId=${workspaceId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ markAllAsRead: true }),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications", workspaceId] });
        },
    });

    // Real-time listener for workspace notifications
    useAbly(getWorkspaceChannel(workspaceId), "notification", (notification) => {
        // Increment unread count or refresh query
        queryClient.setQueryData(["notifications", workspaceId], (old: any) => {
            if (!old) return { notifications: [notification], unreadCount: 1 };
            return {
                notifications: [notification, ...old.notifications],
                unreadCount: old.unreadCount + 1
            };
        });
    });

    const getIcon = (type: string) => {
        switch (type) {
            case "task_assigned": return <CheckSquare className="h-4 w-4 text-indigo-500" />;
            case "team_invite": return <UserPlus className="h-4 w-4 text-emerald-500" />;
            case "project_created": return <Briefcase className="h-4 w-4 text-blue-500" />;
            case "limit_warning": return <AlertCircle className="h-4 w-4 text-amber-500" />;
            case "payment_success": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
            default: return <Bell className="h-4 w-4 text-slate-400" />;
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative group hover:bg-slate-100 dark:hover:bg-slate-800 transition-all rounded-xl">
                    <Bell className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    {data && data.unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] flex items-center justify-center bg-indigo-600 text-[10px] font-black text-white px-1 rounded-full border-2 border-white dark:border-slate-900 shadow-sm animate-in zoom-in">
                            {data.unreadCount > 9 ? "9+" : data.unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 sm:w-96 p-0 border-none shadow-2xl rounded-2xl overflow-hidden bg-white dark:bg-slate-900" align="end" sideOffset={8}>
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                    <div className="flex items-center gap-2">
                        <Inbox className="h-4 w-4 text-indigo-500" />
                        <h3 className="font-black text-xs uppercase tracking-widest">Inbox</h3>
                    </div>
                    {data && data.unreadCount > 0 && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-[10px] font-bold uppercase text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-2"
                            onClick={() => markAllReadMutation.mutate()}
                        >
                            Mark all read
                        </Button>
                    )}
                </div>

                <ScrollArea className="h-[400px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full p-10 space-y-3 opacity-50">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">Refreshing...</p>
                        </div>
                    ) : data?.notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-10 text-center space-y-4">
                            <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                                <Bell className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-bold">All caught up!</p>
                                <p className="text-xs text-muted-foreground max-w-[180px]">Your notifications will appear here as they happen.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                            {data?.notifications.map((notification) => (
                                <div 
                                    key={notification.id} 
                                    className={cn(
                                        "p-4 transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/20 group relative",
                                        !notification.read && "bg-indigo-500/[0.03]"
                                    )}
                                >
                                    <div className="flex gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-sm flex-shrink-0 group-hover:scale-110 transition-transform">
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className={cn("text-xs font-black truncate", !notification.read ? "text-slate-900 dark:text-slate-100" : "text-muted-foreground")}>
                                                    {notification.title}
                                                </p>
                                                {!notification.read && (
                                                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]" />
                                                )}
                                            </div>
                                            <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight pt-1">
                                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 text-center">
                    <Button asChild variant="ghost" size="sm" className="w-full text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-indigo-600">
                        <Link href="/notifications">View all notifications</Link>
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}

// Sub-component for missing icon
function CheckSquare({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}
