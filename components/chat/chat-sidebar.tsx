"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { cn } from "@/lib/utils";
import { Hash, Search, Loader2, MessageSquare } from "lucide-react";
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
    <div className="flex flex-col h-full bg-background/95 border-r border-border/40">
      <div className="px-4 pt-5 pb-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground/80 px-1">Chat</h2>
      </div>

      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 px-3 h-9 rounded-xl bg-muted/60 border border-border/40 text-muted-foreground/50 text-xs">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <input
            placeholder="Search conversations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none flex-1 text-xs placeholder:text-muted-foreground/40"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground/40">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-muted-foreground/40">
            <MessageSquare className="h-8 w-8 mb-3" />
            <p className="text-xs font-medium">No conversations</p>
            <p className="text-[10px] mt-1">Join a team to start chatting</p>
          </div>
        ) : (
          <div className="space-y-0.5 px-2 pb-3">
            {filtered.map(conv => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={cn(
                  "w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                  activeConversationId === conv.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted/60 text-foreground/80 hover:text-foreground"
                )}
              >
                <div className={cn(
                  "h-8 w-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-semibold mt-0.5",
                  activeConversationId === conv.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/80 text-muted-foreground border border-border/30"
                )}>
                  {conv.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn(
                      "text-sm font-medium truncate",
                      activeConversationId === conv.id && "text-primary"
                    )}>
                      {conv.name}
                    </span>
                    {conv.lastMessage && (
                      <span className="text-[10px] text-muted-foreground/50 shrink-0">
                        {format(new Date(conv.lastMessage.createdAt), "HH:mm")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {conv.lastMessage ? (
                      <span className="text-xs text-muted-foreground/60 truncate">
                        {conv.lastMessage.userName ? `${conv.lastMessage.userName}: ` : ""}
                        {conv.lastMessage.content}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/30 italic">No messages yet</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-muted-foreground/40">{conv.membersCount} members</span>
                    {conv.messageCount > 0 && (
                      <>
                        <span className="text-[9px] text-muted-foreground/20">·</span>
                        <span className="text-[9px] text-muted-foreground/40">{conv.messageCount} messages</span>
                      </>
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
