"use client";

import React, { useState, useEffect } from "react";
import {
  Database, BookOpen, CheckCircle2, ArrowRight, Info,
  Server, Shield, Zap, Globe, Search, FileText, Users
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PipelineStep {
  step: string;
  description: string;
}

interface KnowledgeSectionData {
  pipeline: PipelineStep[];
  sources: string[];
  citationRules: string[];
  storageArchitecture: Record<string, string>;
}

const STORAGE_ICONS: Record<string, React.ElementType> = {
  primary: Database,
  memory: Zap,
  fastRetrieval: Server,
};

const STORAGE_COLORS: Record<string, string> = {
  primary: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  memory: "text-violet-500 bg-violet-500/10 border-violet-500/20",
  fastRetrieval: "text-amber-500 bg-amber-500/10 border-amber-500/20",
};

export function KnowledgeDashboard() {
  const [data, setData] = useState<KnowledgeSectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pipeline" | "sources" | "rules" | "storage">("pipeline");

  useEffect(() => {
    fetch("/api/ai/constitution?section=14")
      .then(r => r.json())
      .then(d => {
        const s = d?.data;
        setData({
          pipeline: s?.pipeline || [],
          sources: s?.sources || [],
          citationRules: s?.citationRules || [],
          storageArchitecture: s?.storageArchitecture || {},
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
          <Skeleton className="h-4 w-44" />
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "pipeline", label: "Pipeline", icon: ArrowRight },
    { key: "sources", label: "Sources", icon: BookOpen },
    { key: "rules", label: "Citation Rules", icon: CheckCircle2 },
    { key: "storage", label: "Architecture", icon: Database },
  ] as const;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Database className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Knowledge Intelligence</h1>
          <p className="text-sm text-muted-foreground">Section 14 — Nova Knowledge Capabilities</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(tab => (
          <Badge
            key={tab.key}
            variant={activeTab === tab.key ? "default" : "outline"}
            className="cursor-pointer text-xs rounded-md px-3 py-1"
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon className="w-3 h-3 inline mr-1.5" />
            {tab.label}
          </Badge>
        ))}
      </div>

      {activeTab === "pipeline" && (
        <div className="relative">
          {data?.pipeline.map((step, i) => (
            <div key={i} className="flex items-start gap-4 pb-8 last:pb-0 relative">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <span className="text-xs font-medium text-primary">{i + 1}</span>
                </div>
                {i < (data?.pipeline.length || 1) - 1 && <div className="w-px flex-1 bg-border mt-1" />}
              </div>
              <div className="flex-1 pt-1 space-y-1">
                <h3 className="text-sm font-semibold text-foreground">{step.step}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "sources" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data?.sources.map((src, i) => (
            <Card key={i} className="border shadow-sm hover:border-primary/30 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm text-muted-foreground">{src}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "rules" && (
        <div className="space-y-3">
          {data?.citationRules.map((rule, i) => (
            <Card key={i} className="border shadow-sm hover:border-primary/30 transition-colors">
              <CardContent className="p-4 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">{rule}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "storage" && data?.storageArchitecture && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(data.storageArchitecture).map(([key, value], i) => {
            const Icon = STORAGE_ICONS[key] || Database;
            const colorClass = STORAGE_COLORS[key] || "text-muted-foreground bg-muted border-border";
            return (
              <Card key={i} className="border shadow-sm hover:border-primary/30 transition-colors">
                <CardHeader>
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center border", colorClass)}>
                    <Icon className="w-5 h-5" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-1">
                  <CardTitle className="text-sm font-semibold">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </CardTitle>
                  <CardDescription className="text-sm">{value as string}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
