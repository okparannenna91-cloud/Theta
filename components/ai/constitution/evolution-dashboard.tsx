"use client";

import React, { useState, useEffect } from "react";
import {
  Lightbulb, CheckCircle2, ArrowRight, Info, Target, Zap,
  Bot, Users, Globe, Rocket, Brain, Cpu, Eye, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Milestone {
  stage: string;
  target: string;
  capabilities: string[];
}

interface EvolutionSectionData {
  milestones: Milestone[];
  longTermVision: string;
  futurePrinciples: string[];
  humanControlRule: string;
  currentStage: string;
}

const STAGE_ICONS: Record<string, React.ElementType> = {
  ASSISTANT: Bot,
  OPERATOR: Cpu,
  MANAGER: Brain,
  COORDINATOR: Users,
  WORKFORCE: Rocket,
};

const STAGE_COLORS: Record<string, string> = {
  ASSISTANT: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20",
  OPERATOR: "from-blue-500/10 to-blue-600/5 border-blue-500/20",
  MANAGER: "from-violet-500/10 to-violet-600/5 border-violet-500/20",
  COORDINATOR: "from-amber-500/10 to-amber-600/5 border-amber-500/20",
  WORKFORCE: "from-rose-500/10 to-rose-600/5 border-rose-500/20",
};

const STAGE_BADGE_COLORS: Record<string, string> = {
  ASSISTANT: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  OPERATOR: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  MANAGER: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  COORDINATOR: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  WORKFORCE: "bg-rose-500/10 text-rose-400 border-rose-500/30",
};

export function EvolutionDashboard() {
  const [data, setData] = useState<EvolutionSectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai/constitution?section=20")
      .then(r => r.json())
      .then(d => {
        const s = d?.data;
        setData({
          milestones: s?.milestones || [],
          longTermVision: s?.longTermVision || "",
          futurePrinciples: s?.futurePrinciples || [],
          humanControlRule: s?.humanControlRule || "",
          currentStage: s?.currentStage || "ASSISTANT",
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 animate-pulse mx-auto" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Evolution Roadmap</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
          <Lightbulb className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-black text-white uppercase tracking-wider">Evolution Roadmap</h1>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Section 20 — Nova Future Evolution</p>
        </div>
      </div>

      {/* Current Stage Badge */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-800">
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Current Stage:</span>
        <span className={cn(
          "text-[10px] font-black px-3 py-1 rounded-lg border uppercase tracking-wider",
          STAGE_BADGE_COLORS[data?.currentStage || "ASSISTANT"]
        )}>
          {data?.currentStage || "ASSISTANT"}
        </span>
      </div>

      {/* Evolution Timeline */}
      <div className="relative">
        {data?.milestones.map((m, i) => {
          const Icon = STAGE_ICONS[m.stage] || Bot;
          const colorClass = STAGE_COLORS[m.stage] || "from-slate-500/10 to-slate-600/5 border-slate-500/20";
          const isCurrent = m.stage === data?.currentStage;
          return (
            <div key={i} className="flex items-start gap-4 pb-8 last:pb-0 relative">
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all",
                  isCurrent ? "bg-purple-500/20 border-purple-500 shadow-lg shadow-purple-500/20" : "bg-slate-900/80 border-slate-700"
                )}>
                  <Icon className={cn("w-5 h-5", isCurrent ? "text-purple-400" : "text-slate-500")} />
                </div>
                {i < (data?.milestones.length || 1) - 1 && (
                  <div className={cn("w-0.5 flex-1 mt-2", isCurrent ? "bg-gradient-to-b from-purple-500/50 to-slate-800" : "bg-slate-800")} />
                )}
              </div>
              <div className={cn(
                "flex-1 pt-1 rounded-2xl border p-5 bg-gradient-to-br transition-all cursor-pointer group",
                colorClass,
                isCurrent && "ring-2 ring-purple-500/40",
                expandedStage === m.stage && "scale-[1.02]"
              )}
                onClick={() => setExpandedStage(expandedStage === m.stage ? null : m.stage)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className={cn(
                    "text-sm font-black uppercase tracking-wider",
                    isCurrent ? "text-purple-400" : "text-white"
                  )}>
                    {m.stage}
                    {isCurrent && <span className="ml-2 text-[8px] text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full">ACTIVE</span>}
                  </h3>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{m.target}</span>
                </div>
                {expandedStage === m.stage && (
                  <div className="space-y-2 pt-3 border-t border-slate-800/50">
                    {m.capabilities.map((cap, j) => (
                      <div key={j} className="flex items-center gap-2 text-[11px] text-slate-400">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span className="font-medium">{cap}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Long Term Vision */}
      <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl space-y-3">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Long-Term Vision</h3>
        <p className="text-xs text-slate-300 font-medium leading-relaxed">{data?.longTermVision}</p>
      </div>

      {/* Future Principles */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Future Principles</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data?.futurePrinciples.map((p, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl group hover:border-purple-500/20 transition-all">
              <Target className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="text-xs text-slate-300 font-medium">{p}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Human Control Rule */}
      <div className="p-5 bg-rose-500/5 border border-rose-500/20 rounded-xl space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-rose-400" />
          <h3 className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em]">Human Control Rule</h3>
        </div>
        <p className="text-xs text-slate-300 font-medium leading-relaxed ml-6">{data?.humanControlRule}</p>
      </div>
    </div>
  );
}
