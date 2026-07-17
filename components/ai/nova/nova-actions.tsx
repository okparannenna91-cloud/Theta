"use client";

import { Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { QUICK_ACTIONS, BLUEPRINTS } from "./types";

interface Props {
  auditLogs: any[];
  onSetInput: (v: string) => void;
  onSetActiveTab: (v: string) => void;
}

export function NovaActions({ auditLogs, onSetInput, onSetActiveTab }: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 m-0 bg-slate-50/30">
      <div className="space-y-6">
        <div>
          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((action, i) => (
              <button
                key={i}
                onClick={() => { onSetInput(action.prompt); onSetActiveTab("chat"); }}
                className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center gap-3 hover:border-primary/50 hover:shadow-md transition-all active:scale-95 group"
              >
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shadow-sm", action.color)}>
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Blueprints</h3>
            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 ml-4" />
          </div>
          <div className="space-y-2">
            {BLUEPRINTS.map((t, i) => (
              <button
                key={i}
                onClick={() => { onSetInput(t.prompt); onSetActiveTab("chat"); }}
                className="w-full p-3 text-left bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-primary/5 dark:hover:bg-primary/5 hover:border-primary/30 transition-all flex items-center gap-3"
              >
                <div className="h-9 w-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <t.icon className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-extrabold text-slate-900 dark:text-white leading-none mb-0.5 truncate">{t.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium truncate">{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {auditLogs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Recent Tool Executions</h3>
              <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 ml-4" />
            </div>
            <div className="space-y-2">
              {auditLogs.slice(0, 5).map((log: any, i: number) => {
                const meta = log.metadata || {};
                const toolName = meta.tool || log.entityId || "unknown";
                return (
                  <div key={log.id || i} className="flex items-center gap-3 p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <Terminal className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-semibold text-slate-900 dark:text-white block truncate">{toolName.replace(/_/g, " ")}</span>
                      <span className="text-[9px] text-slate-500 block truncate">
                        {meta.params
                          ? Object.keys(meta.params)
                              .filter((k: string) => meta.params[k])
                              .map((k: string) => `${k}: ${String(meta.params[k]).substring(0, 20)}`)
                              .join(" · ")
                          : "No parameters"}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400 shrink-0">
                      {log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
