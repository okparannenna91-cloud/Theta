"use client";

import { createContext, useContext } from "react";

interface Team {
  id: string;
  name: string;
  description: string | null;
  workspaceId: string;
  status?: string;
  userRole?: string;
  membersCount?: number;
  [key: string]: any;
}

interface TeamContextValue {
  team: Team;
}

const TeamContext = createContext<TeamContextValue | null>(null);

export function useTeam() {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error("useTeam must be used within TeamProvider");
  return ctx.team;
}

export function TeamProvider({ team, children }: { team: Team; children: React.ReactNode }) {
  return <TeamContext.Provider value={{ team }}>{children}</TeamContext.Provider>;
}
