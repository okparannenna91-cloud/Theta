"use client";

import React, { useState, useEffect } from "react";
import {
  Search, Globe, FileText, ListTodo, BookOpen, Users,
  BarChart3, MessageSquare, Database, Zap, ArrowRight,
  Info, CheckCircle2, Layers, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchDomainDef {
  domain: string;
  description: string;
}

interface SearchTypeDef {
  type: string;
  description: string;
}

interface SearchSectionData {
  domains: SearchDomainDef[];
  searchTypes: SearchTypeDef[];
  rankingPrinciples: string[];
  rules: string[];
}

const DOMAIN_ICONS: Record<string, React.ElementType> = {
  PROJECTS: Globe,
  TASKS: ListTodo,
  DOCUMENTS: FileText,
  SPRINTS: Zap,
  DASHBOARDS: BarChart3,
  CONVERSATIONS: MessageSquare,
  REPORTS: BarChart3,
  KNOWLEDGE_BASE: Database,
  GLOBAL: Globe,
};

const DOMAIN_COLORS: Record<string, string> = {
  PROJECTS: "from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-400",
  TASKS: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-400",
  DOCUMENTS: "from-violet-500/10 to-violet-600/5 border-violet-500/20 text-violet-400",
  SPRINTS: "from-amber-500/10 to-amber-600/5 border-amber-500/20 text-amber-400",
  DASHBOARDS: "from-indigo-500/10 to-indigo-600/5 border-indigo-500/20 text-indigo-400",
  CONVERSATIONS: "from-rose-500/10 to-rose-600/5 border-rose-500/20 text-rose-400",
  REPORTS: "from-cyan-500/10 to-cyan-600/5 border-cyan-500/20 text-cyan-400",
  KNOWLEDGE_BASE: "from-orange-500/10 to-orange-600/5 border-orange-500/20 text-orange-400",
  GLOBAL: "from-slate-500/10 to-slate-600/5 border-slate-500/20 text-slate-400",
};

export function SearchDashboard() {
  const [data, setData] = useState<SearchSectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"domains" | "types" | "rules">("domains");
  const [simulatedQuery, setSimulatedQuery] = useState("");
  const [parsedResult, setParsedResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai/constitution?section=13")
      .then(r => r.json())
      .then(d => {
        const s = d?.data;
        setData({
          domains: s?.domains || [],
          searchTypes: s?.searchTypes || [],
          rankingPrinciples: s?.rankingPrinciples || [],
          rules: s?.rules || [],
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleParseQuery = () => {
    if (!simulatedQuery.trim()) return;
    const lower = simulatedQuery.toLowerCase();
    let domain = "GLOBAL";
    let type = "KEYWORD";
    if (lower.includes("task") || lower.includes("bug")) domain = "TASKS";
    else if (lower.includes("project")) domain = "PROJECTS";
    else if (lower.includes("doc") || lower.includes("notes")) domain = "DOCUMENTS";
    if (lower.includes("how") || lower.includes("why") || lower.includes("what")) type = "QUESTION_ANSWERING";
    else if (lower.split(" ").length > 3) type = "SEMANTIC";
    setParsedResult(`Domain: ${domain} | Type: ${type}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 animate-pulse mx-auto" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Search Intelligence</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Search className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-black text-white uppercase tracking-wider">Search Intelligence</h1>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Section 13 — Nova Search Capabilities</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(["domains", "types", "rules"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all",
              activeTab === tab
                ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                : "bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-300"
            )}
          >
            {tab === "domains" && <Globe className="w-3 h-3 inline mr-1.5" />}
            {tab === "types" && <Layers className="w-3 h-3 inline mr-1.5" />}
            {tab === "rules" && <CheckCircle2 className="w-3 h-3 inline mr-1.5" />}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "domains" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.domains.map((d, i) => {
            const Icon = DOMAIN_ICONS[d.domain] || Globe;
            const colorClass = DOMAIN_COLORS[d.domain] || "from-slate-500/10 to-slate-600/5 border-slate-500/20 text-slate-400";
            return (
              <div key={i} className={cn("rounded-2xl border p-5 bg-gradient-to-br space-y-3 transition-all hover:scale-[1.02] group", colorClass)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">{d.domain.replace(/_/g, " ")}</h3>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">{d.description}</p>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "types" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.searchTypes.map((t, i) => (
            <div key={i} className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2 group hover:border-indigo-500/20 transition-all">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">{t.type.replace(/_/g, " ")}</h3>
              </div>
              <p className="text-[11px] text-slate-400 font-medium ml-6">{t.description}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === "rules" && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Ranking Principles</h3>
            {data?.rankingPrinciples.map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-800 rounded-xl">
                <ArrowRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-xs text-slate-300 font-medium">{p}</span>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Intelligence Rules</h3>
            {data?.rules.map((r, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-800 rounded-xl">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-xs text-slate-300 font-medium">{r}</span>
              </div>
            ))}
          </div>

          {/* Query Simulator */}
          <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl space-y-3">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Query Simulator</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={simulatedQuery}
                onChange={e => setSimulatedQuery(e.target.value)}
                placeholder="e.g., find bugs in current sprint..."
                className="flex-1 px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
                onKeyDown={e => e.key === "Enter" && handleParseQuery()}
              />
              <button
                onClick={handleParseQuery}
                disabled={!simulatedQuery.trim()}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Parse
              </button>
            </div>
            {parsedResult && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-xs text-indigo-300 font-medium">{parsedResult}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
