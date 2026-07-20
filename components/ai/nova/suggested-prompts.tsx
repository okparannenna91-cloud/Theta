"use client";

import { motion } from "framer-motion";
import { Lightbulb, ArrowRight } from "lucide-react";

const SUGGESTED = [
  { label: "Summarize my tasks", prompt: "Summarize my active tasks and priorities" },
  { label: "Plan my week", prompt: "Help me plan this week based on my current projects" },
  { label: "Check project health", prompt: "Run a health check on my workspace" },
  { label: "Create a task", prompt: "Create a task for " },
  { label: "Draft a status report", prompt: "Draft a status report for my team" },
  { label: "Analyze velocity", prompt: "Calculate our team velocity and suggest improvements" },
];

interface Props {
  onSelect: (prompt: string) => void;
}

export function SuggestedPrompts({ onSelect }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="flex flex-col items-center justify-center py-6 sm:py-10"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Lightbulb className="h-4 w-4 text-primary" />
        </div>
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Try asking
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-sm">
        {SUGGESTED.map((s) => (
          <button
            key={s.label}
            onClick={() => onSelect(s.prompt)}
            className="group flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/5 transition-all text-left"
          >
            <span className="flex-1 text-[11px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">
              {s.label}
            </span>
            <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </button>
        ))}
      </div>
    </motion.div>
  );
}
