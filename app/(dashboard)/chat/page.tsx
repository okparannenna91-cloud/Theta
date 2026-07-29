"use client";

import React, { useState, useCallback } from "react";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { TeamChatEnhanced } from "@/components/teams/team-chat-enhanced";
import { useWorkspace } from "@/components/providers/workspace-provider";

export default function ChatPage() {
  const { activeWorkspace } = useWorkspace();
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveTeamId(id);
  }, []);

  if (!activeTeamId) {
    return (
      <div className="flex h-full w-full overflow-hidden">
        <div className="w-full md:w-[320px] shrink-0 flex flex-col border-r border-border/40">
          <ChatSidebar
            activeConversationId={null}
            onSelectConversation={handleSelectConversation}
          />
        </div>
        <div className="flex-1 hidden md:flex items-center justify-center text-muted-foreground/30">
          <div className="text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <svg className="h-7 w-7 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
              </svg>
            </div>
            <p className="text-sm font-medium">Select a conversation</p>
            <p className="text-xs mt-1">Choose a team from the sidebar to start chatting</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="w-[320px] shrink-0 hidden md:flex flex-col border-r border-border/40">
        <ChatSidebar
          activeConversationId={activeTeamId}
          onSelectConversation={handleSelectConversation}
        />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <TeamChatEnhanced key={activeTeamId} teamId={activeTeamId} workspaceId={activeWorkspace!.id} />
      </div>
    </div>
  );
}
