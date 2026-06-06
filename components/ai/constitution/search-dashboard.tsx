"use client";

import React, { useState, useEffect } from "react";
import {
  Search, Globe, FileText, ListTodo, BookOpen, Users,
  BarChart3, MessageSquare, Database, Zap, ArrowRight,
  Info, CheckCircle2, Layers, Sparkles
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  PROJECTS: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  TASKS: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  DOCUMENTS: "text-violet-500 bg-violet-500/10 border-violet-500/20",
  SPRINTS: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  DASHBOARDS: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
  CONVERSATIONS: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  REPORTS: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
  KNOWLEDGE_BASE: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  GLOBAL: "text-muted-foreground bg-muted border-border",
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="space-y-4 text-center">
          <Skeleton className="h-10 w-10 rounded-lg mx-auto" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Search className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Search Intelligence</h1>
          <p className="text-sm text-muted-foreground">Section 13 — Nova Search Capabilities</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(["domains", "types", "rules"] as const).map(tab => (
          <Badge
            key={tab}
            variant={activeTab === tab ? "default" : "outline"}
            className="cursor-pointer text-xs rounded-md px-3 py-1"
            onClick={() => setActiveTab(tab)}
          >
            {tab === "domains" && <Globe className="w-3 h-3 inline mr-1.5" />}
            {tab === "types" && <Layers className="w-3 h-3 inline mr-1.5" />}
            {tab === "rules" && <CheckCircle2 className="w-3 h-3 inline mr-1.5" />}
            {tab}
          </Badge>
        ))}
      </div>

      {activeTab === "domains" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.domains.map((d, i) => {
            const Icon = DOMAIN_ICONS[d.domain] || Globe;
            const colorClass = DOMAIN_COLORS[d.domain] || "text-muted-foreground bg-muted border-border";
            return (
              <Card key={i} className="border shadow-sm hover:border-primary/30 transition-colors">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center border", colorClass)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{d.domain.replace(/_/g, " ")}</h3>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{d.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {activeTab === "types" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.searchTypes.map((t, i) => (
            <Card key={i} className="border shadow-sm hover:border-primary/30 transition-colors">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">{t.type.replace(/_/g, " ")}</h3>
                </div>
                <p className="text-sm text-muted-foreground ml-6">{t.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "rules" && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Ranking Principles</h3>
            {data?.rankingPrinciples.map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-muted border border-border rounded-lg">
                <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-sm text-muted-foreground">{p}</span>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Intelligence Rules</h3>
            {data?.rules.map((r, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-muted border border-border rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-sm text-muted-foreground">{r}</span>
              </div>
            ))}
          </div>

          {/* Query Simulator */}
          <Card className="border shadow-sm">
            <CardContent className="p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Query Simulator</h3>
              <div className="flex gap-3">
                <Input
                  type="text"
                  value={simulatedQuery}
                  onChange={e => setSimulatedQuery(e.target.value)}
                  placeholder="e.g., find bugs in current sprint..."
                  className="h-9 text-xs flex-1"
                  onKeyDown={e => e.key === "Enter" && handleParseQuery()}
                />
                <button
                  onClick={handleParseQuery}
                  disabled={!simulatedQuery.trim()}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Parse
                </button>
              </div>
              {parsedResult && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
                  <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-xs text-primary font-medium">{parsedResult}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
