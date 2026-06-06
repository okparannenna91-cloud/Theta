"use client";

import React, { useState, useEffect } from "react";
import {
  Lightbulb, CheckCircle2, Target,
  Bot, Users, Rocket, Brain, Cpu, Shield
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Milestone {
  stage: string;
  target: string;
  capabilities: string[];
}

interface EvolutionSectionData {
  milestones: Milestone[];
  longTermVision: string;
  futurePrinciples: string[];
  humanControlRule: string;
  currentStage: string;
}

const STAGE_ICONS: Record<string, React.ElementType> = {
  ASSISTANT: Bot,
  OPERATOR: Cpu,
  MANAGER: Brain,
  COORDINATOR: Users,
  WORKFORCE: Rocket,
};

const STAGE_COLORS: Record<string, string> = {
  ASSISTANT: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  OPERATOR: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  MANAGER: "text-violet-500 bg-violet-500/10 border-violet-500/20",
  COORDINATOR: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  WORKFORCE: "text-rose-500 bg-rose-500/10 border-rose-500/20",
};

const STAGE_BADGE_COLORS: Record<string, string> = {
  ASSISTANT: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  OPERATOR: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  MANAGER: "bg-violet-500/10 text-violet-500 border-violet-500/30",
  COORDINATOR: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  WORKFORCE: "bg-rose-500/10 text-rose-500 border-rose-500/30",
};

export function EvolutionDashboard() {
  const [data, setData] = useState<EvolutionSectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai/constitution?section=20")
      .then(r => r.json())
      .then(d => {
        const s = d?.data;
        setData({
          milestones: s?.milestones || [],
          longTermVision: s?.longTermVision || "",
          futurePrinciples: s?.futurePrinciples || [],
          humanControlRule: s?.humanControlRule || "",
          currentStage: s?.currentStage || "ASSISTANT",
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

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Evolution Roadmap</h1>
          <p className="text-sm text-muted-foreground">Section 20 — Nova Future Evolution</p>
        </div>
      </div>

      {/* Current Stage Badge */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/50 border border-border">
        <span className="text-xs font-medium text-muted-foreground">Current Stage:</span>
        <span className={cn(
          "text-xs font-medium px-3 py-1 rounded-md border",
          STAGE_BADGE_COLORS[data?.currentStage || "ASSISTANT"]
        )}>
          {data?.currentStage || "ASSISTANT"}
        </span>
      </div>

      {/* Evolution Timeline */}
      <div className="relative">
        {data?.milestones.map((m, i) => {
          const Icon = STAGE_ICONS[m.stage] || Bot;
          const colorClass = STAGE_COLORS[m.stage] || "text-muted-foreground bg-muted border-border";
          const isCurrent = m.stage === data?.currentStage;
          return (
            <div key={i} className="flex items-start gap-4 pb-8 last:pb-0 relative">
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-colors",
                  isCurrent ? "border-primary bg-primary/10" : "bg-card border-border"
                )}>
                  <Icon className={cn("w-4 h-4", isCurrent ? "text-primary" : "text-muted-foreground")} />
                </div>
                {i < (data?.milestones.length || 1) - 1 && (
                  <div className={cn("w-px flex-1 mt-2", isCurrent ? "bg-primary/20" : "bg-border")} />
                )}
              </div>
              <Card
                className={cn(
                  "flex-1 border shadow-sm hover:border-primary/30 transition-colors cursor-pointer",
                  isCurrent && "ring-2 ring-primary/40"
                )}
                onClick={() => setExpandedStage(expandedStage === m.stage ? null : m.stage)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className={cn("text-sm font-semibold", isCurrent && "text-primary")}>
                      {m.stage}
                      {isCurrent && (
                        <Badge variant="outline" className="ml-2 text-xs rounded-md px-2 py-0 h-5 text-primary border-primary/30">
                          ACTIVE
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs">{m.target}</CardDescription>
                  </div>
                </CardHeader>
                {expandedStage === m.stage && (
                  <CardContent className="space-y-2 pt-2 border-t border-border">
                    {m.capabilities.map((cap, j) => (
                      <div key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span>{cap}</span>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            </div>
          );
        })}
      </div>

      {/* Long Term Vision */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-muted-foreground">Long-Term Vision</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm leading-relaxed">{data?.longTermVision}</CardDescription>
        </CardContent>
      </Card>

      {/* Future Principles */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground">Future Principles</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data?.futurePrinciples.map((p, i) => (
            <Card key={i} className="border shadow-sm hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <Target className="w-4 h-4 text-primary shrink-0" />
                  <CardTitle className="text-sm font-medium text-foreground">{p}</CardTitle>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Human Control Rule */}
      <Card className="border shadow-sm bg-rose-500/5 border-rose-500/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-rose-500" />
            <CardTitle className="text-xs font-semibold text-rose-500">Human Control Rule</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-sm leading-relaxed">{data?.humanControlRule}</CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
