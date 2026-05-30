"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu, Layers, Zap, AlertTriangle, CheckCircle2, ArrowRight,
  Search, Brain, Server, Globe, Sparkles, Info, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ModelStackEntry {
  provider: string;
  layer: string;
  purpose: string;
}

interface SelectionStrategy {
  complexity: string;
  description: string;
  recommendedModels: string[];
}

interface AiModelsSectionData {
  modelStack: ModelStackEntry[];
  selectionStrategies: SelectionStrategy[];
  selectionRules: string[];
}

const PROVIDER_ICONS: Record<string, React.ElementType> = {
  OpenRouter: Globe,
  Cohere: Brain,
  OpenAI: Sparkles,
  Gemini: Cpu,
};

const PROVIDER_COLORS: Record<string, string> = {
  OpenRouter: "from-indigo-500/10 to-indigo-600/5 border-indigo-500/20 text-indigo-400",
  Cohere: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-400",
  OpenAI: "from-green-500/10 to-green-600/5 border-green-500/20 text-green-400",
  Gemini: "from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-400",
};

const COMPLEXITY_ICONS: Record<string, React.ElementType> = {
  SIMPLE: Zap,
  REASONING: Brain,
  CRITICAL: Shield,
};

export function AiModelsDashboard() {
  const [data, setData] = useState<AiModelsSectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stack" | "strategies" | "rules">("stack");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/ai/constitution?section=6")
      .then(r => r.json())
      .then(d => {
        const s = d?.data;
        setData({
          modelStack: s?.modelStack || [],
          selectionStrategies: s?.selectionStrategies || [],
          selectionRules: s?.selectionRules || [],
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 animate-pulse mx-auto" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading AI Model Configuration</p>
        </div>
      </div>
    );
  }

  const filteredStack = (data?.modelStack || []).filter(m =>
    m.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.layer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-wider">AI Models</h1>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Section 6 — Nova Model Stack</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input type="text" placeholder="Search providers..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-48 pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50" />
        </div>
      </div>

      <div className="flex gap-2">
        {(["stack", "strategies", "rules"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all",
              activeTab === tab ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" : "bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-300")}>
            {tab === "stack" && <Server className="w-3 h-3 inline mr-1.5" />}
            {tab === "strategies" && <Layers className="w-3 h-3 inline mr-1.5" />}
            {tab === "rules" && <CheckCircle2 className="w-3 h-3 inline mr-1.5" />}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "stack" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredStack.map((m, i) => {
            const Icon = PROVIDER_ICONS[m.provider] || Cpu;
            const colorClass = PROVIDER_COLORS[m.provider] || "from-slate-500/10 to-slate-600/5 border-slate-500/20 text-slate-400";
            return (
              <div key={i} className={cn("rounded-2xl border p-5 bg-gradient-to-br space-y-3 transition-all hover:scale-[1.02] group", colorClass)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">{m.provider}</h3>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{m.layer}</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">{m.purpose}</p>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "strategies" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data?.selectionStrategies.map((s, i) => {
            const Icon = COMPLEXITY_ICONS[s.complexity] || Cpu;
            return (
              <div key={i} className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl space-y-4 group hover:border-indigo-500/20 transition-all">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">{s.complexity}</h3>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">{s.description}</p>
                <div className="space-y-1.5">
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Recommended Models</span>
                  {s.recommendedModels.map((model, j) => (
                    <div key={j} className="flex items-center gap-2 text-[11px] text-slate-400">
                      <ArrowRight className="w-2.5 h-2.5 text-slate-600 shrink-0" />
                      <span className="font-medium">{model}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "rules" && (
        <div className="space-y-3">
          {data?.selectionRules.map((rule, i) => (
            <div key={i} className="flex items-start gap-3 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span className="text-xs text-slate-300 font-medium">{rule}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
