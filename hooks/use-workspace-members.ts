import { useQuery } from "@tanstack/react-query";

interface WorkspaceMember {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    imageUrl: string | null;
  };
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

  const memberMap: Record<string, WorkspaceMember> = {};
  for (const m of members) {
    memberMap[m.userId] = m;
    memberMap[m.user.id] = m;
  }

  return { members, memberMap, isLoading, error: error as Error | null };
}
