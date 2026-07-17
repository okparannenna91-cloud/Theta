"use client";

import { useState } from "react";
import { Search, MessageSquare, Brain, Pin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { Conversation } from "./types";

interface Props {
  conversations: Conversation[];
  loading: boolean;
  activeConversationId: string | null;
  memories: any[];
  onSelectConversation: (id: string) => void;
  onDeleteMemory: (id: string) => void;
  onRefreshConversations: () => void;
  onRefreshMemories: () => void;
  onSetInput: (v: string) => void;
  onSetActiveTab: (v: string) => void;
}

export function NovaRecall({
  conversations,
  loading,
  activeConversationId,
  memories,
  onSelectConversation,
  onDeleteMemory,
  onRefreshConversations,
  onRefreshMemories,
  onSetInput,
  onSetActiveTab,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showingMemories, setShowingMemories] = useState(false);

  const filtered = conversations.filter((c) => c.title?.toLowerCase().includes(searchQuery.toLowerCase()));
  const pinned = filtered.filter((c) => c.isPinned);
  const recent = filtered.filter((c) => !c.isPinned);

  return (
    <div className="flex-1 flex flex-col overflow-hidden m-0">
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-transparent">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 rounded-lg text-xs font-medium focus:outline-none focus:border-primary/50 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-7 px-3 rounded-lg text-[10px] font-medium", !showingMemories ? "bg-primary/10 text-primary" : "text-muted-foreground")}
            onClick={() => { setShowingMemories(false); onRefreshConversations(); }}
          >
            <MessageSquare className="w-3 h-3 mr-1" />
            Conversations
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-3 rounded-lg text-[10px] font-medium text-muted-foreground hover:text-purple-500 hover:bg-purple-500/5"
            onClick={() => { setShowingMemories(true); onRefreshMemories(); }}
          >
            <Brain className="w-3 h-3 mr-1" />
            Memories
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-slate-50/30">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-slate-100 dark:bg-slate-900 animate-pulse rounded-lg border border-slate-200 dark:border-slate-800" />
            ))}
          </div>
        ) : !showingMemories ? (
          <>
            {pinned.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Pin className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Pinned</span>
                </div>
                {pinned.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onSelectConversation(c.id)}
                    className={cn(
                      "w-full text-left p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-primary/50 hover:shadow-md transition-all",
                      activeConversationId === c.id && "border-primary/50 ring-1 ring-primary/20"
                    )}
                  >
                    <span className="text-xs font-semibold text-slate-900 dark:text-white block truncate">{c.title}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {formatDistanceToNow(new Date(c.lastMessageAt), { addSuffix: true })}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <MessageSquare className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {pinned.length > 0 ? "Recent" : "Conversations"}
                </span>
              </div>
              {recent.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center mx-auto">
                    <MessageSquare className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-xs text-muted-foreground">No conversations yet</p>
                  <p className="text-[10px] text-muted-foreground">Start a new chat to begin</p>
                </div>
              ) : (
                recent.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onSelectConversation(c.id)}
                    className={cn(
                      "w-full text-left p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-primary/50 hover:shadow-md transition-all",
                      activeConversationId === c.id && "border-primary/50 ring-1 ring-primary/20"
                    )}
                  >
                    <span className="text-xs font-semibold text-slate-900 dark:text-white block truncate">{c.title || "Untitled"}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {formatDistanceToNow(new Date(c.lastMessageAt), { addSuffix: true })}
                    </span>
                  </button>
                ))
              )}
            </div>
          </>
        ) : memories.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1 mb-2">
              <Brain className="w-3 h-3 text-purple-500" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Memories</span>
              <span className="text-[10px] text-purple-500 font-medium ml-auto">{memories.length} stored</span>
            </div>
            {memories.map((mem: any) => (
              <div key={mem.id} className="flex items-center gap-2 p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 group hover:border-purple-500/30 transition-all">
                <Brain className="w-3 h-3 text-purple-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-semibold text-slate-900 dark:text-white block truncate">{mem.key}</span>
                  <span className="text-[9px] text-slate-500 block truncate">{mem.content}</span>
                </div>
                <button onClick={() => onDeleteMemory(mem.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 space-y-2">
            <Brain className="w-5 h-5 text-slate-400 mx-auto" />
            <p className="text-xs text-muted-foreground">No memories stored yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
