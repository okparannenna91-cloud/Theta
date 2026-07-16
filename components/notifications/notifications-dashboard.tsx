"use client";

import { useState, useMemo, useEffect } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import {
    Bell, Check, Trash2, AtSign, CheckCircle2, MessageSquare,
    AlertTriangle, ListTodo, FolderKanban, Archive, Inbox, Clock,
    MoreHorizontal, Pin, Loader2, Calendar, Search, Target, Zap,
    UserPlus, UserX, ArrowUp, ArrowDown, Repeat, Sparkles,
    AlertCircle, Brain, X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useInView } from "react-intersection-observer";

const TABS = [
    { id: "all", label: "All", icon: Inbox },
    { id: "unread", label: "Unread", icon: Bell },
    { id: "mentions", label: "Mentions", icon: AtSign },
    { id: "tasks", label: "Tasks", icon: ListTodo },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "alerts", label: "Alerts", icon: AlertCircle },
    { id: "archived", label: "Archived", icon: Archive },
];

const PRIORITY_COLORS: Record<string, string> = {
    critical: "bg-red-500",
    medium: "bg-amber-500",
    low: "bg-slate-400",
};

const PRIORITY_BORDER: Record<string, string> = {
    critical: "border-l-red-500",
    medium: "border-l-amber-500",
    low: "border-l-slate-300",
};

function getIconForType(type: string, className = "h-5 w-5") {
    const props = { className };
    switch (type) {
        case "task_assigned": return <UserPlus {...props} className={`${className} text-blue-500`} />;
        case "task_unassigned": return <UserX {...props} className={`${className} text-slate-500`} />;
        case "task_mentioned":
        case "mention": return <AtSign {...props} className={`${className} text-purple-500`} />;
        case "comment_reply":
        case "comment": return <MessageSquare {...props} className={`${className} text-amber-500`} />;
        case "task_completed": return <CheckCircle2 {...props} className={`${className} text-emerald-500`} />;
        case "task_reopened": return <RotateCcw {...props} className={`${className} text-orange-500`} />;
        case "task_due_soon": return <Clock {...props} className={`${className} text-amber-500`} />;
        case "task_overdue":
        case "deadline": return <AlertTriangle {...props} className={`${className} text-red-500`} />;
        case "project_deadline_approaching":
        case "sprint_ending": return <Calendar {...props} className={`${className} text-indigo-500`} />;
        case "task_status_changed": return <ArrowUp {...props} className={`${className} text-blue-500`} />;
        case "priority_changed": return <ArrowDown {...props} className={`${className} text-orange-500`} />;
        case "dependency_blocked": return <X {...props} className={`${className} text-red-500`} />;
        case "dependency_unblocked": return <Check {...props} className={`${className} text-emerald-500`} />;
        case "recurring_task_created": return <Repeat {...props} className={`${className} text-violet-500`} />;
        case "calendar_event_created":
        case "calendar_event_updated":
        case "calendar_event_starting_soon": return <Calendar {...props} className={`${className} text-blue-500`} />;
        case "calendar_event_missed": return <Calendar {...props} className={`${className} text-red-500`} />;
        case "daily_summary":
        case "weekly_summary": return <Sparkles {...props} className={`${className} text-emerald-500`} />;
        case "nova_suggestion": return <Brain {...props} className={`${className} text-violet-500`} />;
        case "smart_alert":
        case "limit_warning": return <AlertCircle {...props} className={`${className} text-amber-500`} />;
        case "workspace_invite":
        case "team_invite":
        case "member_joined": return <UserPlus {...props} className={`${className} text-green-500`} />;
        case "member_removed": return <UserX {...props} className={`${className} text-red-500`} />;
        case "project_update":
        case "project_created":
        case "project_updated": return <FolderKanban {...props} className={`${className} text-indigo-500`} />;
        case "payment_success": return <CheckCircle2 {...props} className={`${className} text-emerald-500`} />;
        case "payment_failed": return <AlertTriangle {...props} className={`${className} text-red-500`} />;
        case "reminder": return <Clock {...props} className={`${className} text-orange-500`} />;
        default: return <Bell {...props} className={`${className} text-muted-foreground`} />;
    }
}

// We need RotateCcw - let's use a simple span
function RotateCcw(props: any) {
    return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>;
}

