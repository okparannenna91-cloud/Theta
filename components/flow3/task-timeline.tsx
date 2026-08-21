"use client";

import React, { useEffect, useRef } from "react";
import { Sparkles, Loader2, CheckCircle, ChevronDown, ChevronRight, Bot, Wand2, Check, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type StepType = "thinking" | "planning" | "tool" | "confirmation" | "complete" | "error";

export interface TimelineStep {
  id: string;
  type: StepType;
  label: string;
  detail?: string;
  status: "pending" | "active" | "complete" | "error";
  startedAt: number;
  completedAt?: number;
}

interface TaskTimelineProps {
  steps: TimelineStep[];
  isStreaming: boolean;
  pendingConfirmation?: {
    token: string;
    reason: string;
    toolName: string;
    args: Record<string, unknown>;
  } | null;
}

const STEP_CONFIG: Record<StepType, { icon: React.ElementType; color: string; bgColor: string }> = {
  thinking: { icon: Sparkles, color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-900/20" },
  planning: { icon: Wand2, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-900/20" },
  tool: { icon: Bot, color: "text-green-600", bgColor: "bg-green-50 dark:bg-green-900/20" },
  confirmation: { icon: AlertTriangle, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-900/20" },
  complete: { icon: CheckCircle, color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-900/20" },
  error: { icon: X, color: "text-red-600", bgColor: "bg-red-50 dark:bg-red-900/20" },
};

export function TaskTimeline({ steps, isStreaming, pendingConfirmation }: TaskTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && isStreaming) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [steps, isStreaming]);

  const renderStep = (step: TimelineStep, index: number) => {
    const { icon: Icon, color, bgColor } = STEP_CONFIG[step.type];
    const isLast = index === steps.length - 1;
    const duration = step.completedAt ? step.completedAt - step.startedAt : Date.now() - step.startedAt;
    const durationStr = duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(1)}s`;

    return (
      <div key={step.id} className="relative flex gap-3">
        <div className="flex flex-col items-center">
          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", color, bgColor)}>
            {step.status === "active" && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            {step.status === "complete" && <Icon className="w-4 h-4" />}
            {step.status === "pending" && <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />}
            {step.status === "error" && <Icon className="w-4 h-4" />}
          </div>
          {isLast && isStreaming ? (
            <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 mt-1 animate-pulse" />
          ) : (
            <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 mt-1" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("font-medium text-sm", color)}>{step.label}</span>
            {step.status === "complete" && <span className="text-xs text-gray-400">{durationStr}</span>}
            {step.status === "active" && <span className="text-xs text-gray-400 animate-pulse">Working...</span>}
          </div>
          {step.detail && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono bg-gray-50 dark:bg-gray-800/50 px-2 py-1 rounded">{step.detail}</p>
          )}
        </div>
      </div>
    );
  };

  if (steps.length === 0 && !isStreaming && !pendingConfirmation) {
    return null;
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span>Working in background</span>
          {isStreaming && <Loader2 className="w-4 h-4 animate-spin text-purple-600 ml-auto" />}
        </div>
      </div>
      <div ref={containerRef} className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {steps.map(renderStep)}
        {pendingConfirmation && (
          <div className="relative flex gap-3 animate-pulse">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-100 dark:bg-amber-900/30 text-amber-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 mt-1" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-amber-700 dark:text-amber-300">Waiting for confirmation</span>
                <span className="text-xs text-amber-500">Pending...</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                {pendingConfirmation.reason}
              </p>
              <div className="mt-2 flex gap-2">
                <span className="text-xs text-amber-600 dark:text-amber-400 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded">
                  Tool: {pendingConfirmation.toolName}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}