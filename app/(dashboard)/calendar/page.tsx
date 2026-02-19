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
            <div className="p-8 space-y-6">
                <Skeleton className="h-10 w-48 mb-6" />
                <Skeleton className="h-[600px] w-full rounded-2xl" />
            </div>
        );
    }

    const workspace = workspaces?.[0]; // Default to first workspace

    if (!workspace) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                Please create a workspace first.
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <CalendarView workspaceId={workspace.id} />
        </div>
    );
}
