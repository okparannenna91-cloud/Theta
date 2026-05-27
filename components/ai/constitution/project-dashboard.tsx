"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3, AlertTriangle, TrendingUp, ArrowRight, Search,
  Target, Layers, Clock, CheckCircle2, AlertCircle, Eye, Info, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StructureStandard {
  component: string;
  description: string;
}

interface Capability {
  name: string;
  description: string;
}

interface ProjectSectionData {
  structureStandards: StructureStandard[];
  capabilities: Capability[];
  creationFlow: string[];
  monitoringAreas: string[];
}

export function ProjectDashboard() {
  const [data, setData] = useState<ProjectSectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"standards" | "capabilities" | "flow" | "monitoring">("standards");

  useEffect(() => {
    fetch("/api/ai/constitution?section=10")
      .then(r => r.json())
      .then(d => {
        const s = d?.data;
        setData({
          structureStandards: s?.structureStandards || [],
          capabilities: s?.capabilities || [],
          creationFlow: s?.creationFlow || [],
          monitoringAreas: s?.monitoringAreas || [],
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 animate-pulse mx-auto" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Project Intelligence</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "standards", label: "Standards", icon: Layers },
    { key: "capabilities", label: "Capabilities", icon: Zap },
    { key: "flow", label: "Creation Flow", icon: ArrowRight },
    { key: "monitoring", label: "Monitoring", icon: Eye },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-black text-white uppercase tracking-wider">Project Intelligence</h1>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Section 10 — Nova Project Capabilities</p>
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
                ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                : "bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-300"
            )}
          >
            <tab.icon className="w-3 h-3 inline mr-1.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "standards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.structureStandards.map((s, i) => (
            <div key={i} className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2 group hover:border-blue-500/20 transition-all">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">{s.component}</h3>
              </div>
              <p className="text-[11px] text-slate-400 font-medium ml-6">{s.description}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === "capabilities" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.capabilities.map((c, i) => (
            <div key={i} className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2 group hover:border-blue-500/20 transition-all">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">{c.name}</h3>
              </div>
              <p className="text-[11px] text-slate-400 font-medium ml-6">{c.description}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === "flow" && (
        <div className="relative">
          {data?.creationFlow.map((step, i) => (
            <div key={i} className="flex items-start gap-4 pb-8 last:pb-0 relative">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                  <span className="text-[10px] font-black text-blue-400">{i + 1}</span>
                </div>
                {i < (data?.creationFlow.length || 1) - 1 && <div className="w-px flex-1 bg-slate-800 mt-1" />}
              </div>
              <div className="flex-1 pt-1">
                <p className="text-xs text-slate-300 font-medium">{step}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "monitoring" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data?.monitoringAreas.map((area, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl group hover:border-blue-500/20 transition-all">
              <Eye className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-xs text-slate-300 font-medium">{area}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
