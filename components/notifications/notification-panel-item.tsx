"use client";

import { formatDistanceToNow } from "date-fns";
import {
    Bell, UserPlus, UserX, AtSign, MessageSquare, CheckCircle2,
    Clock, AlertTriangle, Calendar, ArrowUp, ArrowDown, Repeat,
    Sparkles, Brain, AlertCircle, FolderKanban, ListTodo, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const PRIORITY_DOT: Record<string, string> = {
    critical: "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]",
    medium: "bg-amber-500",
    low: "bg-slate-400",
};

function getIcon(type: string, className = "h-4 w-4") {
    const iconClass = `${className} shrink-0`;
    switch (type) {
        case "task_assigned": return <UserPlus className={`${iconClass} text-blue-500`} />;
        case "task_unassigned": return <UserX className={`${iconClass} text-slate-500`} />;
        case "task_mentioned":
        case "mention": return <AtSign className={`${iconClass} text-purple-500`} />;
        case "comment_reply":
        case "comment": return <MessageSquare className={`${iconClass} text-amber-500`} />;
        case "task_completed": return <CheckCircle2 className={`${iconClass} text-emerald-500`} />;
        case "task_reopened": return <RotateCw className={`${iconClass} text-orange-500`} />;
        case "task_due_soon":
        case "reminder": return <Clock className={`${iconClass} text-amber-500`} />;
        case "task_overdue":
        case "deadline": return <AlertTriangle className={`${iconClass} text-red-500`} />;
        case "project_deadline_approaching":
        case "sprint_ending": return <Calendar className={`${iconClass} text-indigo-500`} />;
        case "task_status_changed": return <ArrowUp className={`${iconClass} text-blue-500`} />;
        case "priority_changed": return <ArrowDown className={`${iconClass} text-orange-500`} />;
        case "dependency_blocked":
        case "dependency_unblocked": return <X className={`${iconClass} text-red-500`} />;
        case "recurring_task_created": return <Repeat className={`${iconClass} text-violet-500`} />;
        case "calendar_event_created":
        case "calendar_event_updated":
        case "calendar_event_starting_soon":
        case "calendar_event_missed": return <Calendar className={`${iconClass} text-blue-500`} />;
        case "daily_summary":
        case "weekly_summary": return <Sparkles className={`${iconClass} text-emerald-500`} />;
        case "nova_suggestion":
        case "smart_alert": return <Brain className={`${iconClass} text-violet-500`} />;
        case "limit_warning": return <AlertCircle className={`${iconClass} text-amber-500`} />;
        case "workspace_invite":
        case "team_invite":
        case "member_joined": return <UserPlus className={`${iconClass} text-green-500`} />;
        case "member_removed": return <UserX className={`${iconClass} text-red-500`} />;
        case "project_update":
        case "project_created":
        case "project_updated": return <FolderKanban className={`${iconClass} text-indigo-500`} />;
        default: return <Bell className={`${iconClass} text-muted-foreground`} />;
    }
}

function RotateCw(props: any) {
    return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;
}

interface NotificationPanelItemProps {
    notification: any;
}

export function NotificationPanelItem({ notification }: NotificationPanelItemProps) {
    const queryClient = useQueryClient();

    const markReadMutation = useMutation({
        mutationFn: async () => {
            await fetch(`/api/notifications?workspaceId=${notification.workspaceId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notificationId: notification.id, read: true }),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });

    return (
        <div
            className={cn(
                "p-4 transition-colors hover:bg-muted/30 cursor-pointer group relative",
                !notification.read && "bg-primary/[0.02]"
            )}
            onClick={() => { if (!notification.read) markReadMutation.mutate(); }}
        >
            <div className="flex gap-3">
                <div className="h-10 w-10 rounded-xl bg-muted/50 border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                            "text-xs font-semibold truncate",
                            !notification.read ? "text-foreground" : "text-muted-foreground"
                        )}>
                            {notification.title}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                            {notification.priority && (
                                <div className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[notification.priority] || "bg-slate-400")} />
                            )}
                            {!notification.read && (
                                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            )}
                        </div>
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                        {notification.message}
                    </p>
                    <p className="text-[10px] font-medium text-muted-foreground/60 pt-0.5">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                </div>
            </div>
        </div>
    );
}
