"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { cn } from "@/lib/utils";
import { Search, Loader2, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface Conversation {
  id: string;
  name: string;
  description: string | null;
  membersCount: number;
  messageCount: number;
  lastMessage: {
    content: string;
    createdAt: string;
    userId: string;
    userName: string | null;
  } | null;
}

interface ChatSidebarProps {
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
}

export function ChatSidebar({ activeConversationId, onSelectConversation }: ChatSidebarProps) {
  const { activeWorkspaceId } = useWorkspace();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["chat-conversations", activeWorkspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/chat/conversations?workspaceId=${activeWorkspaceId}`);
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    },
    enabled: !!activeWorkspaceId,
    refetchInterval: 30_000,
  });

  const conversations: Conversation[] = data?.conversations ?? [];

  const filtered = search.trim()
    ? conversations.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-[13px] font-semibold tracking-tight text-foreground/70 px-1">Chat</h2>
      </div>

      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 px-3 h-8 rounded-full bg-muted/60 text-muted-foreground/40 text-[11px]">
          <Search className="h-3 w-3 shrink-0" />
          <input
            placeholder="Search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none flex-1 text-[11px] placeholder:text-muted-foreground/30"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground/30">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-muted-foreground/30">
            <MessageSquare className="h-6 w-6 mb-2" />
            <p className="text-[11px] font-medium">No conversations</p>
          </div>
        ) : (
          <div className="px-2 pb-2">
            {filtered.map(conv => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={cn(
                  "w-full flex items-start gap-2.5 px-3 py-2.5 rounded-[10px] text-left transition-all",
                  activeConversationId === conv.id
                    ? "bg-accent"
                    : "hover:bg-muted/50"
                )}
              >
                <div className={cn(
                  "h-8 w-8 rounded-[9px] shrink-0 flex items-center justify-center text-[11px] font-semibold mt-0.5",
                  activeConversationId === conv.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/80 text-muted-foreground/70"
                )}>
                  {conv.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn(
                      "text-[13px] font-medium truncate leading-none",
                      activeConversationId === conv.id ? "text-foreground" : "text-foreground/80"
                    )}>
                      {conv.name}
                    </span>
                    {conv.lastMessage && (
                      <span className="text-[10px] text-muted-foreground/40 shrink-0 leading-none">
                        {format(new Date(conv.lastMessage.createdAt), "HH:mm")}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5">
                    {conv.lastMessage ? (
                      <span className="text-[11px] text-muted-foreground/50 line-clamp-1 leading-tight">
                        {conv.lastMessage.content}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/25 italic leading-tight">No messages yet</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
