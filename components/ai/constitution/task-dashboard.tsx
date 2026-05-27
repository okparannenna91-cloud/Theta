"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2, AlertTriangle, Clock, Flag, ArrowRight,
  Search, Zap, Brain, BarChart3, ListTodo, GanttChartSquare,
  UserCheck, AlertCircle, Info
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QualityStandard {
  attribute: string;
  description: string;
}

interface Capability {
  name: string;
  description: string;
}

interface TaskSectionData {
  qualityStandards: QualityStandard[];
  capabilities: Capability[];
  creationFlow: string[];
}

export function TaskDashboard() {
  const [data, setData] = useState<TaskSectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"standards" | "capabilities" | "flow">("standards");

  useEffect(() => {
    fetch("/api/ai/constitution?section=9")
      .then(r => r.json())
      .then(d => {
        const s = d?.data;
        setData({
          qualityStandards: s?.qualityStandards || [],
          capabilities: s?.capabilities || [],
          creationFlow: s?.creationFlow || [],
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 animate-pulse mx-auto" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Task Intelligence</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <ListTodo className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-black text-white uppercase tracking-wider">Task Intelligence</h1>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Section 9 — Nova Task Capabilities</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(["standards", "capabilities", "flow"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all",
              activeTab === tab
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-300"
            )}
          >
            {tab === "standards" && <CheckCircle2 className="w-3 h-3 inline mr-1.5" />}
            {tab === "capabilities" && <Zap className="w-3 h-3 inline mr-1.5" />}
            {tab === "flow" && <ArrowRight className="w-3 h-3 inline mr-1.5" />}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "standards" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.qualityStandards.map((s, i) => (
              <div key={i} className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2 group hover:border-emerald-500/20 transition-all">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">{s.attribute}</h3>
                </div>
                <p className="text-[11px] text-slate-400 font-medium ml-6">{s.description}</p>
              </div>
            ))}
          </div>
          {(!data?.qualityStandards || data.qualityStandards.length === 0) && (
            <div className="flex items-center justify-center py-12 text-xs text-slate-600">No quality standards loaded.</div>
          )}
        </div>
      )}

      {activeTab === "capabilities" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.capabilities.map((c, i) => (
              <div key={i} className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2 group hover:border-emerald-500/20 transition-all">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">{c.name}</h3>
                </div>
                <p className="text-[11px] text-slate-400 font-medium ml-6">{c.description}</p>
              </div>
            ))}
          </div>
          {(!data?.capabilities || data.capabilities.length === 0) && (
            <div className="flex items-center justify-center py-12 text-xs text-slate-600">No capabilities loaded.</div>
          )}
        </div>
      )}

      {activeTab === "flow" && (
        <div className="space-y-4">
          <div className="relative">
            {data?.creationFlow.map((step, i) => (
              <div key={i} className="flex items-start gap-4 pb-8 last:pb-0 relative">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                    <span className="text-[10px] font-black text-emerald-400">{i + 1}</span>
                  </div>
                  {i < (data?.creationFlow.length || 1) - 1 && (
                    <div className="w-px flex-1 bg-slate-800 mt-1" />
                  )}
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-xs text-slate-300 font-medium">{step}</p>
                </div>
              </div>
            ))}
          </div>
          {(!data?.creationFlow || data.creationFlow.length === 0) && (
            <div className="flex items-center justify-center py-12 text-xs text-slate-600">No creation flow loaded.</div>
          )}
        </div>
      )}
    </div>
  );
}
