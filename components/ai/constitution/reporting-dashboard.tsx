"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3, Clock, Mail, Bell, ArrowRight, Info, CheckCircle2,
  FileText, Globe, Zap, Search, BookOpen, FolderOpen, Target, Users
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportTypeDef {
  type: string;
  description: string;
  contents: string[];
}

interface ReportingSectionData {
  reportTypes: ReportTypeDef[];
  frequencies: string[];
  channels: string[];
  generationProcess: string[];
  answers: string[];
}

const REPORT_ICONS: Record<string, React.ElementType> = {
  PROJECT: Globe,
  SPRINT: Zap,
  TEAM: Users,
  EXECUTIVE: Target,
  CLIENT: FolderOpen,
};

const REPORT_COLORS: Record<string, string> = {
  PROJECT: "from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-400",
  SPRINT: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-400",
  TEAM: "from-violet-500/10 to-violet-600/5 border-violet-500/20 text-violet-400",
  EXECUTIVE: "from-amber-500/10 to-amber-600/5 border-amber-500/20 text-amber-400",
  CLIENT: "from-rose-500/10 to-rose-600/5 border-rose-500/20 text-rose-400",
};

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  DASHBOARD: BarChart3,
  EMAIL: Mail,
  CLIENT_PORTAL: Globe,
  NOTIFICATION: Bell,
};

export function ReportingDashboard() {
  const [data, setData] = useState<ReportingSectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"types" | "process" | "distribution">("types");
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai/constitution?section=16")
      .then(r => r.json())
      .then(d => {
        const s = d?.data;
        setData({
          reportTypes: s?.reportTypes || [],
          frequencies: s?.frequencies || [],
          channels: s?.channels || [],
          generationProcess: s?.generationProcess || [],
          answers: s?.answers || [],
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
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Reporting Intelligence</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-black text-white uppercase tracking-wider">Reporting Intelligence</h1>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Section 16 — Nova Reporting Capabilities</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["types", "process", "distribution"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all",
              activeTab === tab
                ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                : "bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-300"
            )}
          >
            {tab === "types" && <BookOpen className="w-3 h-3 inline mr-1.5" />}
            {tab === "process" && <ArrowRight className="w-3 h-3 inline mr-1.5" />}
            {tab === "distribution" && <Bell className="w-3 h-3 inline mr-1.5" />}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "types" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.reportTypes.map((r, i) => {
            const Icon = REPORT_ICONS[r.type] || FileText;
            const colorClass = REPORT_COLORS[r.type] || "from-slate-500/10 to-slate-600/5 border-slate-500/20 text-slate-400";
            return (
              <div
                key={i}
                className={cn(
                  "rounded-2xl border p-5 bg-gradient-to-br space-y-3 transition-all hover:scale-[1.02] cursor-pointer group",
                  colorClass,
                  expandedReport === r.type && "ring-2 ring-blue-500/40"
                )}
                onClick={() => setExpandedReport(expandedReport === r.type ? null : r.type)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">{r.type}</h3>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Report</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">{r.description}</p>
                {expandedReport === r.type && (
                  <div className="space-y-2 pt-2 border-t border-slate-800/50">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Contents</span>
                    {r.contents.map((c, j) => (
                      <div key={j} className="flex items-center gap-2 text-[11px] text-slate-400">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span className="font-medium">{c}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "process" && (
        <div className="relative">
          {data?.generationProcess.map((step, i) => (
            <div key={i} className="flex items-start gap-4 pb-8 last:pb-0 relative">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                  <span className="text-[10px] font-black text-blue-400">{i + 1}</span>
                </div>
                {i < (data?.generationProcess.length || 1) - 1 && <div className="w-px flex-1 bg-slate-800 mt-1" />}
              </div>
              <div className="flex-1 pt-1">
                <p className="text-xs text-slate-300 font-medium">{step}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "distribution" && (
        <div className="space-y-6">
          {/* Frequencies */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Frequencies</h3>
            <div className="flex flex-wrap gap-2">
              {data?.frequencies.map((f, i) => (
                <span key={i} className="text-[9px] font-bold text-slate-400 px-3 py-1.5 rounded-lg bg-slate-900/50 border border-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Channels */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Distribution Channels</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data?.channels.map((ch, i) => {
                const Icon = CHANNEL_ICONS[ch] || Bell;
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl group hover:border-blue-500/20 transition-all">
                    <Icon className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-xs text-slate-300 font-medium">{ch.replace(/_/g, " ")}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* What Every Report Answers */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Every Report Answers</h3>
            {data?.answers.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-800 rounded-xl">
                <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-xs text-slate-300 font-medium">{a}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
