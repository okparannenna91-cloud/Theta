"use client";

import React, { useState, useEffect } from "react";
import {
  Database, BookOpen, CheckCircle2, ArrowRight, Info,
  Server, Shield, Zap, Globe, Search, FileText, Users
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineStep {
  step: string;
  description: string;
}

interface KnowledgeSectionData {
  pipeline: PipelineStep[];
  sources: string[];
  citationRules: string[];
  storageArchitecture: Record<string, string>;
}

const STORAGE_ICONS: Record<string, React.ElementType> = {
  primary: Database,
  memory: Zap,
  fastRetrieval: Server,
};

const STORAGE_COLORS: Record<string, string> = {
  primary: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-400",
  memory: "from-violet-500/10 to-violet-600/5 border-violet-500/20 text-violet-400",
  fastRetrieval: "from-amber-500/10 to-amber-600/5 border-amber-500/20 text-amber-400",
};

export function KnowledgeDashboard() {
  const [data, setData] = useState<KnowledgeSectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pipeline" | "sources" | "rules" | "storage">("pipeline");

  useEffect(() => {
    fetch("/api/ai/constitution?section=14")
      .then(r => r.json())
      .then(d => {
        const s = d?.data;
        setData({
          pipeline: s?.pipeline || [],
          sources: s?.sources || [],
          citationRules: s?.citationRules || [],
          storageArchitecture: s?.storageArchitecture || {},
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 animate-pulse mx-auto" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Knowledge Intelligence</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "pipeline", label: "Pipeline", icon: ArrowRight },
    { key: "sources", label: "Sources", icon: BookOpen },
    { key: "rules", label: "Citation Rules", icon: CheckCircle2 },
    { key: "storage", label: "Architecture", icon: Database },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
          <Database className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-black text-white uppercase tracking-wider">Knowledge Intelligence</h1>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Section 14 — Nova Knowledge Capabilities</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all",
              activeTab === tab.key
                ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
                : "bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-300"
            )}
          >
            <tab.icon className="w-3 h-3 inline mr-1.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "pipeline" && (
        <div className="relative">
          {data?.pipeline.map((step, i) => (
            <div key={i} className="flex items-start gap-4 pb-8 last:pb-0 relative">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
                  <span className="text-[10px] font-black text-orange-400">{i + 1}</span>
                </div>
                {i < (data?.pipeline.length || 1) - 1 && <div className="w-px flex-1 bg-slate-800 mt-1" />}
              </div>
              <div className="flex-1 pt-1 space-y-1">
                <h3 className="text-xs font-black text-white uppercase tracking-wider">{step.step}</h3>
                <p className="text-[11px] text-slate-400 font-medium">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "sources" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data?.sources.map((src, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl group hover:border-orange-500/20 transition-all">
              <BookOpen className="w-4 h-4 text-orange-400 shrink-0" />
              <span className="text-xs text-slate-300 font-medium">{src}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === "rules" && (
        <div className="space-y-3">
          {data?.citationRules.map((rule, i) => (
            <div key={i} className="flex items-start gap-3 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-xs text-slate-300 font-medium">{rule}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === "storage" && data?.storageArchitecture && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(data.storageArchitecture).map(([key, value], i) => {
            const Icon = STORAGE_ICONS[key] || Database;
            const colorClass = STORAGE_COLORS[key] || "from-slate-500/10 to-slate-600/5 border-slate-500/20 text-slate-400";
            return (
              <div key={i} className={cn("rounded-2xl border p-5 bg-gradient-to-br space-y-3", colorClass)}>
                <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">{key.replace(/([A-Z])/g, " $1").trim()}</h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-1">{value as string}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
