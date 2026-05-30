"use client";

import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, FolderKanban, Users, Bell as BellIcon, CreditCard, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface NotificationItemProps {
    notification: any;
    onRefresh: () => void;
}

export function NotificationItem({ notification, onRefresh }: NotificationItemProps) {
    const getIcon = (type: string) => {
        switch (type) {
            case "task_assigned":
            case "task_updated":
                return <CheckCircle2 className="h-5 w-5 text-blue-500" />;
            case "project_created":
            case "project_updated":
                return <FolderKanban className="h-5 w-5 text-purple-500" />;
            case "team_invite":
            case "team_joined":
                return <Users className="h-5 w-5 text-green-500" />;
            case "limit_warning":
                return <BellIcon className="h-5 w-5 text-yellow-500" />;
            case "payment_success":
            case "payment_failed":
                return <CreditCard className="h-5 w-5 text-orange-500" />;
            default:
                return <BellIcon className="h-5 w-5 text-gray-500" />;
        }
    };

    const handleMarkAsRead = async () => {
        try {
            const res = await fetch(`/api/notifications/${notification.id}`, {
                method: "PATCH",
            });

            if (!res.ok) throw new Error("Failed to mark as read");

            onRefresh();
        } catch (error) {
            toast.error("Failed to mark as read");
        }
    };

    const handleDelete = async () => {
        try {
            const res = await fetch(`/api/notifications/${notification.id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to delete");

            onRefresh();
            toast.success("Notification deleted");
        } catch (error) {
            toast.error("Failed to delete notification");
        }
    };

    return (
        <div
            className={cn(
                "p-4 hover:bg-accent transition-colors cursor-pointer group",
                !notification.read && "bg-blue-50 dark:bg-blue-950/20"
            )}
            onClick={handleMarkAsRead}
        >
            <div className="flex gap-3">
                <div className="flex-shrink-0 mt-1">
                    {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete();
                            }}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                </div>
                {!notification.read && (
                    <div className="flex-shrink-0">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                    </div>
                )}
            </div>
        </div>
    );
}
