"use client";

import React, { useState, useEffect } from "react";
import {
  Globe, CheckCircle2, XCircle, AlertTriangle, Search,
  ArrowRight, Info, Shield, Zap, Server, Database, Lock,
  Cpu, HardDrive, Mail, Wallet, Wifi, Cloud, Clock, Brain
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Service {
  name: string;
  provider: string;
  category: string;
  purpose: string;
  responsibilities: string[];
  fallback?: string;
}

interface EvalQuestion {
  question: string;
  description: string;
}

interface IntegrationData {
  approvedInfrastructure: Service[];
  evaluationQuestions: EvalQuestion[];
  disciplineRules: string[];
  totalServices: number;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  database: Database, auth: Lock, realtime: Wifi, memory: Brain,
  cache: Clock, ai: Cpu, storage: HardDrive, email: Mail,
  payments: Wallet, queue: Server,
};

const CATEGORY_COLORS: Record<string, string> = {
  database: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-400",
  auth: "from-rose-500/10 to-rose-600/5 border-rose-500/20 text-rose-400",
  realtime: "from-cyan-500/10 to-cyan-600/5 border-cyan-500/20 text-cyan-400",
  memory: "from-violet-500/10 to-violet-600/5 border-violet-500/20 text-violet-400",
  cache: "from-amber-500/10 to-amber-600/5 border-amber-500/20 text-amber-400",
  ai: "from-indigo-500/10 to-indigo-600/5 border-indigo-500/20 text-indigo-400",
  storage: "from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-400",
  email: "from-pink-500/10 to-pink-600/5 border-pink-500/20 text-pink-400",
  payments: "from-green-500/10 to-green-600/5 border-green-500/20 text-green-400",
  queue: "from-orange-500/10 to-orange-600/5 border-orange-500/20 text-orange-400",
};

export function IntegrationManagement() {
  const [data, setData] = useState<IntegrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"infrastructure" | "evaluate" | "rules">("infrastructure");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  // Evaluation form state
  const [serviceName, setServiceName] = useState("");
  const [category, setCategory] = useState("");
  const [purpose, setPurpose] = useState("");
  const [evalResult, setEvalResult] = useState<{ approved: boolean; reason: string; priority: number } | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);

  useEffect(() => {
    fetch("/api/ai/integration")
      .then(r => r.json())
      .then(d => {
        setData({
          approvedInfrastructure: d?.approvedInfrastructure || [],
          evaluationQuestions: d?.evaluationQuestions || [],
          disciplineRules: d?.disciplineRules || [],
          totalServices: d?.totalServices || 0,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleEvaluate = async () => {
    if (!serviceName || !category || !purpose) return;
    setEvalLoading(true);
    setEvalResult(null);
    try {
      const res = await fetch("/api/ai/integration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceName, category, purpose }),
      });
      const result = await res.json();
      setEvalResult(result);
    } catch {
      setEvalResult({ approved: false, reason: "Failed to evaluate integration", priority: 0 });
    }
    setEvalLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-green-500/10 animate-pulse mx-auto" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Integration Rules</p>
        </div>
      </div>
    );
  }

  const categories = [...new Set(data?.approvedInfrastructure.map(s => s.category) || [])];
  const filtered = (data?.approvedInfrastructure || []).filter(s => {
    const matchesFilter = !filterCategory || s.category === filterCategory;
    const matchesSearch = !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.purpose.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
          <Globe className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-black text-white uppercase tracking-wider">Integration Rules</h1>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Section 19 — Infrastructure Governance</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["infrastructure", "evaluate", "rules"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all",
              activeTab === tab
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-300"
            )}
          >
            {tab === "infrastructure" && <Server className="w-3 h-3 inline mr-1.5" />}
            {tab === "evaluate" && <Zap className="w-3 h-3 inline mr-1.5" />}
            {tab === "rules" && <Shield className="w-3 h-3 inline mr-1.5" />}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "infrastructure" && (
        <>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search infrastructure..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-48 pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-green-500/50"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setFilterCategory(null)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider border transition-all",
                  !filterCategory ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-slate-900/50 border-slate-800 text-slate-500"
                )}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider border transition-all",
                    filterCategory === cat ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-slate-900/50 border-slate-800 text-slate-500"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((svc, i) => {
              const Icon = CATEGORY_ICONS[svc.category] || Globe;
              const colorClass = CATEGORY_COLORS[svc.category] || "from-slate-500/10 to-slate-600/5 border-slate-500/20 text-slate-400";
              return (
                <div key={i} className={cn("rounded-2xl border p-5 bg-gradient-to-br space-y-3 transition-all hover:scale-[1.02] group", colorClass)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">{svc.name}</h3>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{svc.provider}</p>
                      </div>
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-slate-900/60 border border-slate-800 text-slate-500">{svc.category}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">{svc.purpose}</p>
                  {svc.fallback && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                      <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="text-[10px] font-bold text-amber-400">Fallback: {svc.fallback}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeTab === "evaluate" && (
        <div className="max-w-2xl space-y-6">
          <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl space-y-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Evaluate New Integration</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Service Name</label>
                <input type="text" value={serviceName} onChange={e => setServiceName(e.target.value)}
                  placeholder="e.g., Supabase"
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-green-500/50" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-green-500/50">
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Purpose</label>
                <input type="text" value={purpose} onChange={e => setPurpose(e.target.value)}
                  placeholder="e.g., Real-time database for task sync"
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-green-500/50" />
              </div>
              <button onClick={handleEvaluate} disabled={!serviceName || !category || !purpose || evalLoading}
                className="w-full py-2 rounded-lg bg-green-600 text-white text-[9px] font-black uppercase tracking-wider hover:bg-green-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                {evalLoading ? "Evaluating..." : "Evaluate"}
              </button>
            </div>
          </div>

          {evalResult && (
            <div className={cn("p-5 rounded-xl border space-y-3", evalResult.approved
              ? "bg-emerald-500/5 border-emerald-500/20" : "bg-rose-500/5 border-rose-500/20")}>
              <div className="flex items-center gap-2">
                {evalResult.approved
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  : <XCircle className="w-5 h-5 text-rose-400" />}
                <span className={cn("text-sm font-black uppercase tracking-wider", evalResult.approved ? "text-emerald-400" : "text-rose-400")}>
                  {evalResult.approved ? "Approved" : "Rejected"}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">{evalResult.reason}</p>
              <span className="text-[9px] font-bold text-slate-500">Priority Level: {evalResult.priority}</span>
            </div>
          )}

          {/* Evaluation Questions Reference */}
          {data?.evaluationQuestions && data.evaluationQuestions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Evaluation Questions</h3>
              {data.evaluationQuestions.map((q, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-slate-900/50 border border-slate-800 rounded-xl">
                  <Info className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-black text-white">{q.question}</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{q.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "rules" && (
        <div className="space-y-4">
          {data?.disciplineRules.map((rule, i) => (
            <div key={i} className="flex items-start gap-3 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
              <Shield className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              <span className="text-xs text-slate-300 font-medium">{rule}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
