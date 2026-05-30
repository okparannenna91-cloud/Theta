"use client";

import React, { useState, useEffect } from "react";
import {
  Eye, Target, Layers, FileText, Users, Database, Clock, AlertTriangle,
  CheckCircle2, ArrowRight, RefreshCw, Search, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ContextSource {
  source: string;
  priority: number;
  description: string;
}

interface ContextConfig {
  priorityHierarchy: ContextSource[];
  rules: string[];
  windowStrategy: string[];
}

export function ContextInspector() {
  const [config, setConfig] = useState<ContextConfig | null>(null);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulatedContext, setSimulatedContext] = useState<Record<string, string>>({});
  const [contextInput, setContextInput] = useState("");

  useEffect(() => {
    fetch("/api/ai/constitution?section=8")
      .then(r => r.json())
      .then(data => {
        const d = data?.data;
        setConfig({
          priorityHierarchy: d?.priorityHierarchy || [],
          rules: d?.rules || [],
          windowStrategy: d?.windowStrategy || [],
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleAddContext = () => {
    if (!contextInput.trim()) return;
    const label = `Context ${Object.keys(simulatedContext).length + 1}`;
    setSimulatedContext(prev => ({ ...prev, [label]: contextInput }));
    setContextInput("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 animate-pulse mx-auto" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Context System</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Eye className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-wider">Context Inspector</h1>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Section 8 — Context System</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Priority Hierarchy */}
        <div className="lg:col-span-3 space-y-3">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Context Priority Hierarchy</h3>
          <div className="space-y-2">
            {config?.priorityHierarchy.map((source, i) => (
              <div
                key={i}
                onClick={() => setActiveSource(source.source)}
                className={cn(
                  "p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01]",
                  activeSource === source.source
                    ? "bg-cyan-500/10 border-cyan-500/30"
                    : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black",
                      source.priority <= 2 ? "bg-cyan-500/20 text-cyan-400" :
                      source.priority <= 4 ? "bg-blue-500/20 text-blue-400" :
                      "bg-slate-700/50 text-slate-400"
                    )}>
                      P{source.priority}
                    </div>
                    <span className="text-sm font-black text-white uppercase tracking-wider">{source.source.replace(/_/g, " ")}</span>
                  </div>
                  <span className={cn(
                    "text-[8px] font-black uppercase px-2 py-0.5 rounded",
                    source.priority <= 2 ? "bg-cyan-500/10 text-cyan-400" :
                    source.priority <= 4 ? "bg-blue-500/10 text-blue-400" :
                    "bg-slate-800 text-slate-500"
                  )}>
                    Priority {source.priority}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">{source.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Side Panels */}
        <div className="lg:col-span-2 space-y-6">
          {/* Context Rules */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Context Rules</h3>
            <div className="space-y-1.5">
              {config?.rules.map((rule, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-900/30 border border-slate-800/80">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="text-[11px] text-slate-300 font-medium">{rule}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Window Strategy */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Context Window Strategy</h3>
            <div className="space-y-1.5">
              {config?.windowStrategy.map((strategy, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-900/30 border border-slate-800/80">
                  <Target className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="text-[11px] text-slate-300 font-medium">{strategy}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Simulated Context */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Simulated Context</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={contextInput}
                onChange={e => setContextInput(e.target.value)}
                placeholder="Add context value..."
                className="flex-1 px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
                onKeyDown={e => e.key === "Enter" && handleAddContext()}
              />
              <button
                onClick={handleAddContext}
                disabled={!contextInput.trim()}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-[9px] font-black uppercase tracking-wider hover:bg-cyan-500 disabled:opacity-30 transition-all"
              >
                Add
              </button>
            </div>
            {Object.keys(simulatedContext).length === 0 ? (
              <p className="text-[11px] text-slate-600 text-center py-4">
                No simulated context loaded
              </p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {Object.entries(simulatedContext).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                    <Zap className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="text-[10px] font-bold text-cyan-300 shrink-0">{key}:</span>
                    <span className="text-[10px] text-slate-400 truncate">{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Context Preview */}
          <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 space-y-2">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Active Context Preview</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium font-mono leading-relaxed">
              {activeSource
                ? `Using context source: ${activeSource.replace(/_/g, " ")} (Priority ${config?.priorityHierarchy.find(s => s.source === activeSource)?.priority || "?"})`
                : "Click a context source to preview its details"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
