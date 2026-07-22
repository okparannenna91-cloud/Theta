"use client";

import { useQuery } from "@tanstack/react-query";

export interface Status {
    id: string;
    name: string;
    color: string | null;
    order: number;
    projectId: string;
    workspaceId: string;
}

async function fetchStatuses(workspaceId: string, projectId: string): Promise<Status[]> {
    const res = await fetch(`/api/workspaces/${workspaceId}/statuses?projectId=${projectId}`);
    if (!res.ok) throw new Error("Failed to fetch statuses");
    return res.json();
}

async function fetchWorkspaceStatuses(workspaceId: string): Promise<Status[]> {
    const res = await fetch(`/api/workspaces/${workspaceId}/statuses-all`);
    if (!res.ok) throw new Error("Failed to fetch statuses");
    return res.json();
}

export function useStatuses(workspaceId: string | null | undefined, projectId: string | null | undefined) {
    return useQuery({
        queryKey: ["statuses", workspaceId, projectId],
        queryFn: () => fetchStatuses(workspaceId!, projectId!),
        enabled: !!workspaceId && !!projectId,
        staleTime: 30_000,
    });
}

export function useWorkspaceStatuses(workspaceId: string | null | undefined) {
    return useQuery({
        queryKey: ["workspace-statuses", workspaceId],
        queryFn: () => fetchWorkspaceStatuses(workspaceId!),
        enabled: !!workspaceId,
        staleTime: 30_000,
    });
}

export function getStatusValue(statusName: string): string {
    return statusName.toLowerCase().replace(/\s+/g, "_");
}

export function getStatusDisplayName(statusValue: string): string {
    return statusValue
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const FALLBACK_STATUSES = [
    { id: "todo", name: "To Do", color: "#64748b", order: 0 },
    { id: "in_progress", name: "In Progress", color: "#3b82f6", order: 1 },
    { id: "done", name: "Done", color: "#22c55e", order: 2 },
];
