"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Inbox, Check, Loader2, AlertCircle, ChevronRight } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { NotificationPanelItem } from "./notification-panel-item";

interface NotificationPanelProps {
    workspaceId: string;
    onClose?: () => void;
}

export function NotificationPanel({ workspaceId, onClose }: NotificationPanelProps) {
    const queryClient = useQueryClient();

    const { data, isLoading, isError } = useQuery({
        queryKey: ["notifications", "panel", workspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/notifications?workspaceId=${workspaceId}&take=10`);
            if (!res.ok) throw new Error("Failed to fetch");
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
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });

    const notifications = data?.notifications || [];
    const unreadCount = data?.unreadCount || 0;

    return (
        <div>
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                    <Inbox className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                        <span className="text-xs text-muted-foreground">({unreadCount} unread)</span>
                    )}
                </div>
                {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs"
                        onClick={() => markAllReadMutation.mutate()}
                    >
                        <Check className="h-3 w-3 mr-1" />
                        Mark all read
                    </Button>
                )}
            </div>

            <ScrollArea className="h-[400px]">
                {isError ? (
                    <div className="flex flex-col items-center justify-center h-full p-10 text-center">
                        <AlertCircle className="h-8 w-8 text-destructive mb-3" />
                        <p className="text-sm font-medium">Failed to load</p>
                        <p className="text-xs text-muted-foreground mt-1">Could not load notifications.</p>
                    </div>
                ) : isLoading ? (
                    <div className="flex items-center justify-center h-full p-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-10 text-center">
                        <div className="h-14 w-14 bg-muted rounded-full flex items-center justify-center mb-4">
                            <Bell className="h-7 w-7 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm font-medium">All caught up!</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                            New notifications will appear here as they happen.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {notifications.slice(0, 8).map((n: any) => (
                            <NotificationPanelItem key={n.id} notification={n} />
                        ))}
                    </div>
                )}
            </ScrollArea>

            <div className="p-3 border-t text-center">
                <Button asChild variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-primary">
                    <Link href="/notifications" onClick={onClose}>
                        View all notifications
                        <ChevronRight className="h-3 w-3 ml-1" />
                    </Link>
                </Button>
            </div>
        </div>
    );
}
