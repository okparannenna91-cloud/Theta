"use client";

import { useState, useCallback, useRef } from "react";
import type { Message } from "@/components/ai/nova/types";
import { useNovaStreaming } from "./useNovaStreaming";

export function useNovaChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "nova", content: "Hey! I'm Nova. I've got eyes on your workspace — what do you need?", timestamp: new Date() },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const lastPromptRef = useRef("");
  const { isStreaming, streamResponse } = useNovaStreaming();

  const clearChat = useCallback(() => {
    setMessages([{ role: "nova", content: "Chat cleared. What's next on our list?", timestamp: new Date() }]);
  }, []);

  const appendUserMessage = useCallback((content: string, attachments?: Message["attachments"]) => {
    setMessages((prev) => [...prev, { role: "user", content, timestamp: new Date(), attachments }]);
  }, []);

  const appendNovaMessage = useCallback((content: string) => {
    setMessages((prev) => [...prev, { role: "nova", content, timestamp: new Date() }]);
  }, []);

  const updateLastNovaMessage = useCallback((content: string) => {
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last && last.role === "nova") next[next.length - 1] = { ...last, content };
      return next;
    });
  }, []);

  const sendMessage = useCallback(
    async (opts: { workspaceId: string; conversationId: string | null; projectId?: string; pageContext?: { path: string; type: string }; onUsageUpdate?: () => void }) => {
      const currentInput = input.trim();
      if (!currentInput || isLoading) return;

      appendUserMessage(currentInput);
      const savedInput = currentInput;
      setInput("");
      lastPromptRef.current = savedInput;
      setIsLoading(true);

      let firstChunk = true;
      await streamResponse({
        prompt: savedInput,
        workspaceId: opts.workspaceId,
        conversationId: opts.conversationId,
        projectId: opts.projectId,
        pageContext: opts.pageContext,
        onChunk: (content) => {
          if (firstChunk) { firstChunk = false; appendNovaMessage(content); }
          else updateLastNovaMessage(content);
        },
        onComplete: () => {},
        onError: (error) => appendNovaMessage(error),
      });

      opts.onUsageUpdate?.();
      setIsLoading(false);
    },
    [input, isLoading, appendUserMessage, appendNovaMessage, updateLastNovaMessage, streamResponse]
  );

  return { messages, setMessages, input, setInput, isLoading, isStreaming, lastPromptRef, clearChat, sendMessage };
}
