"use client";

import React, { useState, useCallback } from "react";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { InboxSidebar } from "./inbox-sidebar";
import { InboxFeed } from "./inbox-feed";
import { InboxDm } from "./inbox-dm";

export type InboxTab = "all" | "unread" | "assigned" | "mentions" | "replies" | "direct-messages" | "archived";

export default function InboxPage() {
  const { activeWorkspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState<InboxTab>("all");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleTabChange = useCallback((tab: InboxTab) => {
    setActiveTab(tab);
    setMobileSidebarOpen(false);
    if (tab !== "direct-messages") {
      setActiveConversationId(null);
    }
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
  }, []);

  const handleBackFromDm = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  const isDmActive = activeTab === "direct-messages";

  return (
    <div className="flex h-full w-full overflow-hidden">
      <InboxSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        workspaceId={activeWorkspace?.id}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {isDmActive ? (
          <InboxDm
            workspaceId={activeWorkspace!.id}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onBack={handleBackFromDm}
            showNewMessage={showNewMessage}
            onShowNewMessageChange={setShowNewMessage}
            onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
          />
        ) : (
          <InboxFeed
            workspaceId={activeWorkspace!.id}
            activeTab={activeTab}
            onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
          />
        )}
      </div>
    </div>
  );
}
