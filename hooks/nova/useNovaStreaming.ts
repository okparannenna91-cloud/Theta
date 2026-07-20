"use client";

import { useCallback, useState, useRef } from "react";
import type { Message } from "@/components/ai/nova/types";
import type { FileAttachment } from "@/lib/nova/file-upload";

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
      attachments,
      onToken,
      onToolStart,
      onToolEnd,
      onComplete,
      onError,
    }: {
      prompt: string;
      workspaceId: string;
      conversationId: string | null;
      projectId?: string;
      pageContext?: { path: string; type: string };
      attachments?: FileAttachment[];
      onToken: (token: string) => void;
      onToolStart?: (tools: string[], iteration: number) => void;
      onToolEnd?: (tool: string, success: boolean) => void;
      onComplete: (fullResponse: string, metadata: { provider: string; model: string; route: string; durationMs: number }) => void;
      onError: (error: string) => void;
    }) => {
      const controller = new AbortController();
      abortRef.current = controller;
      const timeout = setTimeout(() => controller.abort("timeout"), 55000);

      try {
        const body: Record<string, unknown> = { prompt, workspaceId, conversationId: conversationId || undefined, projectId, context: pageContext };
        if (attachments && attachments.length > 0) {
          body.attachments = attachments;
        }

        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Request failed (${res.status})`);
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        setIsStreaming(true);

        if (reader) {
          let buffer = "";
          let metadata: any = null;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            let eventType = "";
            for (const line of lines) {
              if (line.startsWith("event: ")) {
                eventType = line.slice(7).trim();
              } else if (line.startsWith("data: ")) {
                const data = line.slice(6);

                switch (eventType) {
                  case "start":
                    metadata = JSON.parse(data);
                    break;
                  case "token":
                    onToken(data);
                    break;
                  case "tool_start":
                    if (onToolStart) {
                      const parsed = JSON.parse(data);
                      onToolStart(parsed.tools, parsed.iteration);
                    }
                    break;
                  case "tool_end":
                    if (onToolEnd) {
                      const parsed = JSON.parse(data);
                      onToolEnd(parsed.tool, parsed.success);
                    }
                    break;
                  case "done":
                    const result = JSON.parse(data);
                    onComplete(result.response, {
                      provider: metadata?.provider || "unknown",
                      model: metadata?.model || "unknown",
                      route: result.route || "CHAT",
                      durationMs: result.durationMs || 0,
                    });
                    break;
                  case "error":
                    const errData = JSON.parse(data);
                    onError(errData.message);
                    break;
                }

                eventType = "";
              }
            }
          }
        }
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
