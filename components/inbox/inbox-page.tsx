"use client";

import React, { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { InboxFeed } from "./inbox-feed";
import { InboxDm } from "./inbox-dm";

export type InboxTab = "all" | "unread" | "assigned" | "mentions" | "replies" | "direct-messages" | "archived";

export default function InboxPage() {
  const { activeWorkspace } = useWorkspace();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as InboxTab | null;

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showNewMessage, setShowNewMessage] = useState(false);

  const activeTab: InboxTab = tabParam && ["all", "unread", "assigned", "mentions", "replies", "direct-messages", "archived"].includes(tabParam)
    ? tabParam
    : "all";

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
  }, []);

  const handleBackFromDm = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  const isDmActive = activeTab === "direct-messages";

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {isDmActive ? (
          <InboxDm
            workspaceId={activeWorkspace!.id}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onBack={handleBackFromDm}
            showNewMessage={showNewMessage}
            onShowNewMessageChange={setShowNewMessage}
          />
        ) : (
          <InboxFeed
            workspaceId={activeWorkspace!.id}
            activeTab={activeTab}
          />
        )}
      </div>
    </div>
  );
}
