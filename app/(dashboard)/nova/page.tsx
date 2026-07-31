"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { History, Download, Plus, Bot, Sparkles, Zap, Brain, Trash2 } from "lucide-react";
import { useWorkspace } from "@/hooks/use-workspace";
import { usePopups } from "@/components/popups/popup-manager";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

import { NovaMessageList } from "@/components/ai/nova/nova-message-list";
import { NovaInput } from "@/components/ai/nova/nova-input";
import { NovaActions } from "@/components/ai/nova/nova-actions";
import { NovaInsights } from "@/components/ai/nova/nova-insights";
import { useNovaChat } from "@/hooks/nova/useNovaChat";
import { useNovaConversations } from "@/hooks/nova/useNovaConversations";
import { useNovaMemory } from "@/hooks/nova/useNovaMemory";
import { exportConversation, downloadExport } from "@/components/ai/nova/conversation-export";

function NovaPage() {
  const { activeWorkspaceId } = useWorkspace();
  const { showUpgradePrompt } = usePopups();
  const { user: clerkUser } = useUser();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [view, setView] = useState<"chat" | "memory" | "insights" | "actions">("chat");
  const [showHistory, setShowHistory] = useState(false);
  const [usage, setUsage] = useState<{ current: number; max: number } | null>(null);
  const isLimitReached = usage ? usage.max !== -1 && usage.current >= usage.max : false;
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const lastHandledPromptRef = useRef<string | null>(null);
  const sendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current); }, []);

  const chat = useNovaChat();
  const conv = useNovaConversations(activeWorkspaceId ?? undefined);
  const mem = useNovaMemory(activeWorkspaceId ?? undefined);

  const fetchUsage = useCallback(async () => {
    if (!activeWorkspaceId) return;
    try {
      const res = await fetch(`/api/billing/usage?workspaceId=${activeWorkspaceId}`);
      if (res.ok) { const data = await res.json(); if (data.nova) setUsage({ current: data.nova.current, max: data.nova.max }); }
    } catch (error) { console.error("Failed to fetch usage:", error); }
  }, [activeWorkspaceId]);

  const fetchAuditLogs = useCallback(async () => {
    if (!activeWorkspaceId) return;
    try {
      const res = await fetch(`/api/activity?workspaceId=${activeWorkspaceId}&type=NOVA_TOOL_EXECUTION&limit=20`);
      if (res.ok) { const data = await res.json(); setAuditLogs(data.activities || data || []); }
    } catch (error) { console.error("Failed to fetch audit logs:", error); }
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (activeWorkspaceId) { fetchUsage(); conv.fetchConversations(); }
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (view === "memory" && activeWorkspaceId) { mem.fetchMemories(); conv.fetchConversations(); }
    else if (view === "actions" && activeWorkspaceId) { fetchAuditLogs(); }
  }, [view, activeWorkspaceId]);

  const handleSend = useCallback(async (retryPrompt?: string) => {
    if (retryPrompt) {
      chat.setInput(retryPrompt);
    }
    const inputToUse = retryPrompt || chat.input;
    if (inputToUse.trim().startsWith("/clear")) { chat.clearChat(); conv.setActiveConversationId(null); return; }
    if (isLimitReached) { showUpgradePrompt("nova"); return; }
    let convId = conv.activeConversationId;
    let isNewConversation = false;
    if (!convId) {
      const newId = await conv.createConversation();
      if (newId) { conv.setActiveConversationId(newId); conv.fetchConversations(); convId = newId; isNewConversation = true; }
    }
    await chat.sendMessage({ workspaceId: activeWorkspaceId!, conversationId: convId, projectId: currentProjectId, pageContext: { path: pathname ?? "/nova", type: "nova" }, onUsageUpdate: fetchUsage });
    if (convId) conv.fetchConversations();
    if (isNewConversation && convId) {
      conv.generateTitle(convId, inputToUse);
    }
  }, [chat, conv, activeWorkspaceId, pathname, isLimitReached, showUpgradePrompt, fetchUsage]);

  const currentProjectId = pathname?.startsWith("/projects/") ? pathname.split("/")[2]?.split("?")[0] : undefined;

  const handleSelectConversation = useCallback(async (id: string) => {
    conv.setActiveConversationId(id);
    const messages = await conv.fetchMessages(id);
    chat.setMessages(messages.length > 0 ? messages : [{ role: "nova", content: "Continuing where we left off. What would you like to work on?", timestamp: new Date() }]);
    const current = conv.conversations.find((c) => c.id === id);
    if (current && (!current.title || current.title === "New Conversation" || current.title === "Untitled")) {
      const firstUser = messages.find((m) => m.role === "user");
      if (firstUser) {
        conv.generateTitle(id, firstUser.content);
      }
    }
    setView("chat");
  }, [conv, chat]);

  const handleNewChat = useCallback(() => {
    conv.setActiveConversationId(null);
    chat.clearChat();
    chat.setInput("");
    setView("chat");
  }, [conv, chat]);

  const handleExport = useCallback(() => {
    const md = exportConversation(chat.messages, "Nova Conversation");
    downloadExport(md);
    toast.success("Conversation exported!");
  }, [chat.messages]);

  const promptParam = searchParams.get("prompt");
  useEffect(() => {
    if (!promptParam || lastHandledPromptRef.current === promptParam) return;
    lastHandledPromptRef.current = promptParam;
    chat.setInput(promptParam);
    setView("chat");
    if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current);
    sendTimeoutRef.current = setTimeout(() => handleSend(promptParam), 150);
    return () => { if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current); };
  }, [promptParam, handleSend]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const prompt = detail?.prompt;
      if (!prompt) return;
      lastHandledPromptRef.current = prompt;
      chat.setInput(prompt);
      setView("chat");
      if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current);
      sendTimeoutRef.current = setTimeout(() => handleSend(prompt), 150);
    };
    window.addEventListener("nova:open", handler);
    return () => window.removeEventListener("nova:open", handler);
  }, [handleSend]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.shiftKey && e.key === "N") {
        e.preventDefault();
        setView("chat");
        document.querySelector<HTMLTextAreaElement>("[data-nova-input]")?.focus();
        return;
      }
      if (isMod && e.shiftKey && e.key === "E") {
        e.preventDefault();
        handleExport();
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleExport]);

  const activeTitle = conv.activeConversationId
    ? conv.conversations.find((c) => c.id === conv.activeConversationId)?.title || "Chat"
    : "New Chat";

  const viewButtons: { key: typeof view; icon: typeof Brain; label: string }[] = [
    { key: "memory", icon: Brain, label: "Memory" },
    { key: "insights", icon: Sparkles, label: "Insights" },
    { key: "actions", icon: Zap, label: "Actions" },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white dark:bg-slate-950">
      <header className="shrink-0 h-14 border-b border-slate-200/70 dark:border-slate-800/70 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl flex items-center justify-between px-4 lg:px-6 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800", !showHistory && "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white")}
            onClick={() => setShowHistory((prev) => !prev)}
            title="Toggle history"
          >
            <History className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{activeTitle}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2.5 rounded-lg text-sm font-medium text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
            onClick={handleNewChat}
          >
            <Plus className="h-3.5 w-3.5" />
            New Chat
          </Button>
        </div>
        <div className="flex items-center gap-1">
          {usage && (
            <span className="hidden md:inline-flex items-center mr-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {usage.max === -1 ? "Unlimited" : `${usage.current} / ${usage.max} this month`}
            </span>
          )}
          {viewButtons.map(({ key, icon: Icon, label }) => (
            <Button
              key={key}
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800",
                view === key && "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
              )}
              onClick={() => setView(key)}
              title={label}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={handleExport}
            title="Export conversation"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {showHistory && (
          <aside className="hidden lg:flex w-[300px] shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            <div className="p-3 pb-2">
              <Button className="w-full h-9 gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-sm" onClick={handleNewChat}>
                <Plus className="h-4 w-4" />
                New Chat
              </Button>
            </div>
            <div className="px-3 pb-2">
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 transition-all"
              />
            </div>
            <div className="flex-1 overflow-y-auto pb-3">
              <div className="px-4 pt-2 pb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                {conv.loading ? "Loading..." : "Recent"}
              </div>
              {conv.loading ? (
                <div className="space-y-1 px-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-slate-100 dark:bg-slate-900 animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : conv.conversations.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <Bot className="h-5 w-5 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No chats yet</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Ask Nova something to get started</p>
                </div>
              ) : (
                conv.conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectConversation(c.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors border-l-2",
                      conv.activeConversationId === c.id
                        ? "bg-indigo-50/70 dark:bg-indigo-500/10 border-indigo-600"
                        : "border-transparent"
                    )}
                  >
                    <span className={cn("block text-sm font-medium truncate", conv.activeConversationId === c.id ? "text-indigo-700 dark:text-indigo-300" : "text-slate-700 dark:text-slate-300")}>
                      {c.title || "Untitled"}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                      {formatDistanceToNow(new Date(c.lastMessageAt), { addSuffix: true })}
                    </span>
                  </button>
                ))
              )}
            </div>
          </aside>
        )}

        <main className="flex-1 min-w-0 flex flex-col bg-[#f7f7f8] dark:bg-slate-900/40 overflow-hidden">
          {view === "chat" && (
            <>
              <div className="flex-1 flex flex-col w-full max-w-3xl mx-auto min-h-0">
                <NovaMessageList
                  messages={chat.messages}
                  isStreaming={chat.isStreaming}
                  isLoading={chat.isLoading}
                  lastPrompt={chat.lastPromptRef.current}
                  userImageUrl={clerkUser?.imageUrl}
                  onRetry={(prompt) => handleSend(prompt)}
                  onSuggestedPrompt={(prompt) => {
                    chat.setInput(prompt);
                    setTimeout(() => handleSend(prompt), 50);
                  }}
                />
              </div>
              <div className="shrink-0 w-full max-w-3xl mx-auto px-4 pb-4">
                <NovaInput input={chat.input} setInput={chat.setInput} onSend={() => handleSend()} isLoading={chat.isLoading} isLimitReached={isLimitReached} onSlashCommand={(cmd) => { if (cmd === "/clear") { chat.clearChat(); conv.setActiveConversationId(null); } }} />
                <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
                  Nova can make mistakes. Verify important information.
                </p>
              </div>
            </>
          )}

          {view === "memory" && (
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-6 py-8">
                <div className="mb-6">
                  <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Memory</h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Things Nova remembers about your workspace. The more it knows, the more useful it becomes.
                  </p>
                </div>
                {mem.loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : mem.memories.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 text-center">
                    <Brain className="h-6 w-6 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No memories stored yet</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Memories are captured automatically as Nova works with you.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {mem.memories.map((m: any) => (
                      <div key={m.id} className="group flex items-start gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-colors">
                        <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                          <Brain className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{m.key}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{m.content}</p>
                        </div>
                        <button
                          onClick={() => mem.deleteMemory(m.id)}
                          className="text-slate-300 dark:text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-1"
                          title="Delete memory"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {view === "insights" && (
            <div className="flex-1 overflow-y-auto">
              <NovaInsights />
            </div>
          )}

          {view === "actions" && (
            <div className="flex-1 overflow-y-auto">
              <NovaActions auditLogs={auditLogs} onSetInput={chat.setInput} onSetActiveTab={(v) => setView(v === "chat" ? "chat" : "actions")} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function Nova() {
  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center bg-white dark:bg-slate-950"><span className="text-sm text-slate-400 font-medium">Opening Nova...</span></div>}>
      <NovaPage />
    </Suspense>
  );
}
