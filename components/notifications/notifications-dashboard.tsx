"use client";

import { useState, useMemo, useEffect } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import {
    Bell,
    Check,
    Trash2,
    AtSign,
    CheckCircle2,
    MessageSquare,
    AlertTriangle,
    ListTodo,
    FolderKanban,
    Archive,
    Inbox,
    Clock,
    MoreHorizontal,
    Pin,
    Loader2,
    Calendar
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useInView } from "react-intersection-observer";

const TABS = [
    { id: "all", label: "Inbox", icon: Inbox },
    { id: "unread", label: "Unread", icon: Bell },
    { id: "mentions", label: "Mentions", icon: AtSign },
    { id: "assigned", label: "Assigned", icon: ListTodo },
    { id: "reminders", label: "Reminders", icon: Clock },
    { id: "archived", label: "Archived", icon: Archive },
];

export default function NotificationsDashboard() {
    const { activeWorkspaceId } = useWorkspace();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("all");
    const { ref, inView } = useInView();

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } = useInfiniteQuery({
        queryKey: ["notifications", activeWorkspaceId, activeTab],
        queryFn: async ({ pageParam }) => {
            const res = await fetch(`/api/notifications?workspaceId=${activeWorkspaceId}&filter=${activeTab}&skip=${pageParam}&take=20`);
            if (!res.ok) throw new Error("Failed to fetch");
            return res.json();
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            const currentCount = allPages.length * 20;
            return lastPage.hasMore ? currentCount : undefined;
        },
        enabled: !!activeWorkspaceId,
        refetchInterval: 30000
    });

    useEffect(() => {
        if (inView && hasNextPage) fetchNextPage();
    }, [inView, hasNextPage, fetchNextPage]);

    const notifications = data?.pages.flatMap(page => page.notifications) || [];
    const unreadCount = data?.pages[0]?.unreadCount || 0;

    const updateMutation = useMutation({
        mutationFn: async ({ id, ...data }: any) => {
            const res = await fetch(`/api/notifications?workspaceId=${activeWorkspaceId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notificationId: id, ...data })
            });
            if (!res.ok) throw new Error("Update failed");
            return res.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", activeWorkspaceId] })
    });

    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/notifications?workspaceId=${activeWorkspaceId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ markAllAsRead: true })
            });
            if (!res.ok) throw new Error("Update failed");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications", activeWorkspaceId] });
            toast.success("All marked as read");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/notifications?workspaceId=${activeWorkspaceId}&id=${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications", activeWorkspaceId] });
            toast.success("Notification deleted");
        }
    });

    const getIconForType = (type: string) => {
        switch (type) {
            case "task_assigned": return <ListTodo className="h-5 w-5 text-blue-500" />;
            case "task_completed": return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
            case "mention": return <AtSign className="h-5 w-5 text-purple-500" />;
            case "comment": return <MessageSquare className="h-5 w-5 text-amber-500" />;
            case "deadline": return <AlertTriangle className="h-5 w-5 text-red-500" />;
            case "project_update": return <FolderKanban className="h-5 w-5 text-indigo-500" />;
            case "reminder": return <Clock className="h-5 w-5 text-orange-500" />;
            default: return <Bell className="h-5 w-5 text-muted-foreground" />;
        }
    };

    return (
        <div className="pb-10">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Stay updated with workspace activity
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-xs"
                        onClick={() => markAllReadMutation.mutate()}
                        disabled={unreadCount === 0 || markAllReadMutation.isPending}>
                        <Check className="h-4 w-4 mr-2" />
                        Mark All Read
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-2 mb-6 border-b">
                {TABS.map(tab => (
                    <button key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                        {tab.id === "unread" && unreadCount > 0 && (
                            <Badge variant="default" className="text-xs h-5 min-w-[20px] justify-center px-1.5">
                                {unreadCount}
                            </Badge>
                        )}
                    </button>
                ))}
            </div>

            <div className="space-y-2">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-24 w-full bg-muted/30 animate-pulse rounded-lg" />
                    ))
                ) : notifications.length > 0 ? (
                    <>
                        {notifications.map((n: any) => (
                            <div key={n.id}
                                className={`relative flex items-start gap-4 p-4 rounded-lg border transition-colors hover:border-primary/30 ${!n.read ? "bg-muted/30 border-primary/20" : "bg-background"}`}>
                                {!n.read && (
                                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-r-full" />
                                )}
                                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                    {getIconForType(n.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <div className="flex items-center gap-2">
                                            <h3 className={`text-sm ${!n.read ? "font-semibold" : "font-medium text-muted-foreground"}`}>
                                                {n.title}
                                            </h3>
                                            {n.pinned && <Pin className="h-3 w-3 text-primary rotate-45" />}
                                        </div>
                                        <span className="text-xs text-muted-foreground shrink-0">
                                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">{n.message}</p>
                                    <div className="flex items-center gap-2 mt-3">
                                        {n.metadata?.link && (
                                            <Button asChild size="sm" variant="outline" className="h-7 text-xs rounded-md px-3">
                                                <Link href={n.metadata.link}>Open</Link>
                                            </Button>
                                        )}
                                        {!n.read && n.type === "task_assigned" && (
                                            <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-600">
                                                Accept Task
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        {!n.read && (
                                            <DropdownMenuItem onClick={() => updateMutation.mutate({ id: n.id, read: true })}>
                                                <Check className="mr-3 h-4 w-4 text-emerald-500" /> Mark Read
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem onClick={() => updateMutation.mutate({ id: n.id, pinned: !n.pinned })}>
                                            <Pin className="mr-3 h-4 w-4 text-primary" /> {n.pinned ? "Unpin" : "Pin"}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => updateMutation.mutate({ id: n.id, archived: true })}>
                                            <Archive className="mr-3 h-4 w-4 text-muted-foreground" /> Archive
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => deleteMutation.mutate(n.id)} className="text-destructive focus:text-destructive">
                                            <Trash2 className="mr-3 h-4 w-4" /> Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ))}
                        <div ref={ref} className="h-16 flex items-center justify-center">
                            {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-16 border rounded-lg">
                        <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">No notifications found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