export default function NotificationsDashboard() {
    const { activeWorkspaceId } = useWorkspace();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const { ref, inView } = useInView();

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } = useInfiniteQuery({
        queryKey: ["notifications", activeWorkspaceId, activeTab, searchQuery],
        queryFn: async ({ pageParam }) => {
            const params = new URLSearchParams({
                workspaceId: activeWorkspaceId!,
                filter: activeTab,
                skip: String(pageParam),
                take: "20",
            });
            if (searchQuery) params.set("search", searchQuery);
            const res = await fetch(`/api/notifications?${params}`);
            if (!res.ok) throw new Error("Failed to fetch");
            return res.json();
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            const totalReturned = allPages.reduce((sum, p) => sum + p.notifications.length, 0);
            return lastPage.hasMore ? totalReturned : undefined;
        },
        enabled: !!activeWorkspaceId,
        refetchInterval: 60000,
    });

    useEffect(() => {
        if (inView && hasNextPage) fetchNextPage();
    }, [inView, hasNextPage, fetchNextPage]);

    const notifications = data?.pages.flatMap(page => page.notifications) || [];
    const unreadCount = data?.pages[0]?.unreadCount || 0;

    const updateMutation = useMutation({
        mutationFn: async ({ id, ...body }: any) => {
            const res = await fetch(`/api/notifications?workspaceId=${activeWorkspaceId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notificationId: id, ...body })
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

    const priorityCounts = useMemo(() => {
        const counts = { critical: 0, medium: 0, low: 0 };
        for (const n of notifications) {
            if (!n.read && counts[n.priority as keyof typeof counts] !== undefined) {
                counts[n.priority as keyof typeof counts]++;
            }
        }
        return counts;
    }, [notifications]);

    const actions = (n: any) => n.metadata?.actions as Array<{ label: string; href?: string; variant?: string }> | undefined;

    return (
        <div className="pb-10">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Stay updated with workspace activity
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {priorityCounts.critical > 0 && (
                        <Badge variant="destructive" className="text-xs gap-1 px-2.5">
                            <AlertTriangle className="h-3 w-3" />
                            {priorityCounts.critical} critical
                        </Badge>
                    )}
                    <Button variant="ghost" size="sm" className="text-xs"
                        onClick={() => markAllReadMutation.mutate()}
                        disabled={unreadCount === 0 || markAllReadMutation.isPending}>
                        <Check className="h-4 w-4 mr-2" />
                        Mark All Read
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2 border-b flex-1">
                    {TABS.map(tab => (
                        <button key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                activeTab === tab.id
                                    ? "border-primary text-foreground"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}>
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
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search notifications..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-sm rounded-lg"
                    />
                </div>
            </div>

            <div className="space-y-2">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-24 w-full bg-muted/30 animate-pulse rounded-lg" />
                    ))
                ) : isError ? (
                    <div className="text-center py-16 border rounded-lg">
                        <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
                        <p className="text-sm font-medium text-destructive">Failed to load notifications</p>
                        <p className="text-xs text-muted-foreground mt-1 mb-4">There was an error fetching your notifications. Please try again.</p>
                        <Button variant="outline" size="sm" className="rounded-lg" onClick={() => refetch()}>Retry</Button>
                    </div>
                ) : notifications.length > 0 ? (
                    <>
                        {notifications.map((n: any) => {
                            const notifActions = actions(n);
                            return (
                                <div key={n.id}
                                    className={`group relative flex items-start gap-4 p-4 rounded-lg border transition-colors hover:border-primary/30 border-l-4 ${
                                        !n.read ? "bg-muted/30 border-l-primary/60" : "bg-background border-l-transparent"
                                    } ${PRIORITY_BORDER[n.priority] || ""}`}>
                                    {n.priority === "critical" && !n.read && (
                                        <div className="absolute -top-1 -right-1 z-10">
                                            <Badge variant="destructive" className="text-[10px] h-5 px-1.5">CRITICAL</Badge>
                                        </div>
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
                                                {n.groupCount > 1 && (
                                                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5 rounded-full">
                                                        {n.groupCount}x
                                                    </Badge>
                                                )}
                                                {n.pinned && <Pin className="h-3 w-3 text-primary rotate-45" />}
                                                {n.priority && n.priority !== "low" && (
                                                    <div className={`h-2 w-2 rounded-full ${PRIORITY_COLORS[n.priority]}`} />
                                                )}
                                            </div>
                                            <span className="text-xs text-muted-foreground shrink-0">
                                                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2">{n.message}</p>
                                        {notifActions && notifActions.length > 0 && (
                                            <div className="flex items-center gap-2 mt-3">
                                                {notifActions.map((action, ai) => (
                                                    action.href ? (
                                                        <Button key={ai} asChild size="sm"
                                                            variant={action.variant === "primary" ? "default" : "outline"}
                                                            className="h-7 text-xs rounded-md px-3">
                                                            <Link href={action.href}>{action.label}</Link>
                                                        </Button>
                                                    ) : null
                                                ))}
                                            </div>
                                        )}
                                        {n.metadata?.link && (!notifActions || notifActions.length === 0) && (
                                            <div className="flex items-center gap-2 mt-3">
                                                <Button asChild size="sm" variant="outline" className="h-7 text-xs rounded-md px-3">
                                                    <Link href={n.metadata.link}>Open</Link>
                                                </Button>
                                            </div>
                                        )}
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
                            );
                        })}
                        <div ref={ref} className="h-16 flex items-center justify-center">
                            {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                        </div>
                    </>
                ) : (
                    <div className="text-center py-16 border rounded-lg">
                        <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                            {searchQuery ? "No notifications match your search." : "All caught up! No notifications yet."}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
