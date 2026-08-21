"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ThinkingStep {
  id: string;
  label: string;
  detail?: string;
  status: "active" | "complete" | "error";
  startedAt: number;
  completedAt?: number;
}

interface ThinkingBlockProps {
  steps: ThinkingStep[];
  isActive: boolean;
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function ThinkingBlock({ steps, isActive }: ThinkingBlockProps) {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const completed = steps.filter((s) => s.status !== "active");
  const totalMs = steps.length
    ? (steps[steps.length - 1].completedAt ?? Date.now()) - steps[0].startedAt
    : 0;

  useEffect(() => {
    if (!isActive) setOpen(false);
  }, [isActive]);

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [steps, open]);

  if (steps.length === 0) return null;

  const activeStep = steps.find((s) => s.status === "active");

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "group flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors",
          "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/70 dark:hover:bg-zinc-700/70",
          "text-zinc-500 dark:text-zinc-400"
        )}
      >
        {isActive ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin text-violet-500" />
            <span className="animate-pulse">{activeStep?.label || "Thinking..."}</span>
          </>
        ) : (
          <span>
            Thought for {formatDuration(totalMs)}
            {completed.length > 0 ? ` · ${completed.length} step${completed.length > 1 ? "s" : ""}` : ""}
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          ref={listRef}
          className="mt-2 max-h-56 space-y-2 overflow-y-auto border-l-2 border-zinc-200 pl-3 dark:border-zinc-700"
        >
          {steps.map((step) => (
            <div key={step.id} className="text-xs">
              <div className="flex items-center gap-1.5">
                {step.status === "active" ? (
                  <Loader2 className="h-3 w-3 shrink-0 animate-spin text-violet-500" />
                ) : step.status === "error" ? (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                ) : (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                )}
                <span
                  className={cn(
                    step.status === "active"
                      ? "text-zinc-700 dark:text-zinc-300"
                      : "text-zinc-500 dark:text-zinc-400"
                  )}
                >
                  {step.label}
                </span>
                {step.status === "complete" && step.completedAt && (
                  <span className="ml-auto shrink-0 text-zinc-400">{formatDuration(step.completedAt - step.startedAt)}</span>
                )}
              </div>
              {step.detail && (
                <p className="ml-[18px] mt-0.5 font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                  {step.detail}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}