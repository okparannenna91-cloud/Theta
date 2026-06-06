"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3, AlertTriangle, TrendingUp, ArrowRight, Search,
  Target, Layers, Clock, CheckCircle2, AlertCircle, Eye, Info, Zap
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StructureStandard {
  component: string;
  description: string;
}

interface Capability {
  name: string;
  description: string;
}

interface ProjectSectionData {
  structureStandards: StructureStandard[];
  capabilities: Capability[];
  creationFlow: string[];
  monitoringAreas: string[];
}

export function ProjectDashboard() {
  const [data, setData] = useState<ProjectSectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"standards" | "capabilities" | "flow" | "monitoring">("standards");

  useEffect(() => {
    fetch("/api/ai/constitution?section=10")
      .then(r => r.json())
      .then(d => {
        const s = d?.data;
        setData({
          structureStandards: s?.structureStandards || [],
          capabilities: s?.capabilities || [],
          creationFlow: s?.creationFlow || [],
          monitoringAreas: s?.monitoringAreas || [],
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
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "standards", label: "Standards", icon: Layers },
    { key: "capabilities", label: "Capabilities", icon: Zap },
    { key: "flow", label: "Creation Flow", icon: ArrowRight },
    { key: "monitoring", label: "Monitoring", icon: Eye },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Project Intelligence</h1>
          <p className="text-sm text-muted-foreground">Section 10 — Nova Project Capabilities</p>
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

      {activeTab === "standards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.structureStandards.map((s, i) => (
            <Card key={i} className="border shadow-sm hover:border-primary/30 transition-colors">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">{s.component}</h3>
                </div>
                <p className="text-sm text-muted-foreground ml-6">{s.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "capabilities" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.capabilities.map((c, i) => (
            <Card key={i} className="border shadow-sm hover:border-primary/30 transition-colors">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">{c.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground ml-6">{c.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "flow" && (
        <div className="relative">
          {data?.creationFlow.map((step, i) => (
            <div key={i} className="flex items-start gap-4 pb-8 last:pb-0 relative">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">{i + 1}</span>
                </div>
                {i < (data?.creationFlow.length || 1) - 1 && <div className="w-px flex-1 bg-border mt-1" />}
              </div>
              <div className="flex-1 pt-1">
                <p className="text-sm text-muted-foreground">{step}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "monitoring" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data?.monitoringAreas.map((area, i) => (
            <Card key={i} className="border shadow-sm hover:border-primary/30 transition-colors">
              <CardContent className="flex items-center gap-3 px-4 py-3">
                <Eye className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm text-muted-foreground">{area}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
