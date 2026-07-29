"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/components/providers/workspace-provider";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Search, Loader2, MessageSquare } from "lucide-react";

interface DmNewMessageProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectUser: (userId: string) => void;
}

export function DmNewMessage({ open, onOpenChange, onSelectUser }: DmNewMessageProps) {
  const { activeWorkspaceId } = useWorkspace();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["workspace-members", activeWorkspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/members`);
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
    enabled: !!activeWorkspaceId && open,
  });

  const members: { id: string; name: string; email: string; imageUrl: string | null; role: string }[] = data ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(m =>
      m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q)
    );
  }, [members, search]);

  const handleSelect = async (userId: string) => {
    try {
      const res = await fetch("/api/chat/dm/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: activeWorkspaceId, participantUserId: userId }),
      });
      if (!res.ok) throw new Error("Failed to create conversation");
      const data = await res.json();
      onSelectUser(data.conversation.id);
      onOpenChange(false);
      setSearch("");
    } catch {
      // silently fail
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) setSearch(""); }}>
      <DialogContent className="rounded-xl border bg-background p-0 shadow-lg max-w-md overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="text-[14px] font-semibold tracking-tight">New message</DialogTitle>
        </DialogHeader>
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 px-3 h-9 rounded-lg bg-muted/60 border border-border/30 focus-within:border-primary/30 focus-within:ring-[3px] focus-within:ring-primary/[0.06] transition-all">
            <Search className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            <input
              placeholder="Search workspace members..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              className="bg-transparent border-none outline-none flex-1 text-[13px] placeholder:text-muted-foreground/30"
            />
          </div>
        </div>
        <div className="max-h-[360px] overflow-y-auto no-scrollbar px-1 pb-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground/30">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-muted-foreground/30">
              <MessageSquare className="h-6 w-6 mb-2" />
              <p className="text-[12px] font-medium">No members found</p>
            </div>
          ) : (
            filtered.map(member => (
              <button
                key={member.id}
                onClick={() => handleSelect(member.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-all text-left"
              >
                {member.imageUrl ? (
                  <div className="h-9 w-9 rounded-full overflow-hidden ring-2 ring-background shrink-0">
                    <img src={member.imageUrl} alt="" className="object-cover w-full h-full" />
                  </div>
                ) : (
                  <div className="h-9 w-9 rounded-full bg-muted/80 flex items-center justify-center text-[12px] font-semibold text-muted-foreground/70 shrink-0 ring-2 ring-background">
                    {(member.name || "?").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-foreground/80 truncate">
                    {member.name || "Unknown"}
                  </div>
                  <div className="text-[11px] text-muted-foreground/50 truncate">
                    {member.email}
                  </div>
                </div>
                <span className="text-[10px] capitalize text-muted-foreground/40 bg-muted/40 px-2 py-0.5 rounded-full">
                  {member.role}
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
