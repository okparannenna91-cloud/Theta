"use client";

import React, { useState, useEffect } from "react";
import {
  Workflow, Zap, AlertTriangle, Search, ArrowRight, Info,
  Shield, GitBranch, Play, Clock, CheckCircle2, Bell, Mail, UserPlus
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TriggerDef {
  trigger: string;
  description: string;
}

interface ActionDef {
  action: string;
  description: string;
}

interface AutomationSectionData {
  triggers: TriggerDef[];
  actions: ActionDef[];
  safetyRules: string[];
}

const TRIGGER_ICONS: Record<string, React.ElementType> = {
  TASK_CREATED: Play,
  TASK_COMPLETED: CheckCircle2,
  SPRINT_STARTED: Clock,
  SPRINT_COMPLETED: Clock,
  FORM_SUBMITTED: Info,
  DOCUMENT_UPDATED: Info,
  USER_INVITED: UserPlus,
  TASK_OVERDUE: AlertTriangle,
  MEMBER_ADDED: UserPlus,
};

const TRIGGER_COLORS: Record<string, string> = {
  TASK_CREATED: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-400",
  TASK_COMPLETED: "from-green-500/10 to-green-600/5 border-green-500/20 text-green-400",
  SPRINT_STARTED: "from-cyan-500/10 to-cyan-600/5 border-cyan-500/20 text-cyan-400",
  SPRINT_COMPLETED: "from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-400",
  FORM_SUBMITTED: "from-amber-500/10 to-amber-600/5 border-amber-500/20 text-amber-400",
  DOCUMENT_UPDATED: "from-violet-500/10 to-violet-600/5 border-violet-500/20 text-violet-400",
  USER_INVITED: "from-indigo-500/10 to-indigo-600/5 border-indigo-500/20 text-indigo-400",
  TASK_OVERDUE: "from-rose-500/10 to-rose-600/5 border-rose-500/20 text-rose-400",
  MEMBER_ADDED: "from-pink-500/10 to-pink-600/5 border-pink-500/20 text-pink-400",
};

const ACTION_ICONS: Record<string, React.ElementType> = {
  CREATE_TASK: Play,
  ASSIGN_USER: UserPlus,
  SEND_EMAIL: Mail,
  UPDATE_STATUS: GitBranch,
  GENERATE_REPORT: Info,
  NOTIFY_TEAM: Bell,
  CREATE_PROJECT: Workflow,
  SEND_NOTIFICATION: Bell,
  NOTIFY_CHANNEL: Bell,
  SET_ASSIGNEE: UserPlus,
};

export function AutomationDashboard() {
  const [data, setData] = useState<AutomationSectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"triggers" | "actions" | "safety">("triggers");
  const [selectedTrigger, setSelectedTrigger] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai/constitution?section=12")
      .then(r => r.json())
      .then(d => {
        const s = d?.data;
        setData({
          triggers: s?.triggers || [],
          actions: s?.actions || [],
          safetyRules: s?.safetyRules || [],
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 animate-pulse mx-auto" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Automation Intelligence</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Workflow className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-black text-white uppercase tracking-wider">Automation Intelligence</h1>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Section 12 — Nova Automation Capabilities</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(["triggers", "actions", "safety"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all",
              activeTab === tab
                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                : "bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-300"
            )}
          >
            {tab === "triggers" && <Play className="w-3 h-3 inline mr-1.5" />}
            {tab === "actions" && <Zap className="w-3 h-3 inline mr-1.5" />}
            {tab === "safety" && <Shield className="w-3 h-3 inline mr-1.5" />}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "triggers" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.triggers.map((t, i) => {
            const Icon = TRIGGER_ICONS[t.trigger] || Zap;
            const colorClass = TRIGGER_COLORS[t.trigger] || "from-slate-500/10 to-slate-600/5 border-slate-500/20 text-slate-400";
            return (
              <div
                key={i}
                className={cn(
                  "rounded-2xl border p-5 bg-gradient-to-br space-y-3 transition-all hover:scale-[1.02] cursor-pointer group",
                  colorClass,
                  selectedTrigger === t.trigger && "ring-2 ring-cyan-500/40"
                )}
                onClick={() => setSelectedTrigger(selectedTrigger === t.trigger ? null : t.trigger)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">{t.trigger.replace(/_/g, " ")}</h3>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">{t.description}</p>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "actions" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.actions.map((a, i) => {
            const Icon = ACTION_ICONS[a.action] || Zap;
            return (
              <div
                key={i}
                className={cn(
                  "p-5 bg-slate-900/50 border border-slate-800 rounded-xl space-y-3 transition-all hover:scale-[1.02] cursor-pointer group hover:border-cyan-500/20",
                  selectedAction === a.action && "ring-2 ring-cyan-500/40"
                )}
                onClick={() => setSelectedAction(selectedAction === a.action ? null : a.action)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-cyan-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">{a.action.replace(/_/g, " ")}</h3>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">{a.description}</p>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "safety" && (
        <div className="space-y-3">
          {data?.safetyRules.map((rule, i) => (
            <div key={i} className="flex items-start gap-3 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
              <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span className="text-xs text-slate-300 font-medium">{rule}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
