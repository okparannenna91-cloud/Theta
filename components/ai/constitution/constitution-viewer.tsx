"use client";

import React, { useState, useEffect } from "react";
import {
  Shield, Sparkles, Target, Layers, Bot, Zap, CheckCircle2,
  ChevronRight, ChevronDown, Search, BookOpen, Cpu, Database,
  Brain, Users, FileText, Settings, Lock, Globe, BarChart3,
  Clock, Workflow, MessageSquare, Lightbulb, Eye, ArrowRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="space-y-4 text-center">
          <Skeleton className="h-10 w-10 rounded-lg mx-auto" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 border-r border-border bg-muted/30 flex flex-col shrink-0">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Constitution</h2>
              <p className="text-xs text-muted-foreground">V1 — 20 Sections</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search sections..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 h-8 text-xs"
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
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all group border",
                  activeSection?.number === s.number
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted border-transparent"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5 shrink-0", activeSection?.number === s.number && "text-primary")} />
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground/60 shrink-0">{s.number}.</span>
                  <span className="text-sm truncate">{s.title}</span>
                </div>
                <ChevronRight className={cn(
                  "w-3 h-3 ml-auto shrink-0 transition-transform text-muted-foreground",
                  activeSection?.number === s.number && "rotate-90 text-primary"
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
              <div className="w-16 h-16 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">Select a Section</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
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
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          {React.createElement(SECTION_ICONS[section.number] || Shield, { className: "w-5 h-5 text-primary" })}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Section {section.number}</p>
          <h1 className="text-lg font-semibold">{section.title}</h1>
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
          <h3 className="text-xs font-medium text-muted-foreground">{labelStr}</h3>
          <div className="space-y-1.5">
            {value.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-muted border border-border/80">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span className="text-sm text-foreground/80">{item}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-2.5">
        <h3 className="text-xs font-medium text-muted-foreground">{labelStr}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {value.map((item: any, i: number) => (
            <div key={i} className="p-4 bg-muted border border-border rounded-lg space-y-2">
              {Object.entries(item).map(([k, v]) => (
                <div key={k}>
                  <span className="text-xs font-medium text-muted-foreground">{k}: </span>
                  <span className="text-sm text-foreground/80">{String(v)}</span>
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
        <h3 className="text-xs font-medium text-muted-foreground">{labelStr}</h3>
        <div className="p-4 bg-muted border border-border rounded-lg space-y-3">
          {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
            <DataBlock key={k} label={k} value={v} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-baseline gap-3 px-3.5 py-2.5 rounded-lg bg-muted/50 border border-border/50">
      <span className="text-xs font-medium text-muted-foreground shrink-0">{labelStr}:</span>
      <span className="text-sm text-foreground/80">{String(value)}</span>
    </div>
  );
}
