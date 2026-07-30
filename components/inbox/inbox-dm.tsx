"use client";

import React from "react";
import { DmSidebar } from "@/components/chat/dm-sidebar";
import { DmChat } from "@/components/chat/dm-chat";
import { DmNewMessage } from "@/components/chat/dm-new-message";
import { cn } from "@/lib/utils";

interface InboxDmProps {
  workspaceId: string;
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onBack: () => void;
  showNewMessage: boolean;
  onShowNewMessageChange: (v: boolean) => void;
}

export function InboxDm({
  workspaceId,
  activeConversationId,
  onSelectConversation,
  onBack,
  showNewMessage,
  onShowNewMessageChange,
}: InboxDmProps) {
  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className={cn(
        "w-[300px] shrink-0 flex-col border-r border-border/40 bg-background",
        activeConversationId ? "hidden md:flex" : "flex"
      )}>
        <div className="px-4 pt-4 pb-1">
          <h2 className="text-[14px] font-semibold tracking-tight text-foreground">Direct Messages</h2>
        </div>
        <div className="flex-1 overflow-hidden">
          <DmSidebar
            activeConversationId={activeConversationId}
            onSelectConversation={onSelectConversation}
            onNewMessage={() => onShowNewMessageChange(true)}
          />
        </div>
      </div>

      <div className={cn(
        "flex-1 flex flex-col min-w-0",
        !activeConversationId && "hidden md:flex"
      )}>
        {activeConversationId ? (
          <DmChat
            key={activeConversationId}
            conversationId={activeConversationId}
            workspaceId={workspaceId}
            onBack={onBack}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground/30">
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
        )}
      </div>

      <DmNewMessage
        open={showNewMessage}
        onOpenChange={onShowNewMessageChange}
        onSelectUser={onSelectConversation}
      />
    </div>
  );
}
