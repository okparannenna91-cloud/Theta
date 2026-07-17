"use client";

import { useState, useCallback } from "react";
import type { Conversation, Message } from "@/components/ai/nova/types";

export function useNovaConversations(workspaceId: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/conversations?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const createConversation = useCallback(async (): Promise<string | null> => {
    if (!workspaceId) return null;
    try {
      const res = await fetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, title: "New Conversation" }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.id;
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
    return null;
  }, [workspaceId]);

  const fetchMessages = useCallback(
    async (conversationId: string): Promise<Message[]> => {
      try {
        const res = await fetch(`/api/ai/conversations/${conversationId}?workspaceId=${workspaceId}`);
        if (res.ok) {
          const data = await res.json();
          return (data.messages || []).map((m: any) => ({
            role: m.role === "assistant" ? "nova" : "user",
            content: m.content,
            timestamp: new Date(m.createdAt),
            id: m.id,
          }));
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      }
      return [];
    },
    [workspaceId]
  );

  return {
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversationId,
    loading,
    fetchConversations,
    createConversation,
    fetchMessages,
  };
}
