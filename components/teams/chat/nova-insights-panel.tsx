"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Brain,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  ListChecks,
  Lightbulb,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Insight {
  type: "summary" | "decision" | "issue" | "task" | "action";
  text: string;
}

export default function NovaInsightsPanel({
  teamId,
  workspaceId,
  messages,
}: {
  teamId: string;
  workspaceId: string;
  messages: any[];
}) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [generated, setGenerated] = useState(false);

  const generateInsights = async () => {
    if (generated) return;
    setLoading(true);
    try {
      const recentMessages = messages.slice(-20);
      const context = recentMessages.map((m: any) => `${m.user?.name || "User"}: ${m.content}`).join("\n");

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Analyze this team chat conversation and provide:
1. A one-sentence summary
2. Key decisions made
3. Unresolved issues
4. Tasks mentioned
5. Suggested actions

Conversation:
${context}`,
          workspaceId,
          teamId,
          stream: false,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate insights");

      const text = await res.text();
      const lines = text.split("\n").filter(Boolean);

      const parsedInsights: Insight[] = [];
      for (const line of lines) {
        if (line.toLowerCase().includes("summary") || line.toLowerCase().match(/^\d+\./)) {
          const clean = line.replace(/^\d+\.\s*/, "").replace(/^[•\-*]\s*/, "").trim();
          if (!clean) continue;
          if (line.toLowerCase().includes("summary")) {
            parsedInsights.push({ type: "summary", text: clean });
          } else if (line.toLowerCase().includes("decision")) {
            parsedInsights.push({ type: "decision", text: clean });
          } else if (line.toLowerCase().includes("issue") || line.toLowerCase().includes("unresolved")) {
            parsedInsights.push({ type: "issue", text: clean });
          } else if (line.toLowerCase().includes("task")) {
            parsedInsights.push({ type: "task", text: clean });
          } else if (line.toLowerCase().includes("action") || line.toLowerCase().includes("suggest")) {
            parsedInsights.push({ type: "action", text: clean });
          } else {
            parsedInsights.push({ type: "summary", text: clean });
          }
        }
      }

      if (parsedInsights.length === 0) {
        parsedInsights.push({ type: "summary", text });
      }

      setInsights(parsedInsights);
      setGenerated(true);
    } catch {
      setInsights([{ type: "summary", text: "Could not generate insights right now." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!collapsed && !generated && !loading) {
    generateInsights();
  }

  const iconMap: Record<string, React.ReactNode> = {
    summary: <Sparkles className="w-3.5 h-3.5 text-primary" />,
    decision: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
    issue: <AlertCircle className="w-3.5 h-3.5 text-rose-500" />,
    task: <ListChecks className="w-3.5 h-3.5 text-amber-500" />,
    action: <Lightbulb className="w-3.5 h-3.5 text-purple-500" />,
  };

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Nova Insights</span>
          {loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
        </div>
        {loading ? null : (
          <ArrowRight className={`w-4 h-4 text-muted-foreground transition-transform ${collapsed ? "" : "rotate-90"}`} />
        )}
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-6 gap-3">
                  <div className="relative">
                    <Brain className="w-8 h-8 text-primary/40 animate-pulse" />
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                  </div>
                  <p className="text-xs text-muted-foreground">Nova is analyzing the conversation...</p>
                </div>
              ) : insights.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {generated ? "No insights found." : "Open to analyze the conversation."}
                </p>
              ) : (
                <>
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">
                    {messages.length > 0
                      ? `Based on ${messages.length} messages`
                      : "Conversation Analysis"}
                  </div>
                  {insights.map((insight, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-2.5"
                    >
                      <div className="mt-0.5">{iconMap[insight.type]}</div>
                      <p className="text-xs text-foreground leading-relaxed">{insight.text}</p>
                    </motion.div>
                  ))}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
