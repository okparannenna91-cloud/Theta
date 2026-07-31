"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Loader2, CheckCircle2, RotateCcw, ArrowRight, Radar, RefreshCw } from "lucide-react";
import { useWorkspace } from "@/hooks/use-workspace";

interface NovaInsight {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  suggestedAction: string;
  dismissed: boolean;
  resolvedAt: string | null;
  createdAt: string;
}

const SEVERITY_STYLES: Record<string, string> = {
  low: "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  high: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  critical: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

export function NovaInsights() {
  const { activeWorkspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"active" | "all" | "dismissed">("active");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["nova-insights", activeWorkspaceId, filter],
    queryFn: async () => {
      const res = await fetch(`/api/nova/insights?workspaceId=${activeWorkspaceId}&filter=${filter}`);
      if (!res.ok) throw new Error("Failed to fetch Nova insights");
      return res.json();
    },
    enabled: !!activeWorkspaceId,
    refetchInterval: 60000,
  });

  const insights: NovaInsight[] = data?.insights || [];

  const dismissMutation = useMutation({
    mutationFn: async ({ id, dismissed }: { id: string; dismissed: boolean }) => {
      const res = await fetch(`/api/nova/insights/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissed }),
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nova-insights", activeWorkspaceId] });
    },
    onError: () => toast.error("Failed to update insight"),
  });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-1 border-b border-slate-100 px-4 py-2 dark:border-slate-800">
        {[
          { id: "active", label: "Active" },
          { id: "all", label: "All" },
          { id: "dismissed", label: "Dismissed" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as typeof filter)}
            className={cn(
              "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
              filter === f.id
                ? "bg-primary/10 text-primary"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            )}
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={() => refetch()}
          className="ml-auto rounded-md p-1.5 text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-slate-100"
          title="Refresh insights"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 sm:px-4">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          </div>
        ) : isError ? (
          <div className="flex h-32 items-center justify-center text-xs text-slate-500">
            Could not load insights.
          </div>
        ) : insights.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-1.5 text-center">
            <Radar className="h-5 w-5 text-slate-300 dark:text-slate-700" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {filter === "active" ? "All quiet — Nova is watching" : "Nothing here"}
            </p>
            <p className="max-w-[240px] text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
              Nova scans for overdue work, blockers, workload shifts, and risks. New observations appear here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className={cn(
                  "rounded-lg border border-slate-200/70 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/50",
                  insight.dismissed && "opacity-60"
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                          SEVERITY_STYLES[insight.severity] || SEVERITY_STYLES.low
                        )}
                      >
                        {insight.severity}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {insight.type.replace(/_/g, " ").toLowerCase()} · {formatDistanceToNow(new Date(insight.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs font-medium leading-snug text-slate-800 dark:text-slate-100">
                      {insight.title}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                      {insight.message}
                    </p>
                    {insight.suggestedAction && (
                      <p className="mt-1.5 flex items-start gap-1 text-[11px] text-primary/90">
                        <ArrowRight className="mt-0.5 h-2.5 w-2.5 flex-shrink-0" />
                        {insight.suggestedAction}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => dismissMutation.mutate({ id: insight.id, dismissed: !insight.dismissed })}
                    className={cn(
                      "rounded-md p-1.5 transition-colors",
                      insight.dismissed
                        ? "text-slate-300 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-300"
                        : "text-slate-300 hover:text-primary dark:text-slate-600 dark:hover:text-primary"
                    )}
                    title={insight.dismissed ? "Restore insight" : "Dismiss insight"}
                  >
                    {insight.dismissed ? (
                      <RotateCcw className="h-3.5 w-3.5" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
