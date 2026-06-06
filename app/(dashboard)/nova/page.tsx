"use client";

import React, { useState } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { NovaSidebar } from "@/components/ai/nova-sidebar";
import { NovaChatView } from "@/components/ai/nova-chat-view";

export default function NovaPage() {
    const { activeWorkspaceId } = useWorkspace();
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

    const handleNewChat = async () => {
        if (!activeWorkspaceId) return;

        try {
            const res = await fetch("/api/ai/conversations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workspaceId: activeWorkspaceId,
                    title: "New Conversation"
                })
            });

            if (res.ok) {
                const data = await res.json();
                setActiveConversationId(data.id);
                // Refresh sidebar will happen via re-render if we use a shared state or event
                // For now, let's just set the ID and the sidebar will fetch on mount or we can force it
                window.location.reload(); // Simple way to refresh sidebar for now
            }
        } catch (error) {
            console.error("Failed to create new chat");
        }
    };

    if (!activeWorkspaceId) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 rounded-lg bg-muted animate-pulse mx-auto" />
                    <p className="text-sm text-muted-foreground">Select a workspace to use Nova</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-9.5rem)] w-[calc(100%+4rem)] -ml-8 -mt-2 overflow-hidden border-t border-slate-200 dark:border-slate-800">
            <NovaSidebar 
                activeConversationId={activeConversationId}
                onSelectConversation={setActiveConversationId}
                onNewChat={handleNewChat}
            />
            <NovaChatView 
                conversationId={activeConversationId}
                workspaceId={activeWorkspaceId}
            />
        </div>
    );
}
