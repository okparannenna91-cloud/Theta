"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { cn } from "@/lib/utils";
import { Search, Loader2, MessageSquare, Plus } from "lucide-react";
import { format } from "date-fns";

interface Participant {
  id: string;
  name: string | null;
  imageUrl: string | null;
}

interface Conversation {
  id: string;
  type: string;
  participants: Participant[];
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    userId: string;
    userName: string | null;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

interface DmSidebarProps {
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewMessage: () => void;
}

export function DmSidebar({ activeConversationId, onSelectConversation, onNewMessage }: DmSidebarProps) {
  const { activeWorkspaceId } = useWorkspace();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["dm-conversations", activeWorkspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/chat/dm/conversations?workspaceId=${activeWorkspaceId}`);
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    },
    enabled: !!activeWorkspaceId,
    refetchInterval: 60_000,
  });

  const conversations: Conversation[] = data?.conversations ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(c => {
      const name = c.participants[0]?.name?.toLowerCase() || "";
      return name.includes(q);
    });
  }, [conversations, search]);

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold tracking-tight text-foreground/70 px-1">Direct Messages</h2>
      </div>

      <div className="px-3 pb-2 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 h-8 rounded-full bg-muted/60 text-muted-foreground/40 text-[11px]">
          <Search className="h-3 w-3 shrink-0" />
          <input
            placeholder="Search people..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none flex-1 text-[11px] placeholder:text-muted-foreground/30"
          />
        </div>
        <button
          onClick={onNewMessage}
          className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary transition-all shrink-0"
          title="New message"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground/30">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-muted-foreground/30">
            <MessageSquare className="h-6 w-6 mb-2" />
            <p className="text-[11px] font-medium">No conversations yet</p>
            <p className="text-[10px] mt-1 text-muted-foreground/20">Start a new message to begin</p>
          </div>
        ) : (
          <div className="px-2 pb-2">
            {filtered.map(conv => {
              const participant = conv.participants[0];
              const hasUnread = conv.unreadCount > 0;

              return (
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
                  <div className="relative shrink-0 mt-0.5">
                    {participant?.imageUrl ? (
                      <div className="h-8 w-8 rounded-full overflow-hidden ring-2 ring-background">
                        <img src={participant.imageUrl} alt="" className="object-cover w-full h-full" />
                      </div>
                    ) : (
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-semibold",
                        activeConversationId === conv.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/80 text-muted-foreground/70"
                      )}>
                        {(participant?.name || "?").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    {hasUnread && (
                      <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary text-[7px] font-bold text-primary-foreground flex items-center justify-center ring-2 ring-background">
                        {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn(
                        "text-[13px] truncate leading-none",
                        hasUnread ? "font-semibold text-foreground" : "font-medium text-foreground/80",
                        activeConversationId === conv.id && "text-foreground"
                      )}>
                        {participant?.name || "Unknown User"}
                      </span>
                      {conv.lastMessage && (
                        <span className="text-[10px] text-muted-foreground/40 shrink-0 leading-none">
                          {format(new Date(conv.lastMessage.createdAt), "HH:mm")}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      {conv.lastMessage ? (
                        <span className={cn(
                          "text-[11px] line-clamp-1 leading-tight",
                          hasUnread ? "text-foreground/70 font-medium" : "text-muted-foreground/50"
                        )}>
                          {conv.lastMessage.content}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/25 italic leading-tight">No messages yet</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
