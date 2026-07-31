"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { MessageSquare, History, Zap, Download, Sparkles, Plus, Bot, Pin } from "lucide-react";
import { useWorkspace } from "@/hooks/use-workspace";
import { usePopups } from "@/components/popups/popup-manager";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

import { NovaMessageList } from "@/components/ai/nova/nova-message-list";
import { NovaInput } from "@/components/ai/nova/nova-input";
import { NovaRecall } from "@/components/ai/nova/nova-recall";
import { NovaActions } from "@/components/ai/nova/nova-actions";
import { NovaInsights } from "@/components/ai/nova/nova-insights";
import { useNovaChat } from "@/hooks/nova/useNovaChat";
import { useNovaConversations } from "@/hooks/nova/useNovaConversations";
import { useNovaMemory } from "@/hooks/nova/useNovaMemory";
import { exportConversation, downloadExport } from "@/components/ai/nova/conversation-export";

function NovaPage() {
  const { activeWorkspaceId } = useWorkspace();
  const { showUpgradePrompt } = usePopups();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentProjectId = pathname?.startsWith("/projects/") ? pathname.split("/")[2]?.split("?")[0] : undefined;

  const [activeTab, setActiveTab] = useState("chat");
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
    if (activeTab === "recall" && activeWorkspaceId) { mem.fetchMemories(); conv.fetchConversations(); }
    else if (activeTab === "actions" && activeWorkspaceId) { fetchAuditLogs(); }
  }, [activeTab, activeWorkspaceId]);

  const handleSend = useCallback(async (retryPrompt?: string) => {
    if (retryPrompt) {
      chat.setInput(retryPrompt);
    }
    const inputToUse = retryPrompt || chat.input;
    if (inputToUse.trim().startsWith("/clear")) { chat.clearChat(); conv.setActiveConversationId(null); return; }
    if (isLimitReached) { showUpgradePrompt("nova"); return; }
    let convId = conv.activeConversationId;
    if (!convId) {
      const newId = await conv.createConversation();
      if (newId) { conv.setActiveConversationId(newId); conv.fetchConversations(); convId = newId; }
    }
    await chat.sendMessage({ workspaceId: activeWorkspaceId!, conversationId: convId, projectId: currentProjectId, pageContext: { path: pathname ?? "/nova", type: "nova" }, onUsageUpdate: fetchUsage });
    if (convId) conv.fetchConversations();
  }, [chat, conv, activeWorkspaceId, currentProjectId, pathname, isLimitReached, showUpgradePrompt, fetchUsage]);

  const handleSelectConversation = useCallback(async (id: string) => {
    conv.setActiveConversationId(id);
    const messages = await conv.fetchMessages(id);
    chat.setMessages(messages.length > 0 ? messages : [{ role: "nova", content: "Continuing where we left off. What would you like to work on?", timestamp: new Date() }]);
    setActiveTab("chat");
  }, [conv, chat]);

  const handleNewChat = useCallback(() => {
    conv.setActiveConversationId(null);
    chat.clearChat();
    chat.setInput("");
    setActiveTab("chat");
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
    setActiveTab("chat");
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
      setActiveTab("chat");
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

  const usageLabel = usage
    ? usage.max === -1
      ? "Unlimited"
      : `${usage.current} / ${usage.max} this month`
    : null;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="shrink-0 h-14 border-b border-slate-100 dark:border-slate-800 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl flex items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Nova</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Watching workspace
              </span>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground block truncate">Ambient AI teammate</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {usageLabel && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60 text-[10px] font-semibold text-muted-foreground">
              <Sparkles className="w-3 h-3 text-primary" />
              {usageLabel}
            </span>
          )}
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs font-medium" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>
          <Button size="sm" className="h-8 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90" onClick={handleNewChat}>
            <Plus className="w-3.5 h-3.5" />
            New chat
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="hidden lg:flex w-72 shrink-0 flex-col border-r border-slate-100 dark:border-slate-800 bg-white/40 dark:bg-slate-950/40">
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <div className="px-2 pt-2 pb-1 flex items-center gap-2">
              <MessageSquare className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Conversations</span>
              {conv.conversations.length > 0 && (
                <span className="text-[10px] text-slate-400 ml-auto">{conv.conversations.length}</span>
              )}
            </div>
            {conv.loading ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-slate-100 dark:bg-slate-900 animate-pulse rounded-lg border border-slate-200 dark:border-slate-800" />
                ))}
              </div>
            ) : conv.conversations.length === 0 ? (
              <div className="px-3 py-8 text-center space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">No conversations yet</p>
                <p className="text-[10px] text-slate-400">Ask Nova something to get started</p>
              </div>
            ) : (
              conv.conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectConversation(c.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border transition-all group",
                    conv.activeConversationId === c.id
                      ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20"
                      : "border-transparent hover:bg-slate-100/70 dark:hover:bg-slate-900/60 hover:border-slate-200 dark:hover:border-slate-800"
                  )}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {c.isPinned && <Pin className="w-2.5 h-2.5 text-primary shrink-0" />}
                    <span className={cn("text-xs font-semibold truncate", conv.activeConversationId === c.id ? "text-primary" : "text-slate-900 dark:text-white")}>
                      {c.title || "Untitled"}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {formatDistanceToNow(new Date(c.lastMessageAt), { addSuffix: true })}
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-2 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-transparent">
              <TabsList className="grid w-full max-w-xl grid-cols-4 bg-slate-100/50 dark:bg-slate-900/50 rounded-lg p-1 border border-slate-200/50 dark:border-slate-800/50">
                <TabsTrigger value="chat" className="rounded-lg text-[11px] sm:text-xs font-medium py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
                  <MessageSquare className="w-3.5 h-3.5 mr-1.5 inline-block" />Chat
                </TabsTrigger>
                <TabsTrigger value="insights" className="rounded-lg text-[11px] sm:text-xs font-medium py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 inline-block" />Insights
                </TabsTrigger>
                <TabsTrigger value="recall" className="rounded-lg text-[11px] sm:text-xs font-medium py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
                  <History className="w-3.5 h-3.5 mr-1.5 inline-block" />Recall
                </TabsTrigger>
                <TabsTrigger value="actions" className="rounded-lg text-[11px] sm:text-xs font-medium py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
                  <Zap className="w-3.5 h-3.5 mr-1.5 inline-block" />Actions
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0 data-[state=active]:flex">
              <NovaMessageList
                messages={chat.messages}
                isStreaming={chat.isStreaming}
                isLoading={chat.isLoading}
                lastPrompt={chat.lastPromptRef.current}
                onRetry={(prompt) => handleSend(prompt)}
                onSuggestedPrompt={(prompt) => {
                  chat.setInput(prompt);
                  setTimeout(() => handleSend(prompt), 50);
                }}
              />
              <div className="px-3 sm:px-6 pb-3 sm:pb-6">
                <NovaInput input={chat.input} setInput={chat.setInput} onSend={() => handleSend()} isLoading={chat.isLoading} isLimitReached={isLimitReached} onSlashCommand={(cmd) => { if (cmd === "/clear") { chat.clearChat(); conv.setActiveConversationId(null); } }} />
              </div>
            </TabsContent>
            <TabsContent value="insights" className="flex-1 flex flex-col overflow-hidden m-0">
              <NovaInsights />
            </TabsContent>
            <TabsContent value="recall" className="flex-1 flex flex-col overflow-hidden m-0">
              <NovaRecall conversations={conv.conversations} loading={conv.loading} activeConversationId={conv.activeConversationId} memories={mem.memories} onSelectConversation={handleSelectConversation} onDeleteMemory={mem.deleteMemory} onRefreshConversations={conv.fetchConversations} onRefreshMemories={mem.fetchMemories} onSetInput={chat.setInput} onSetActiveTab={setActiveTab} />
            </TabsContent>
            <TabsContent value="actions" className="flex-1 overflow-y-auto m-0">
              <NovaActions auditLogs={auditLogs} onSetInput={chat.setInput} onSetActiveTab={setActiveTab} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

export default function Nova() {
  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center"><span className="text-xs text-muted-foreground">Opening Nova...</span></div>}>
      <NovaPage />
    </Suspense>
  );
}
