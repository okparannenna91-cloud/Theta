"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useWorkspace } from "@/hooks/use-workspace";
import { useAbly } from "@/hooks/use-ably";
import { getWorkspaceChannel } from "@/lib/ably";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { NotificationPanel } from "./notification-panel";

export function NotificationBell() {
    const { activeWorkspaceId } = useWorkspace();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);

    const { data } = useQuery({
        queryKey: ["notifications", "unread-count", activeWorkspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/notifications?workspaceId=${activeWorkspaceId}&filter=unread&take=1`);
            if (!res.ok) throw new Error("Failed to fetch");
            const json = await res.json();
            return { unreadCount: json.unreadCount, notifications: json.notifications || [] };
        },
        enabled: !!activeWorkspaceId,
        refetchInterval: 60000,
    });

    // Real-time notification listener
    useAbly(getWorkspaceChannel(activeWorkspaceId || ""), "notification", () => {
        queryClient.invalidateQueries({ queryKey: ["notifications", activeWorkspaceId] });
        queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count", activeWorkspaceId] });
    });

    // Real-time count update listener
    useAbly(getWorkspaceChannel(activeWorkspaceId || ""), "notification:count", (msg: any) => {
        queryClient.setQueryData(["notifications", "unread-count", activeWorkspaceId], (old: any) => {
            if (!old) return { unreadCount: msg.count, notifications: [] };
            return { ...old, unreadCount: msg.count };
        });
    });

    const unreadCount = data?.unreadCount || 0;

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-xl" aria-label="Notifications">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] flex items-center justify-center bg-red-500 text-[10px] font-semibold text-white px-1 rounded-full border-2 border-background shadow-sm">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 border shadow-xl rounded-xl overflow-hidden" sideOffset={8}>
                <NotificationPanel
                    workspaceId={activeWorkspaceId || ""}
                    onClose={() => setIsOpen(false)}
                />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function NotificationBellWithPriority() {
    const { activeWorkspaceId } = useWorkspace();
    const queryClient = useQueryClient();

    const { data } = useQuery({
        queryKey: ["notifications", "priority-counts", activeWorkspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/notifications?workspaceId=${activeWorkspaceId}&filter=unread&take=50`);
            if (!res.ok) throw new Error("Failed to fetch");
            const json = await res.json();
            const critical = json.notifications.filter((n: any) => n.priority === "critical" && !n.read).length;
            return { total: json.unreadCount || 0, critical };
        },
        enabled: !!activeWorkspaceId,
        refetchInterval: 60000,
    });

    useAbly(getWorkspaceChannel(activeWorkspaceId || ""), "notification", () => {
        queryClient.invalidateQueries({ queryKey: ["notifications", "priority-counts", activeWorkspaceId] });
    });

    useAbly(getWorkspaceChannel(activeWorkspaceId || ""), "notification:count", (msg: any) => {
        queryClient.setQueryData(["notifications", "priority-counts", activeWorkspaceId], (old: any) => {
            return old ? { ...old, total: msg.count } : { total: msg.count, critical: 0 };
        });
    });

    const total = data?.total || 0;
    const critical = data?.critical || 0;

    return (
        <Link href="/notifications" className="relative" aria-label={`${total} unread notifications`}>
            <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
            {critical > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
            )}
            {total > 0 && critical === 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] flex items-center justify-center bg-amber-500 text-[10px] font-semibold text-white px-1 rounded-full border-2 border-background shadow-sm">
                    {total > 9 ? "9+" : total}
                </span>
            )}
        </Link>
    );
}
