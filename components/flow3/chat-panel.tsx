"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Menu, Loader2 } from "lucide-react";
import { HistoryRail, ConversationSummary } from "./history-rail";
import { MessageBubble } from "./message-bubble";
import { Composer } from "./composer";
import { ThinkingBlock, ThinkingStep } from "./thinking-block";
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [steps, setSteps] = useState<ThinkingStep[]>([]);
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
      setLoadError(null);
      setIsLoadingMessages(true);
      try {
        const res = await fetch(`/api/nova/conversations/${id}?messages=true`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
      } catch (err: any) {
        setMessages([]);
        setLoadError("Couldn't load this conversation. Please try again.");
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
    setLoadError(null);
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
      setLoadError(null);
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
              const label = data.message || (data.intent ? `Handling (${data.intent})` : "Thinking...");
              setSteps((prev) => [
                ...prev.map((s) => ({ ...s, status: "complete" as const, completedAt: s.completedAt ?? Date.now() })),
                {
                  id: makeId(),
                  label,
                  detail: data.route ? `route: ${data.route}` : undefined,
                  status: "active",
                  startedAt: Date.now(),
                },
              ]);
              break;
            }
            case "token": {
              setSteps((prev) =>
                prev.map((s) => ({ ...s, status: s.status === "error" ? "error" : "complete", completedAt: s.completedAt ?? Date.now() }))
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
            case "title": {
              const cid = data.conversationId || activeIdRef.current;
              if (cid && data.title) {
                setConversations((prev) => {
                  const exists = prev.some((c) => c.id === cid);
                  const updated = prev.map((c) => (c.id === cid ? { ...c, title: data.title } : c));
                  return exists
                    ? updated
                    : [
                        { id: cid, title: data.title, isPinned: false, lastMessageAt: new Date().toISOString(), createdAt: new Date().toISOString() },
                        ...updated,
                      ];
                });
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
          prev.map((s) => ({
            ...s,
            status: s.status === "error" ? ("error" as const) : ("complete" as const),
            completedAt: s.completedAt ?? Date.now(),
          }))
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

  const isLoadingThread = isLoadingMessages || isBooting;
  const lastMsg = messages[messages.length - 1];
  const showThinking = steps.length > 0 && !pendingConfirmation && (!lastMsg || lastMsg.role !== "assistant" || isStreaming || !lastMsg.content);

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
        <header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-zinc-200 px-4 dark:border-zinc-800">
          <button
            onClick={() => setRailOpen(true)}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 md:hidden"
            aria-label="Open chat history"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-sm">
            <span className="text-sm font-black leading-none text-white">F</span>
          </div>
          <h1 className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-lg font-bold tracking-tight text-transparent dark:from-violet-400 dark:to-fuchsia-400">
            Flow
            <span className="align-super text-[11px] font-extrabold">3</span>
          </h1>
          <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-violet-600 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
            Beta
          </span>
          {isStreaming && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-violet-500 dark:text-violet-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Working...
            </span>
          )}
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
            {isLoadingThread && messages.length === 0 && (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
              </div>
            )}

            {loadError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-xs text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {loadError}
              </p>
            )}

            {messages.map((m, i) => (
              <React.Fragment key={m.id}>
                {i === messages.length - 1 &&
                  m.role === "assistant" &&
                  showThinking && <ThinkingBlock steps={steps} isActive={isStreaming} />}
                <MessageBubble
                  role={m.role}
                  content={m.content}
                  createdAt={m.createdAt}
                  isStreaming={isStreaming && m.role === "assistant" && i === messages.length - 1 && !m.content}
                />
              </React.Fragment>
            ))}

            {showThinking && (lastMsg?.role !== "assistant" || messages.length === 0) && (
              <ThinkingBlock steps={steps} isActive={isStreaming} />
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
        </div>

        <Composer onSend={send} onStop={stop} isStreaming={isStreaming} />
      </div>
    </div>
  );
}