"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SmilePlus, ThumbsUp, Check, Eye, AlertCircle, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const workspaceReactions = [
  { id: "approved", icon: Check, label: "Approved", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { id: "reviewing", icon: Eye, label: "Reviewing", color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: "urgent", icon: AlertCircle, label: "Urgent", color: "text-rose-500", bg: "bg-rose-500/10" },
  { id: "done", icon: ThumbsUp, label: "Done", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { id: "needs-attention", icon: AlertCircle, label: "Needs Attention", color: "text-amber-500", bg: "bg-amber-500/10" },
  { id: "blocked", icon: Clock, label: "Blocked", color: "text-red-500", bg: "bg-red-500/10" },
];

interface ReactionSummary {
  id: string;
  users: string[];
  count: number;
}

export default function WorkspaceReactions({
  messageId,
  reactions,
  currentUserId,
  onReactionToggle,
}: {
  messageId: string;
  reactions: Record<string, string[]> | null;
  currentUserId?: string;
  onReactionToggle?: (messageId: string, reactionId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reacting, setReacting] = useState(false);

  const reactionSummary: ReactionSummary[] = workspaceReactions.map((r) => ({
    id: r.id,
    users: reactions?.[r.id] || [],
    count: reactions?.[r.id]?.length || 0,
  })).filter(r => r.count > 0);

  const handleReaction = async (reactionId: string) => {
    if (!currentUserId) return;
    setReacting(true);
    try {
      if (onReactionToggle) {
        onReactionToggle(messageId, reactionId);
      } else {
        const res = await fetch("/api/chat/reaction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId, reactionId }),
        });
        if (!res.ok) throw new Error("Failed");
      }
    } catch {
      toast.error("Failed to add reaction");
    } finally {
      setReacting(false);
      setOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 mt-2">
      {reactionSummary.map((r) => {
        const def = workspaceReactions.find(wr => wr.id === r.id);
        return (
          <button
            key={r.id}
            onClick={() => handleReaction(r.id)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border transition-all hover:scale-105",
              r.users.includes(currentUserId || "")
                ? `${def?.bg} ${def?.color} border-current/30`
                : "bg-muted/50 text-muted-foreground border-transparent hover:border-muted-foreground/20"
            )}
          >
            {def && <def.icon className="w-3 h-3" />}
            <span>{r.count}</span>
          </button>
        );
      })}

      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          {reacting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SmilePlus className="w-3.5 h-3.5" />}
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -5 }}
              className="absolute bottom-full left-0 mb-2 p-2 rounded-xl border bg-popover shadow-lg z-50 min-w-[180px]"
            >
              <div className="grid grid-cols-3 gap-1">
                {workspaceReactions.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleReaction(r.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] font-medium transition-all hover:bg-muted",
                      reactions?.[r.id]?.includes(currentUserId || "") && `${r.bg} ${r.color}`
                    )}
                  >
                    <r.icon className="w-4 h-4" />
                    <span className="text-[9px] leading-tight text-center">{r.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
