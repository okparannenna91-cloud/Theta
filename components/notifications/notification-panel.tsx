"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { NotificationItem } from "@/components/notifications/notification-item";
import { CheckCheck, Bell } from "lucide-react";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

interface NotificationPanelProps {
    notifications: any[];
    onRefresh: () => void;
    onClearUnread: () => void;
}

export function NotificationPanel({ notifications, onRefresh, onClearUnread }: NotificationPanelProps) {
    const { activeWorkspaceId } = useWorkspace();

    const handleMarkAllAsRead = async () => {
        try {
            const res = await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workspaceId: activeWorkspaceId }),
            });

            if (!res.ok) throw new Error("Failed to mark as read");

            onClearUnread();
            onRefresh();
            toast.success("All notifications marked as read");
        } catch (error) {
            toast.error("Failed to mark notifications as read");
        }
    };

    const unreadNotifications = notifications.filter(n => !n.read);

    return (
        <div className="flex flex-col h-[400px]">
            <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold">Notifications</h3>
                {unreadNotifications.length > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMarkAllAsRead}
                        className="h-8 text-xs"
                    >
                        <CheckCheck className="h-4 w-4 mr-1" />
                        Mark all read
                    </Button>
                )}
            </div>

            <ScrollArea className="flex-1">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                        <div className="rounded-full bg-muted p-4 mb-4">
                            <Bell className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">No notifications yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            We&apos;ll notify you when something happens
                        </p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {notifications.map((notification) => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onRefresh={onRefresh}
                            />
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
