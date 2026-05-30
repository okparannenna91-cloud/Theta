"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationPanel } from "@/components/notifications/notification-panel";
import { useWorkspace } from "@/hooks/use-workspace";
import { useQuery } from "@tanstack/react-query";
import { useAbly } from "@/hooks/use-ably";

export function NotificationBell() {
    const { activeWorkspaceId } = useWorkspace();
    const [unreadCount, setUnreadCount] = useState(0);

    const { data, refetch } = useQuery({
        queryKey: ["notifications", activeWorkspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/notifications?workspaceId=${activeWorkspaceId}`);
            if (!res.ok) throw new Error("Failed to fetch notifications");
            return res.json();
        },
        enabled: !!activeWorkspaceId,
    });

    useEffect(() => {
        if (data?.unreadCount !== undefined) {
            setUnreadCount(data.unreadCount);
        }
    }, [data]);

    useAbly(
        `workspace:${activeWorkspaceId}`,
        "notification",
        () => {
            refetch();
            setUnreadCount(prev => prev + 1);
        }
    );

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-semibold">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
                <NotificationPanel
                    notifications={data?.notifications || []}
                    onRefresh={refetch}
                    onClearUnread={() => setUnreadCount(0)}
                />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
