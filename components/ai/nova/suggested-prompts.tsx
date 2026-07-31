"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

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
      transition={{ delay: 0.2, duration: 0.4 }}
      className="flex flex-col items-center justify-center pt-10 pb-4"
    >
      <h2 className="text-2xl sm:text-[26px] font-semibold tracking-tight text-slate-900 dark:text-white">
        What can I help you with today?
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 mb-7">
        Ask Nova to summarize, plan, or analyze your workspace
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-md">
        {SUGGESTED.map((s) => (
          <button
            key={s.label}
            onClick={() => onSelect(s.prompt)}
            className="group flex items-start gap-2.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all rounded-xl p-3.5 text-left"
          >
            <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
              {s.label}
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
