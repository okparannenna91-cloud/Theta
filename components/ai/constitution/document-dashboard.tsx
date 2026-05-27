"use client";

import React, { useState, useEffect } from "react";
import {
  FileText, ArrowRight, Search, ListChecks, AlertTriangle,
  Target, CheckCircle2, GitBranch, Info, BookOpen, FileOutput, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentTypeDef {
  type: string;
  description: string;
}

interface DocumentAction {
  name: string;
  description: string;
}

interface DocumentSectionData {
  documentTypes: DocumentTypeDef[];
  actions: DocumentAction[];
  pipeline: string[];
  linkTypes: string[];
}

const DOC_ICONS: Record<string, React.ElementType> = {
  PRD: Target,
  TECHNICAL_SPEC: GitBranch,
  MEETING_NOTES: BookOpen,
  SOP: ListChecks,
  KNOWLEDGE_ARTICLE: Info,
  PROJECT_BRIEF: FileText,
  RETROSPECTIVE: AlertTriangle,
  RESEARCH_REPORT: FileOutput,
  TEAM_DOCUMENTATION: BookOpen,
  GENERAL: FileText,
};

const DOC_COLORS: Record<string, string> = {
  PRD: "from-violet-500/10 to-violet-600/5 border-violet-500/20 text-violet-400",
  TECHNICAL_SPEC: "from-cyan-500/10 to-cyan-600/5 border-cyan-500/20 text-cyan-400",
  MEETING_NOTES: "from-amber-500/10 to-amber-600/5 border-amber-500/20 text-amber-400",
  SOP: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-400",
  KNOWLEDGE_ARTICLE: "from-indigo-500/10 to-indigo-600/5 border-indigo-500/20 text-indigo-400",
  PROJECT_BRIEF: "from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-400",
  RETROSPECTIVE: "from-rose-500/10 to-rose-600/5 border-rose-500/20 text-rose-400",
  RESEARCH_REPORT: "from-purple-500/10 to-purple-600/5 border-purple-500/20 text-purple-400",
  TEAM_DOCUMENTATION: "from-orange-500/10 to-orange-600/5 border-orange-500/20 text-orange-400",
  GENERAL: "from-slate-500/10 to-slate-600/5 border-slate-500/20 text-slate-400",
};

export function DocumentDashboard() {
  const [data, setData] = useState<DocumentSectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"types" | "actions" | "pipeline">("types");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/ai/constitution?section=11")
      .then(r => r.json())
      .then(d => {
        const s = d?.data;
        setData({
          documentTypes: s?.documentTypes || [],
          actions: s?.actions || [],
          pipeline: s?.pipeline || [],
          linkTypes: s?.linkTypes || [],
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 animate-pulse mx-auto" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Document Intelligence</p>
        </div>
      </div>
    );
  }

  const filteredDocs = data?.documentTypes.filter(d =>
    d.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-wider">Document Intelligence</h1>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Section 11 — Nova Document Capabilities</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search document types..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-48 pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50"
          />
        </div>
      </div>

      <div className="flex gap-2">
        {(["types", "actions", "pipeline"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all",
              activeTab === tab
                ? "bg-violet-500/10 border-violet-500/30 text-violet-400"
                : "bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-300"
            )}
          >
            {tab === "types" && <FileText className="w-3 h-3 inline mr-1.5" />}
            {tab === "actions" && <Zap className="w-3 h-3 inline mr-1.5" />}
            {tab === "pipeline" && <ArrowRight className="w-3 h-3 inline mr-1.5" />}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "types" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocs.map((doc, i) => {
            const Icon = DOC_ICONS[doc.type] || FileText;
            const colorClass = DOC_COLORS[doc.type] || "from-slate-500/10 to-slate-600/5 border-slate-500/20 text-slate-400";
            return (
              <div key={i} className={cn("rounded-2xl border p-5 bg-gradient-to-br space-y-3 transition-all hover:scale-[1.02] group", colorClass)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">{doc.type.replace(/_/g, " ")}</h3>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{doc.type}</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">{doc.description}</p>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "actions" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.actions.map((a, i) => (
            <div key={i} className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2 group hover:border-violet-500/20 transition-all">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-violet-400" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">{a.name}</h3>
              </div>
              <p className="text-[11px] text-slate-400 font-medium ml-6">{a.description}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === "pipeline" && (
        <div className="relative">
          {data?.pipeline.map((step, i) => (
            <div key={i} className="flex items-start gap-4 pb-8 last:pb-0 relative">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
                  <span className="text-[10px] font-black text-violet-400">{i + 1}</span>
                </div>
                {i < (data?.pipeline.length || 1) - 1 && <div className="w-px flex-1 bg-slate-800 mt-1" />}
              </div>
              <div className="flex-1 pt-1">
                <p className="text-xs text-slate-300 font-medium">{step}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {data?.linkTypes && data.linkTypes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Workspace Link Types</h3>
          <div className="flex flex-wrap gap-2">
            {data.linkTypes.map((link, i) => (
              <span key={i} className="text-[9px] font-bold text-slate-400 px-3 py-1.5 rounded-lg bg-slate-900/50 border border-slate-800">
                {link}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
