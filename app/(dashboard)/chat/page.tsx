"use client";

import React, { useState, useCallback } from "react";
import { DmSidebar } from "@/components/chat/dm-sidebar";
import { DmChat } from "@/components/chat/dm-chat";
import { DmNewMessage } from "@/components/chat/dm-new-message";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const { activeWorkspace } = useWorkspace();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [mobileConversationOpen, setMobileConversationOpen] = useState(false);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    setMobileConversationOpen(true);
  }, []);

  const handleBack = useCallback(() => {
    setMobileConversationOpen(false);
  }, []);

  const handleNewMessageSelect = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
    setMobileConversationOpen(true);
  }, []);

  if (!activeConversationId) {
    return (
      <div className="flex h-full w-full overflow-hidden">
        <div className="w-full md:w-[320px] shrink-0 flex flex-col border-r border-border/40">
          <DmSidebar
            activeConversationId={null}
            onSelectConversation={handleSelectConversation}
            onNewMessage={() => setShowNewMessage(true)}
          />
        </div>
        <div className="flex-1 hidden md:flex items-center justify-center text-muted-foreground/30">
          <div className="text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <svg className="h-7 w-7 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium">Select a conversation</p>
            <p className="text-xs mt-1">Choose someone from the sidebar to start chatting</p>
          </div>
        </div>

        <DmNewMessage
          open={showNewMessage}
          onOpenChange={setShowNewMessage}
          onSelectUser={handleNewMessageSelect}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className={cn(
        "w-[320px] shrink-0 flex-col border-r border-border/40",
        mobileConversationOpen ? "hidden md:flex" : "flex"
      )}>
        <DmSidebar
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewMessage={() => setShowNewMessage(true)}
        />
      </div>
      <div className={cn(
        "flex-1 flex flex-col min-w-0",
        !mobileConversationOpen && "hidden md:flex"
      )}>
        <DmChat
          key={activeConversationId}
          conversationId={activeConversationId}
          workspaceId={activeWorkspace!.id}
          onBack={handleBack}
        />
      </div>

      <DmNewMessage
        open={showNewMessage}
        onOpenChange={setShowNewMessage}
        onSelectUser={handleNewMessageSelect}
      />
    </div>
  );
}
