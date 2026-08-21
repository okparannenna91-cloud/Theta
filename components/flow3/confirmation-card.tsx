"use client";

import React from "react";
import { AlertTriangle, CheckCircle, XCircle, Loader2, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmationCardProps {
  toolName: string;
  reason: string;
  args: Record<string, unknown>;
  onApprove: (token: string) => void;
  onDeny: () => void;
  isLoading?: boolean;
}

export function ConfirmationCard({ toolName, reason, args, onApprove, onDeny, isLoading }: ConfirmationCardProps) {
  const formatArgs = (args: Record<string, unknown>) => {
    try {
      return Object.entries(args)
        .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
        .join(", ");
    } catch {
      return "See details";
    }
  };

  return (
    <div className="border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-amber-800 dark:text-amber-200">Action requires confirmation</span>
            <span className="text-xs px-2 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-300 rounded-full">
              {toolName}
            </span>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">{reason}</p>
          <details className="mb-3">
            <summary className="text-xs text-amber-600 dark:text-amber-400 cursor-pointer hover:underline">
              View arguments
            </summary>
            <pre className="mt-2 text-xs bg-amber-100 dark:bg-amber-900/30 p-2 rounded font-mono overflow-x-auto text-amber-800 dark:text-amber-200">
              {JSON.stringify(args, null, 2)}
            </pre>
          </details>
          <div className="flex gap-2">
            <button
              onClick={() => onDeny()}
              disabled={isLoading}
              className={cn(
                "flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600",
                "hover:bg-gray-50 dark:hover:bg-gray-700",
                "text-gray-700 dark:text-gray-200",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Cancelling...
                </span>
              ) : (
                "Cancel"
              )}
            </button>
            <button
              onClick={() => onApprove("")}
              disabled={isLoading}
              className={cn(
                "flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                "bg-amber-600 hover:bg-amber-700 text-white",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Approving...
                </span>
              ) : (
                "Approve"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}