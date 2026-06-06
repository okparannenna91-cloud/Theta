"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu, Layers, Zap, AlertTriangle, CheckCircle2, ArrowRight,
  Search, Brain, Server, Globe, Sparkles, Info, Shield
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ModelStackEntry {
  provider: string;
  layer: string;
  purpose: string;
}

interface SelectionStrategy {
  complexity: string;
  description: string;
  recommendedModels: string[];
}

interface AiModelsSectionData {
  modelStack: ModelStackEntry[];
  selectionStrategies: SelectionStrategy[];
  selectionRules: string[];
}

const PROVIDER_ICONS: Record<string, React.ElementType> = {
  OpenRouter: Globe,
  Cohere: Brain,
  OpenAI: Sparkles,
  Gemini: Cpu,
};

const PROVIDER_COLORS: Record<string, string> = {
  OpenRouter: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
  Cohere: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  OpenAI: "text-green-500 bg-green-500/10 border-green-500/20",
  Gemini: "text-blue-500 bg-blue-500/10 border-blue-500/20",
};

const COMPLEXITY_ICONS: Record<string, React.ElementType> = {
  SIMPLE: Zap,
  REASONING: Brain,
  CRITICAL: Shield,
};

export function AiModelsDashboard() {
  const [data, setData] = useState<AiModelsSectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stack" | "strategies" | "rules">("stack");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/ai/constitution?section=6")
      .then(r => r.json())
      .then(d => {
        const s = d?.data;
        setData({
          modelStack: s?.modelStack || [],
          selectionStrategies: s?.selectionStrategies || [],
          selectionRules: s?.selectionRules || [],
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="space-y-4 text-center">
          <Skeleton className="h-10 w-10 rounded-lg mx-auto" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    );
  }

  const filteredStack = (data?.modelStack || []).filter(m =>
    m.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.layer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">AI Models</h1>
            <p className="text-sm text-muted-foreground">Section 6 — Nova Model Stack</p>
          </div>
        </div>
        <div className="relative w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search providers..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-9 pl-9 text-xs"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["stack", "strategies", "rules"] as const).map(tab => (
          <Badge
            key={tab}
            variant={activeTab === tab ? "default" : "outline"}
            className="cursor-pointer text-xs rounded-md px-3 py-1 flex items-center gap-1.5"
            onClick={() => setActiveTab(tab)}
          >
            {tab === "stack" && <Server className="w-3 h-3" />}
            {tab === "strategies" && <Layers className="w-3 h-3" />}
            {tab === "rules" && <CheckCircle2 className="w-3 h-3" />}
            {tab}
          </Badge>
        ))}
      </div>

      {activeTab === "stack" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredStack.map((m, i) => {
            const Icon = PROVIDER_ICONS[m.provider] || Cpu;
            const colorClass = PROVIDER_COLORS[m.provider] || "text-muted-foreground bg-muted border-border";
            return (
              <Card key={i} className="border shadow-sm hover:border-primary/30 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center border", colorClass)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">{m.provider}</CardTitle>
                      <CardDescription className="text-xs">{m.layer}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{m.purpose}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {activeTab === "strategies" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data?.selectionStrategies.map((s, i) => {
            const Icon = COMPLEXITY_ICONS[s.complexity] || Cpu;
            return (
              <Card key={i} className="border shadow-sm hover:border-primary/30 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-primary" />
                    <CardTitle className="text-sm font-semibold">{s.complexity}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{s.description}</p>
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1.5">Recommended Models</p>
                    {s.recommendedModels.map((model, j) => (
                      <div key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span>{model}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {activeTab === "rules" && (
        <div className="space-y-3">
          {data?.selectionRules.map((rule, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 bg-muted border border-border rounded-lg">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span className="text-sm text-foreground/80">{rule}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
