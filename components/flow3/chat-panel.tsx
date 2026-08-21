"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Menu, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { HistoryRail, ConversationSummary } from "./history-rail";
import { MessageBubble } from "./message-bubble";
import { Composer } from "./composer";
import { TaskTimeline, TimelineStep } from "./task-timeline";
import { ConfirmationCard } from "./confirmation-card";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string;
}

interface PendingConfirmation {
  token: string;
  reason: string;
  toolName: string;
  args: Record<string, unknown>;
}

const SUGGESTIONS = [
  "Summarize my week",
  "What tasks are at risk?",
  "Draft a project status update",
  "Which tasks are overdue?",
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function Flow3ChatPanel() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [steps, setSteps] = useState<TimelineStep[]>([]);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [railOpen, setRailOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/nova/conversations");
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {}
  }, []);

  useEffect(() => {
    loadConversations().finally(() => setIsBooting(false));
  }, [loadConversations]);

  const openConversation = useCallback(
    async (id: string) => {
      setActiveId(id);
      setRailOpen(false);
      setPendingConfirmation(null);
      setSteps([]);
      setIsLoadingMessages(true);
      try {
        const res = await fetch(`/api/nova/conversations/${id}?messages=true`);
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setMessages(
          (data.messages || []).map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
          }))
        );
        scrollToBottom();
      } catch {
        setMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [scrollToBottom]
  );

  const newChat = useCallback(() => {
    abortRef.current?.abort();
    setActiveId(null);
    setMessages([]);
    setSteps([]);
    setPendingConfirmation(null);
    setRailOpen(false);
  }, []);

  const renameConversation = useCallback(async (id: string, title: string) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
    await fetch(`/api/nova/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }).catch(() => {});
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeIdRef.current === id) newChat();
      await fetch(`/api/nova/conversations/${id}`, { method: "DELETE" }).catch(() => {});
    },
    [newChat]
  );

  const togglePin = useCallback(async (id: string, isPinned: boolean) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, isPinned } : c)));
    await fetch(`/api/nova/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned }),
    }).catch(() => {});
  }, []);

  const send = useCallback(
    async (text: string) => {
      if (isStreaming) return;

      const userMsg: ChatMessage = { id: makeId(), role: "user", content: text };
      const assistantId = makeId();
      setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", content: "" }]);
      setIsStreaming(true);
      setPendingConfirmation(null);
      setSteps([]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/flow3/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: text, conversationId: activeIdRef.current || undefined }),
          signal: controller.signal,
        });

        if (!res.ok) {
          let errorMsg = "Something went wrong on my end. Give it another shot.";
          try {
            const data = await res.json();
            if (data?.error) errorMsg = data.error;
          } catch {}
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: errorMsg } : m))
          );
          setIsStreaming(false);
          return;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const handleEvent = (type: string, data: any) => {
          switch (type) {
            case "meta": {
              if (data.conversationId && !activeIdRef.current) {
                activeIdRef.current = data.conversationId;
                setActiveId(data.conversationId);
              }
              break;
            }
            case "status":
            case "start": {
              const label = data.message || (data.intent ? `Handling (${data.intent})` : "Working...");
              setSteps((prev) => [
                ...prev.map((s) => ({ ...s, status: "complete" as const, completedAt: Date.now() })),
                {
                  id: makeId(),
                  type: type === "start" ? "planning" : "thinking",
                  label,
                  detail: data.route ? `route: ${data.route}` : undefined,
                  status: "active",
                  startedAt: Date.now(),
                },
              ]);
              scrollToBottom();
              break;
            }
            case "token": {
              setSteps((prev) =>
                prev.map((s) => ({ ...s, status: "complete" as const, completedAt: s.completedAt ?? Date.now() }))
              );
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: data.text ?? "" } : m))
              );
              scrollToBottom();
              break;
            }
            case "confirmation": {
              setPendingConfirmation({
                token: data.token,
                reason: data.reason,
                toolName: data.toolName,
                args: data.args || {},
              });
              break;
            }
            case "done": {
              if (data.response && !data.requiresConfirmation) {
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, content: data.response } : m))
                );
              }
              break;
            }
            case "error": {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content || data.message || "Something went wrong." }
                    : m
                )
              );
              break;
            }
          }
        };

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() || "";
          for (const block of blocks) {
            let type = "";
            let dataRaw = "";
            for (const line of block.split("\n")) {
              if (line.startsWith("event:")) type = line.slice(6).trim();
              else if (line.startsWith("data:")) dataRaw += line.slice(5).trim();
            }
            if (!type) continue;
            let data: any = {};
            try {
              data = JSON.parse(dataRaw);
            } catch {}
            handleEvent(type, data);
          }
        }

        loadConversations();
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId && !m.content
                ? { ...m, content: "Connection lost. Please try again." }
                : m
            )
          );
        }
      } finally {
        setSteps((prev) =>
          prev.map((s) => ({ ...s, status: s.status === "error" ? "error" : "complete", completedAt: s.completedAt ?? Date.now() }))
        );
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming, loadConversations, scrollToBottom]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const showEmptyState = messages.length === 0 && !isLoadingMessages && !isStreaming;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <div className="hidden w-64 shrink-0 md:block">
        <HistoryRail
          conversations={conversations}
          activeId={activeId}
          onSelect={openConversation}
          onNewChat={newChat}
          onRename={renameConversation}
          onDelete={deleteConversation}
          onTogglePin={togglePin}
          isLoading={isBooting}
        />
      </div>

      {railOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-72 bg-white dark:bg-zinc-950">
            <HistoryRail
              conversations={conversations}
              activeId={activeId}
              onSelect={openConversation}
              onNewChat={newChat}
              onRename={renameConversation}
              onDelete={deleteConversation}
              onTogglePin={togglePin}
              isLoading={isBooting}
            />
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setRailOpen(false)} />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-200 px-3 dark:border-zinc-800">
          <button
            onClick={() => setRailOpen(true)}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 md:hidden"
            aria-label="Open chat history"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Flow³</h1>
          {isStreaming && (
            <span className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Working...
            </span>
          )}
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {showEmptyState ? (
            <div className="flex h-full flex-col items-center justify-center px-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg">
                <span className="text-2xl font-bold text-white">³</span>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                How can I help today?
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Ask about your projects, tasks, or anything in your workspace.
              </p>
              <div className="mt-6 grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left text-sm text-zinc-700 shadow-sm transition-colors hover:border-violet-300 hover:bg-violet-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-violet-600 dark:hover:bg-violet-900/20"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
              {isLoadingMessages && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                </div>
              )}
              {messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  role={m.role}
                  content={m.content}
                  createdAt={m.createdAt}
                  isStreaming={isStreaming && m.role === "assistant" && m.id === messages[messages.length - 1]?.id && !m.content}
                />
              ))}
              {(steps.length > 0 || pendingConfirmation) && (
                <TaskTimeline steps={steps} isStreaming={isStreaming} pendingConfirmation={pendingConfirmation} />
              )}
              {pendingConfirmation && (
                <ConfirmationCard
                  toolName={pendingConfirmation.toolName}
                  reason={pendingConfirmation.reason}
                  args={pendingConfirmation.args}
                  isLoading={isStreaming}
                  onApprove={() => send("Approve")}
                  onDeny={() => send("Cancel")}
                />
              )}
            </div>
          )}
        </div>

        <Composer onSend={send} onStop={stop} isStreaming={isStreaming} />
      </div>
    </div>
  );
}