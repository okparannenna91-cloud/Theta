"use client";

import { useWorkspace } from "@/hooks/use-workspace";
import { CalendarView } from "@/components/calendar/calendar-view";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarPage() {
    const { activeWorkspace, isLoading } = useWorkspace();

    if (isLoading) {
        return (
            <div className="pb-10">
                <div className="mb-6">
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-[600px] w-full rounded-lg" />
            </div>
        );
    }

    if (!activeWorkspace) {
        return (
            <div className="text-center py-16 border rounded-lg">
                <p className="text-sm text-muted-foreground">Please create a workspace first.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-foreground">Calendar</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage your schedule and events
                </p>
            </div>
            <CalendarView workspaceId={activeWorkspace.id} />
        </div>
    );
}
