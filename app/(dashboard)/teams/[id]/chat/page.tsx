"use client";

import { useTeam } from "@/components/teams/team-context";
import { TeamChatEnhanced } from "@/components/teams/team-chat-enhanced";

export default function TeamChatPage() {
  const team = useTeam();

  return <TeamChatEnhanced teamId={team.id} workspaceId={team.workspaceId} />;
}
