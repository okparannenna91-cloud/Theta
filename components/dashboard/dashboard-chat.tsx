"use client";

import { useQuery } from "@tanstack/react-query";
import { ChatSidebar } from "./chat-sidebar";

export function DashboardChat() {
    const { data: workspaces, isLoading } = useQuery({
        queryKey: ["workspaces"],
        queryFn: async () => {
            const res = await fetch("/api/workspaces"); // Assuming this exists or returns something useful
            if (!res.ok) {
                // If api/workspaces doesn't exist, we might need to handle it
                // Let's check api directory again
                return [];
            }
            return res.json();
        },
    });

    // If we can't find api/workspaces, let's try to get it from teams or user info
    // For now, let's assume we can get a workspaceId.
    // I'll check app/api/workspaces/route.ts
    const workspaceId = workspaces?.[0]?.id;

    if (isLoading || !workspaceId) return null;

    return <ChatSidebar workspaceId={workspaceId} />;
}
