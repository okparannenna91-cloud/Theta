"use client";

import React, { useState, useEffect } from "react";
import {
  Shield, Sparkles, Target, Layers, Bot, Zap, CheckCircle2,
  ChevronRight, ChevronDown, Search, BookOpen, Cpu, Database,
  Brain, Users, FileText, Settings, Lock, Globe, BarChart3,
  Clock, Workflow, MessageSquare, Lightbulb, Eye, ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Section {
  number: number;
  title: string;
}

interface SectionData {
  number: number;
  title: string;
  data: Record<string, unknown>;
}

const SECTION_ICONS: Record<number, React.ElementType> = {
  1: Shield, 2: Sparkles, 3: Zap, 4: Target, 5: Layers,
  6: Cpu, 7: Brain, 8: Eye, 9: CheckCircle2, 10: BarChart3,
  11: FileText, 12: Workflow, 13: Search, 14: Database,
  15: Users, 16: BookOpen, 17: Bot, 18: Lock, 19: Globe, 20: Lightbulb,
};

export function ConstitutionViewer() {
  const [sections, setSections] = useState<Section[]>([]);
  const [activeSection, setActiveSection] = useState<SectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([1]));

  useEffect(() => {
    fetch("/api/ai/constitution")
      .then(r => r.json())
      .then(data => {
        setSections(data.sections || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const loadSection = async (num: number) => {
    try {
      const res = await fetch(`/api/ai/constitution?section=${num}`);
      const data = await res.json();
      setActiveSection(data);
      setExpandedSections(prev => new Set([...prev, num]));
    } catch (e) {
      console.error("Failed to load section", e);
    }
  };

  const filteredSections = sections.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `section ${s.number}`.includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 animate-pulse mx-auto" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Constitution</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-9.5rem)] w-[calc(100%+4rem)] -ml-8 -mt-2 overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 border-r border-slate-800 bg-slate-950/50 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-xs font-black text-white uppercase tracking-wider">Constitution</h2>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">V1 — 20 Sections</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search sections..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {filteredSections.map(s => {
            const Icon = SECTION_ICONS[s.number] || ChevronRight;
            return (
              <button
                key={s.number}
                onClick={() => loadSection(s.number)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all group",
                  activeSection?.number === s.number
                    ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5 shrink-0", activeSection?.number === s.number && "text-indigo-400")} />
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="text-[9px] font-black text-slate-600 shrink-0">{s.number}.</span>
                  <span className="text-[11px] font-bold truncate">{s.title}</span>
                </div>
                <ChevronRight className={cn(
                  "w-3 h-3 ml-auto shrink-0 transition-transform",
                  activeSection?.number === s.number && "rotate-90 text-indigo-400"
                )} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeSection ? (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
            <SectionRenderer section={activeSection} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">Select a Section</h3>
              <p className="text-xs text-slate-600 font-bold leading-relaxed">
                Choose a constitution section from the sidebar to view its specification.
                Each section defines Nova&apos;s behavioral framework and system architecture.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionRenderer({ section }: { section: SectionData }) {
  const { data } = section;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          {React.createElement(SECTION_ICONS[section.number] || Shield, { className: "w-5 h-5 text-white" })}
        </div>
        <div>
          <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">
            Section {section.number}
          </p>
          <h1 className="text-lg font-black text-white uppercase tracking-wider">{section.title}</h1>
        </div>
      </div>

      {Object.entries(data).map(([key, value]) => (
        <DataBlock key={key} label={key} value={value} />
      ))}
    </div>
  );
}

function DataBlock({ label, value }: { label: string; value: unknown }) {
  const labelStr = label
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, s => s.toUpperCase())
    .trim();

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    if (typeof value[0] === "string") {
      return (
        <div className="space-y-2.5">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{labelStr}</h3>
          <div className="space-y-1.5">
            {value.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900/50 border border-slate-800/80">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                <span className="text-xs text-slate-300 font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-2.5">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{labelStr}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {value.map((item: any, i: number) => (
            <div key={i} className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2">
              {Object.entries(item).map(([k, v]) => (
                <div key={k}>
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">{k}: </span>
                  <span className="text-xs text-slate-300 font-medium">{String(v)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (typeof value === "object" && value !== null) {
    return (
      <div className="space-y-2.5">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{labelStr}</h3>
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-3">
          {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
            <DataBlock key={k} label={k} value={v} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-baseline gap-3 px-3.5 py-2.5 rounded-xl bg-slate-900/30 border border-slate-800/50">
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider shrink-0">{labelStr}:</span>
      <span className="text-xs text-slate-300 font-medium">{String(value)}</span>
    </div>
  );
}
