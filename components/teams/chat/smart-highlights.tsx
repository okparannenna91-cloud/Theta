"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Flag,
  MessageSquare,
  UserPlus,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Highlight {
  type: "deadline" | "action-item" | "decision" | "task-assigned" | "risk" | "follow-up";
  text: string;
  fromUser?: string;
  timestamp?: string;
}

const highlightConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  deadline: { icon: <CalendarDays className="w-3.5 h-3.5" />, color: "text-rose-500", bg: "bg-rose-500/10" },
  "action-item": { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  decision: { icon: <Flag className="w-3.5 h-3.5" />, color: "text-blue-500", bg: "bg-blue-500/10" },
  "task-assigned": { icon: <UserPlus className="w-3.5 h-3.5" />, color: "text-purple-500", bg: "bg-purple-500/10" },
  risk: { icon: <AlertCircle className="w-3.5 h-3.5" />, color: "text-amber-500", bg: "bg-amber-500/10" },
  "follow-up": { icon: <MessageSquare className="w-3.5 h-3.5" />, color: "text-cyan-500", bg: "bg-cyan-500/10" },
};

function detectHighlights(messages: any[]): Highlight[] {
  const highlights: Highlight[] = [];
  const keywords: Record<string, RegExp[]> = {
    deadline: [/due\s+(by|on|date)/i, /deadline/i, /by\s+\w+(day|week|month)/i, /before\s+\w+(day|week|month)/i],
    "action-item": [/action\s+item/i, /todo/i, /need to/i, /must\s+do/i, /remember to/i],
    decision: [/decided/i, /decision/i, /let's go with/i, /agreed/i, /finalized/i, /confirmed/i],
    "task-assigned": [/assigned?/, /(@\w+)/, /(can you|could you)/i, /take\s+(this|that|care of)/i],
    risk: [/blocked/i, /risk/i, /issue/i, /problem/i, /concern/i, /delayed/i, /stuck/i],
    "follow-up": [/follow.up/i, /check\s+(back|in)/i, /update\s+me/i, /let me know/i, /circle back/i],
  };

  for (const msg of messages) {
    if (!msg.content) continue;
    for (const [type, patterns] of Object.entries(keywords)) {
      for (const pattern of patterns) {
        if (pattern.test(msg.content)) {
          highlights.push({
            type: type as Highlight["type"],
            text: msg.content.length > 120 ? msg.content.slice(0, 120) + "..." : msg.content,
            fromUser: msg.user?.name,
            timestamp: msg.createdAt,
          });
          break;
        }
      }
    }
    if (highlights.length >= 10) break;
  }

  return highlights;
}

export default function SmartHighlights({
  messages,
  collapsed: initialCollapsed = true,
}: {
  messages: any[];
  collapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const highlights = useMemo(() => detectHighlights(messages), [messages]);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Smart Highlights</span>
          {highlights.length > 0 && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {highlights.length}
            </span>
          )}
        </div>
        <ArrowRight className={`w-4 h-4 text-muted-foreground transition-transform ${collapsed ? "" : "rotate-90"}`} />
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2 max-h-[300px] overflow-y-auto">
              {highlights.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No highlights detected yet. Start a conversation to see them here.
                </p>
              ) : (
                highlights.map((h, i) => {
                  const cfg = highlightConfig[h.type];
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={cn("flex items-start gap-2.5 p-2.5 rounded-lg border-l-2", cfg.bg)}
                      style={{ borderLeftColor: cfg.color.replace("text-", "") }}
                    >
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5", cfg.bg)}>
                        <span className={cfg.color}>{cfg.icon}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                          {h.type.replace("-", " ")}
                          {h.fromUser && <span> &middot; {h.fromUser}</span>}
                        </p>
                        <p className="text-xs text-foreground leading-relaxed">{h.text}</p>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
