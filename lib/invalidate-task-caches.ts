import { QueryClient } from "@tanstack/react-query";

interface InvalidateTaskCachesOptions {
    queryClient: QueryClient;
    workspaceId?: string | null;
    boardId?: string | null;
    projectId?: string | null;
}

export function invalidateTaskCaches({
    queryClient,
    workspaceId,
    boardId,
    projectId,
}: InvalidateTaskCachesOptions) {
    // Always invalidate all board queries (prefix match)
    queryClient.invalidateQueries({ queryKey: ["board"] });

    if (workspaceId) {
        // Invalidate workspace-scoped task queries
        queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
        queryClient.invalidateQueries({ queryKey: ["timeline-tasks", workspaceId] });
        queryClient.invalidateQueries({ queryKey: ["workspace-statuses", workspaceId] });
    }

    if (projectId) {
        // Invalidate project-scoped status queries
        queryClient.invalidateQueries({ queryKey: ["statuses", projectId] });
    }

    if (workspaceId && projectId) {
        // Invalidate project-scoped task queries
        queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId, "project", projectId] });
    }
}
