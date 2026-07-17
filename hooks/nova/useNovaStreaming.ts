"use client";

import { useCallback, useState, useRef } from "react";
import type { Message } from "@/components/ai/nova/types";

export function useNovaStreaming() {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const streamResponse = useCallback(
    async ({
      prompt,
      workspaceId,
      conversationId,
      projectId,
      pageContext,
      onChunk,
      onComplete,
      onError,
    }: {
      prompt: string;
      workspaceId: string;
      conversationId: string | null;
      projectId?: string;
      pageContext?: { path: string; type: string };
      onChunk: (content: string) => void;
      onComplete: () => void;
      onError: (error: string) => void;
    }) => {
      const controller = new AbortController();
      abortRef.current = controller;
      const timeout = setTimeout(() => controller.abort("timeout"), 55000);

      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, workspaceId, conversationId: conversationId || undefined, projectId, context: pageContext }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Request failed (${res.status})`);
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        let messageAppended = false;

        setIsStreaming(true);

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            accumulated += decoder.decode(value, { stream: true });
            if (!messageAppended) { messageAppended = true; onComplete(); }
            onChunk(accumulated);
          }
        }

        if (!messageAppended) onChunk(accumulated || "Nova could not generate a response.");
      } catch (error: unknown) {
        const err = error as { name?: string; message?: string };
        const isAbort = err?.name === "AbortError" || err?.message?.includes("abort") || err?.message?.includes("timeout");
        onError(isAbort ? "The request took too long. Please try a simpler query or try again." : err?.message || "Nova is having trouble connecting.");
      } finally {
        clearTimeout(timeout);
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    []
  );

  return { isStreaming, streamResponse };
}
