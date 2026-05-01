"use client";

import { useState, useMemo, useEffect } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { motion, AnimatePresence } from "framer-motion";
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
    Search,
    Loader2,
    Calendar,
    ChevronDown,
    Filter,
    ShieldAlert
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuSeparator
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

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        refetch
    } = useInfiniteQuery({
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
        refetchInterval: 30000 // Polling every 30s
    });

    useEffect(() => {
        if (inView && hasNextPage) {
            fetchNextPage();
        }
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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications", activeWorkspaceId] });
        }
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
            toast.success("All notifications marked as read");
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
            case "system": return <ShieldAlert className="h-5 w-5 text-rose-500" />;
            default: return <Bell className="h-5 w-5 text-slate-500" />;
        }
    };

    return (
        <div className="flex h-screen bg-white dark:bg-slate-950">
            {/* Sidebar Filters */}
            <div className="w-80 border-r border-slate-100 dark:border-slate-800 hidden lg:flex flex-col p-6 space-y-8 bg-slate-50/30 dark:bg-slate-900/10">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                        <Bell className="h-6 w-6 text-indigo-600" />
                        Alerts
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Intelligence Command Hub</p>
                </div>

                <div className="space-y-1">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all group ${
                                activeTab === tab.id 
                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? "text-white" : "group-hover:text-indigo-600"}`} />
                                <span className="text-xs font-black uppercase tracking-widest">{tab.label}</span>
                            </div>
                            {tab.id === "unread" && unreadCount > 0 && (
                                <Badge className={`text-[10px] h-5 min-w-[20px] justify-center ${activeTab === tab.id ? "bg-white text-indigo-600" : "bg-indigo-600 text-white"}`}>
                                    {unreadCount}
                                </Badge>
                            )}
                        </button>
                    ))}
                </div>

                <div className="pt-8 mt-auto border-t border-slate-100 dark:border-slate-800">
                    <div className="p-4 rounded-[2rem] bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-2">Smart Grouping</p>
                        <p className="text-[9px] font-bold text-indigo-600/70 leading-relaxed uppercase tracking-wider">
                            We cluster related updates to keep your workspace clean and focused.
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-20 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-8 bg-white dark:bg-slate-950 z-10">
                    <div className="flex items-center gap-4">
                        <div className="lg:hidden">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="rounded-xl font-black uppercase tracking-widest text-[10px]">
                                        {activeTab} <ChevronDown className="ml-2 h-3 w-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-56 rounded-2xl p-2">
                                    {TABS.map(tab => (
                                        <DropdownMenuItem 
                                            key={tab.id} 
                                            onClick={() => setActiveTab(tab.id)}
                                            className="rounded-xl px-4 py-2 font-black uppercase tracking-widest text-[10px]"
                                        >
                                            <tab.icon className="mr-3 h-4 w-4" /> {tab.label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <h1 className="text-lg font-black uppercase tracking-widest hidden sm:block">
                            {TABS.find(t => t.id === activeTab)?.label}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="rounded-xl font-black uppercase tracking-widest text-[10px] text-slate-500 hover:text-indigo-600"
                            onClick={() => markAllReadMutation.mutate()}
                            disabled={unreadCount === 0 || markAllReadMutation.isPending}
                        >
                            <Check className="h-4 w-4 mr-2" />
                            Mark All Read
                        </Button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8">
                    <div className="max-w-4xl mx-auto space-y-4">
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="h-24 w-full bg-slate-50 dark:bg-slate-900 animate-pulse rounded-[2rem]" />
                            ))
                        ) : notifications.length > 0 ? (
                            <>
                                <AnimatePresence mode="popLayout">
                                    {notifications.map((n: any, i) => (
                                        <motion.div
                                            key={n.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ delay: i * 0.05 }}
                                            className={`group relative flex items-start gap-5 p-6 rounded-[2.5rem] border transition-all hover:shadow-xl hover:shadow-indigo-500/5 ${
                                                !n.read 
                                                ? "bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900/50 shadow-md ring-1 ring-indigo-500/10" 
                                                : "bg-slate-50/50 dark:bg-slate-900/20 border-slate-200/50 dark:border-slate-800/50"
                                            }`}
                                        >
                                            {!n.read && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-indigo-600 rounded-r-full shadow-[2px_0_10px_rgba(79,70,229,0.4)]" />
                                            )}

                                            <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-inner border border-slate-100 dark:border-slate-800 shrink-0 group-hover:scale-110 transition-transform">
                                                {getIconForType(n.type)}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className={`text-sm tracking-tight truncate ${!n.read ? "font-black" : "font-bold text-slate-600 dark:text-slate-400"}`}>
                                                            {n.title}
                                                        </h3>
                                                        {n.pinned && <Pin className="h-3 w-3 text-indigo-600 rotate-45" />}
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 shrink-0">
                                                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground font-medium line-clamp-2 leading-relaxed">
                                                    {n.message}
                                                </p>
                                                
                                                <div className="flex items-center gap-3 mt-4">
                                                    {n.metadata?.link && (
                                                        <Button asChild size="sm" variant="outline" className="h-8 rounded-xl px-4 font-black uppercase tracking-widest text-[9px] border-slate-200/50 bg-white dark:bg-slate-900 shadow-sm">
                                                            <Link href={n.metadata.link}>Open Resource</Link>
                                                        </Button>
                                                    )}
                                                    {/* Inline Actions */}
                                                    {!n.read && n.type === "task_assigned" && (
                                                        <Button size="sm" variant="ghost" className="h-8 rounded-xl text-emerald-600 font-black uppercase tracking-widest text-[9px] hover:bg-emerald-50 dark:hover:bg-emerald-900/10">
                                                            Accept Task
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white dark:bg-slate-800 shadow-sm">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2">
                                                        {!n.read && (
                                                            <DropdownMenuItem 
                                                                className="rounded-xl px-4 py-2 font-black uppercase tracking-widest text-[9px]"
                                                                onClick={() => updateMutation.mutate({ id: n.id, read: true })}
                                                            >
                                                                <Check className="mr-3 h-4 w-4 text-emerald-500" /> Mark as Read
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem 
                                                            className="rounded-xl px-4 py-2 font-black uppercase tracking-widest text-[9px]"
                                                            onClick={() => updateMutation.mutate({ id: n.id, pinned: !n.pinned })}
                                                        >
                                                            <Pin className="mr-3 h-4 w-4 text-indigo-500" /> {n.pinned ? "Unpin" : "Pin Alert"}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem 
                                                            className="rounded-xl px-4 py-2 font-black uppercase tracking-widest text-[9px]"
                                                            onClick={() => updateMutation.mutate({ id: n.id, archived: !n.archived })}
                                                        >
                                                            <Archive className="mr-3 h-4 w-4 text-slate-500" /> {n.archived ? "Restore" : "Archive"}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="my-2" />
                                                        <DropdownMenuItem 
                                                            className="rounded-xl px-4 py-2 font-black uppercase tracking-widest text-[9px] text-rose-500 focus:text-rose-500"
                                                            onClick={() => deleteMutation.mutate(n.id)}
                                                        >
                                                            <Trash2 className="mr-3 h-4 w-4" /> Delete Permanently
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {/* Intersection Observer for Infinite Scroll */}
                                <div ref={ref} className="h-20 flex items-center justify-center">
                                    {isFetchingNextPage && <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-20 text-center bg-slate-50/50 dark:bg-slate-900/50 rounded-[4rem] border-4 border-dashed border-slate-100 dark:border-slate-800">
                                <div className="h-24 w-24 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl flex items-center justify-center mb-8 rotate-12 transition-transform hover:rotate-0">
                                    <Bell className="h-10 w-10 text-slate-200 dark:text-slate-700" />
                                </div>
                                <h3 className="text-3xl font-black uppercase tracking-tight mb-4">Zero Signal</h3>
                                <p className="text-slate-500 font-bold max-w-sm uppercase tracking-widest text-[10px] leading-relaxed">
                                    Your intelligence feed is clear. Take this moment to deep dive into your projects.
                                </p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
