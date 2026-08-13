import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

interface WorkspaceMember {
  id: string;
  name: string | null;
  email: string;
  imageUrl: string | null;
  role: string;
}

interface UseWorkspaceMembersResult {
  members: WorkspaceMember[];
  memberMap: Record<string, WorkspaceMember>;
  isLoading: boolean;
  error: Error | null;
}

export function useWorkspaceMembers(workspaceId: string | null): UseWorkspaceMembersResult {
  const { data: members = [], isLoading, error } = useQuery<WorkspaceMember[]>({
    queryKey: ["workspace-members", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const res = await fetch(`/api/workspaces/${workspaceId}/members`);
      if (!res.ok) throw new Error("Failed to fetch workspace members");
      return res.json();
    },
    enabled: !!workspaceId,
  });

  const memberMap = useMemo(() => {
    const map: Record<string, WorkspaceMember> = {};
    for (const m of members) {
      map[m.id] = m;
    }
    return map;
  }, [members]);

  return { members, memberMap, isLoading, error: error as Error | null };
}
