"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, History, Zap, Download, X } from "lucide-react";
import { useWorkspace } from "@/hooks/use-workspace";
import { usePopups } from "@/components/popups/popup-manager";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

import { NovaHeader } from "./nova/nova-header";
import { NovaToggleButton } from "./nova/nova-toggle-button";
import { NovaMessageList } from "./nova/nova-message-list";
import { NovaInput } from "./nova/nova-input";
import { NovaRecall } from "./nova/nova-recall";
import { NovaActions } from "./nova/nova-actions";
import { useNovaChat } from "@/hooks/nova/useNovaChat";
import { useNovaConversations } from "@/hooks/nova/useNovaConversations";
import { useNovaMemory } from "@/hooks/nova/useNovaMemory";
import { exportConversation, downloadExport } from "./nova/conversation-export";

export function NovaAssistant() {
  const { activeWorkspaceId } = useWorkspace();
  const { showUpgradePrompt } = usePopups();
  const pathname = usePathname();

  const currentProjectId = pathname?.startsWith("/projects/") ? pathname.split("/")[2]?.split("?")[0] : undefined;
  const pageContext = pathname
    ? { path: pathname, type: pathname === "/dashboard" ? "dashboard" : pathname.startsWith("/projects/") ? "project" : pathname.startsWith("/tasks") ? "tasks" : pathname.startsWith("/calendar") ? "calendar" : pathname.startsWith("/workspaces") ? "workspaces" : pathname.startsWith("/notifications") ? "notifications" : pathname.startsWith("/settings") ? "settings" : "other" }
    : undefined;

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [usage, setUsage] = useState<{ current: number; max: number } | null>(null);
  const isLimitReached = usage ? usage.max !== -1 && usage.current >= usage.max : false;
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

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
    if (activeWorkspaceId && isOpen) { fetchUsage(); conv.fetchConversations(); }
  }, [activeWorkspaceId, isOpen]);

  useEffect(() => {
    if (activeTab === "history" && activeWorkspaceId) { mem.fetchMemories(); conv.fetchConversations(); }
    else if (activeTab === "workflows" && activeWorkspaceId) { fetchAuditLogs(); }
  }, [activeTab, activeWorkspaceId]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.prompt) {
        chat.setInput(detail.prompt);
        if (!isOpen) setIsOpen(true);
        if (isMinimized) setIsMinimized(false);
        setActiveTab("chat");
      }
    };
    window.addEventListener("nova:open", handler);
    return () => window.removeEventListener("nova:open", handler);
  }, [isOpen, isMinimized]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Cmd+Shift+N -> toggle Nova panel
      if (isMod && e.shiftKey && e.key === "N") {
        e.preventDefault();
        setIsOpen(prev => !prev);
        return;
      }

      // Escape -> close Nova panel (only if it's the focused element area)
      if (e.key === "Escape" && isOpen) {
        const active = document.activeElement;
        const isInNova = active?.closest("[data-nova-panel]");
        if (isInNova || document.activeElement === document.body) {
          e.preventDefault();
          setIsOpen(false);
          return;
        }
      }

      // Cmd+Shift+E -> export conversation
      if (isMod && e.shiftKey && e.key === "E" && isOpen && activeTab === "chat") {
        e.preventDefault();
        handleExport();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeTab, chat.messages]);

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
    await chat.sendMessage({ workspaceId: activeWorkspaceId!, conversationId: convId, projectId: currentProjectId, pageContext, onUsageUpdate: fetchUsage });
    if (convId) conv.fetchConversations();
  }, [chat, conv, activeWorkspaceId, currentProjectId, pageContext, isLimitReached, showUpgradePrompt, fetchUsage]);

  const handleSelectConversation = useCallback(async (id: string) => {
    conv.setActiveConversationId(id);
    const messages = await conv.fetchMessages(id);
    chat.setMessages(messages.length > 0 ? messages : [{ role: "nova", content: "Continuing where we left off. What would you like to work on?", timestamp: new Date() }]);
    setActiveTab("chat");
  }, [conv, chat]);

  const handleRetry = useCallback((prompt: string) => {
    handleSend(prompt);
  }, [handleSend]);

  const handleExport = useCallback(() => {
    const md = exportConversation(chat.messages, "Nova Conversation");
    downloadExport(md);
    toast.success("Conversation exported!");
  }, [chat.messages]);

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[100] flex-col items-end font-sans" data-nova-panel>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: "bottom right" }}
            animate={{ opacity: 1, scale: 1, y: 0, height: isMinimized ? "72px" : "min(600px, 80vh)", width: isMinimized ? "280px" : "min(450px, 95vw)" }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={cn("mb-4 overflow-hidden rounded-2xl shadow-2xl border border-white/10 backdrop-blur-2xl bg-white/95 dark:bg-slate-950/95 flex flex-col", isMinimized ? "h-18" : "h-[80vh] w-[95vw] sm:w-[450px]")}
          >
            <NovaHeader isStreaming={chat.isStreaming} isMinimized={isMinimized} onToggleMinimize={() => setIsMinimized(!isMinimized)} onClose={() => setIsOpen(false)} />
            {!isMinimized && (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-2 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-transparent">
                  <TabsList className="grid w-full grid-cols-3 bg-slate-100/50 dark:bg-slate-900/50 rounded-lg p-1 border border-slate-200/50 dark:border-slate-800/50">
                    <TabsTrigger value="chat" className="rounded-lg text-[11px] sm:text-xs font-medium py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
                      <MessageSquare className="w-3.5 h-3.5 mr-1.5 inline-block" />Chat
                    </TabsTrigger>
                    <TabsTrigger value="history" className="rounded-lg text-[11px] sm:text-xs font-medium py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
                      <History className="w-3.5 h-3.5 mr-1.5 inline-block" />Recall
                    </TabsTrigger>
                    <TabsTrigger value="workflows" className="rounded-lg text-[11px] sm:text-xs font-medium py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
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
                    onRetry={handleRetry}
                    onSuggestedPrompt={(prompt) => {
                      chat.setInput(prompt);
                      // Auto-send the suggested prompt
                      setTimeout(() => handleSend(prompt), 50);
                    }}
                  />
                  <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                    <NovaInput input={chat.input} setInput={chat.setInput} onSend={() => handleSend()} isLoading={chat.isLoading} isLimitReached={isLimitReached} onSlashCommand={(cmd) => { if (cmd === "/clear") { chat.clearChat(); conv.setActiveConversationId(null); } }} />
                  </div>
                </TabsContent>
                <TabsContent value="history" className="flex-1 flex flex-col overflow-hidden m-0">
                  <NovaRecall conversations={conv.conversations} loading={conv.loading} activeConversationId={conv.activeConversationId} memories={mem.memories} onSelectConversation={handleSelectConversation} onDeleteMemory={mem.deleteMemory} onRefreshConversations={conv.fetchConversations} onRefreshMemories={mem.fetchMemories} onSetInput={chat.setInput} onSetActiveTab={setActiveTab} />
                </TabsContent>
                <TabsContent value="workflows" className="flex-1 overflow-y-auto m-0">
                  <NovaActions auditLogs={auditLogs} onSetInput={chat.setInput} onSetActiveTab={setActiveTab} />
                </TabsContent>
              </Tabs>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <NovaToggleButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)} />
    </div>
  );
}
