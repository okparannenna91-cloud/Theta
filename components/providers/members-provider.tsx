"use client";

import { createContext, useContext, ReactNode } from "react";
import { useWorkspaceMembers } from "@/hooks/use-workspace-members";
import { useWorkspace } from "@/hooks/use-workspace";

interface MembersContextValue {
  memberMap: Record<string, { user: { id: string; name: string | null; imageUrl: string | null } }>;
}

const MembersContext = createContext<MembersContextValue>({ memberMap: {} });

export function MembersProvider({ children }: { children: ReactNode }) {
  const { activeWorkspaceId } = useWorkspace();
  const { memberMap } = useWorkspaceMembers(activeWorkspaceId);
  return <MembersContext.Provider value={{ memberMap }}>{children}</MembersContext.Provider>;
}

export function useMemberMap() {
  return useContext(MembersContext).memberMap;
}
