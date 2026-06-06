"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarView } from "@/components/calendar/calendar-view";
import { Skeleton } from "@/components/ui/skeleton";

async function fetchWorkspaces() {
    const res = await fetch("/api/workspaces");
    if (!res.ok) throw new Error("Failed to fetch workspaces");
    return res.json();
}

export default function CalendarPage() {
    const { data: workspaces, isLoading } = useQuery({
        queryKey: ["workspaces"],
        queryFn: fetchWorkspaces,
    });

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

    const workspace = workspaces?.[0];

    if (!workspace) {
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
            <CalendarView workspaceId={workspace.id} />
        </div>
    );
}
