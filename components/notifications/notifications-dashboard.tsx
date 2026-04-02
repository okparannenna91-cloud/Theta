"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, Trash2, AtSign, CheckCircle2, MessageSquare, AlertTriangle, ListTodo, FolderKanban } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";

export default function NotificationsDashboard() {
    const { activeWorkspaceId } = useWorkspace();
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState("all");

    // Basic Polling System (every 15 seconds)
    const { data: notificationsData, isLoading } = useQuery({
        queryKey: ["notifications", activeWorkspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/notifications?workspaceId=${activeWorkspaceId}`);
            if (!res.ok) throw new Error("Failed to fetch");
            return res.json();
        },
        enabled: !!activeWorkspaceId,
        refetchInterval: 15000 
    });

    // ✅ Nuclear fix: safely extract the array from the API response shape
    const notifications = useMemo(() => {
        return Array.isArray(notificationsData?.notifications) 
            ? notificationsData.notifications 
            : Array.isArray(notificationsData) 
            ? notificationsData 
            : [];
    }, [notificationsData]);

    const markReadMutation = useMutation({
        mutationFn: async ({ notificationId, markAllAsRead }: { notificationId?: string, markAllAsRead?: boolean }) => {
            const res = await fetch(`/api/notifications?workspaceId=${activeWorkspaceId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notificationId, markAllAsRead })
            });
            if (!res.ok) throw new Error("Update failed");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications", activeWorkspaceId] });
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

    const filteredNotifications = useMemo(() => {
        if (!Array.isArray(notifications)) return [];
        if (filter === "unread") return notifications.filter((n: any) => !n.read);
        if (filter === "mentions") return notifications.filter((n: any) => n.type === "mention");
        if (filter === "tasks") return notifications.filter((n: any) => n.type.includes("task"));
        return notifications;
    }, [notifications, filter]);

    const handleMarkAllRead = () => {
        markReadMutation.mutate({ markAllAsRead: true });
        toast.success("All notifications marked as read");
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case "task_assigned": return <ListTodo className="h-5 w-5 text-blue-500" />;
            case "task_completed": return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
            case "mention": return <AtSign className="h-5 w-5 text-purple-500" />;
            case "comment": return <MessageSquare className="h-5 w-5 text-amber-500" />;
            case "deadline": return <AlertTriangle className="h-5 w-5 text-red-500" />;
            case "project_update": return <FolderKanban className="h-5 w-5 text-indigo-500" />;
            default: return <Bell className="h-5 w-5 text-slate-500" />;
        }
    };

    if (isLoading) {
        return (
            <div className="p-8 max-w-4xl mx-auto space-y-4">
                <Skeleton className="h-10 w-64 mb-8" />
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
            </div>
        );
    }

    const unreadCount = Array.isArray(notifications) 
        ? notifications.filter((n: any) => !n.read).length 
        : 0;

    return (
        <div className="p-4 sm:p-6 lg:p-10 max-w-4xl mx-auto space-y-8 pb-20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
                        <Bell className="h-8 w-8 text-primary" />
                        Command Center
                    </h1>
                    <p className="text-muted-foreground font-medium mt-1">
                        You have <span className="font-bold text-slate-900 dark:text-white">{unreadCount}</span> unread notifications.
                    </p>
                </div>

                <Button 
                    variant="outline" 
                    onClick={handleMarkAllRead}
                    disabled={unreadCount === 0 || markReadMutation.isPending}
                    className="rounded-full shadow-sm font-bold uppercase tracking-widest text-[10px]"
                >
                    <Check className="h-4 w-4 mr-2" />
                    Mark All Read
                </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                {["all", "unread", "mentions", "tasks"].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            filter === f 
                            ? "bg-white dark:bg-slate-800 shadow-sm text-primary" 
                            : "text-muted-foreground hover:bg-white/50 dark:hover:bg-slate-800/50"
                        }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            <Card className="border-none shadow-xl border border-slate-200/50 dark:border-slate-800/50 rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
                <CardContent className="p-0">
                    <AnimatePresence mode="popLayout">
                        {filteredNotifications.length > 0 ? (
                            filteredNotifications.map((notification: any, i: number) => (
                                <motion.div
                                    key={notification.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2, delay: i * 0.05 }}
                                    className={`relative flex items-start gap-4 p-6 transition-colors border-b border-slate-100 last:border-0 dark:border-slate-800 group hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!notification.read ? "bg-indigo-50/50 dark:bg-indigo-900/10" : ""}`}
                                >
                                    {!notification.read && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-primary rounded-r-full" />
                                    )}

                                    <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                                        {getIconForType(notification.type)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 mb-1">
                                            <h4 className={`text-sm tracking-tight ${!notification.read ? 'font-black' : 'font-bold text-slate-600 dark:text-slate-300'}`}>
                                                {notification.title}
                                            </h4>
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground shrink-0 whitespace-nowrap">
                                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {notification.message}
                                        </p>
                                        
                                        {notification.metadata?.link && (
                                            <Link href={notification.metadata.link} className="inline-block mt-3 text-xs font-bold uppercase tracking-widest text-primary hover:underline">
                                                View Details →
                                            </Link>
                                        )}
                                    </div>

                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                        {!notification.read && (
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => markReadMutation.mutate({ notificationId: notification.id })}
                                                className="h-8 w-8 text-muted-foreground hover:text-emerald-500"
                                            >
                                                <Check className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => deleteMutation.mutate(notification.id)}
                                            className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center p-20 text-center">
                                <div className="h-20 w-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
                                    <Bell className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                                </div>
                                <h3 className="text-xl font-black uppercase tracking-tight mb-2">You&apos;re All Caught Up</h3>
                                <p className="text-muted-foreground font-medium">When your team assigns tasks or mentions you, they&apos;ll appear here.</p>
                            </div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card>
        </div>
    );
}
