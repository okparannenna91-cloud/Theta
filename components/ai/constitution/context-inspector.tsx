"use client";

import React, { useState, useEffect } from "react";
import {
  Eye, Target, CheckCircle2, RefreshCw, Zap
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ContextSource {
  source: string;
  priority: number;
  description: string;
}

interface ContextConfig {
  priorityHierarchy: ContextSource[];
  rules: string[];
  windowStrategy: string[];
}

export function ContextInspector() {
  const [config, setConfig] = useState<ContextConfig | null>(null);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulatedContext, setSimulatedContext] = useState<Record<string, string>>({});
  const [contextInput, setContextInput] = useState("");

  useEffect(() => {
    fetch("/api/ai/constitution?section=8")
      .then(r => r.json())
      .then(data => {
        const d = data?.data;
        setConfig({
          priorityHierarchy: d?.priorityHierarchy || [],
          rules: d?.rules || [],
          windowStrategy: d?.windowStrategy || [],
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleAddContext = () => {
    if (!contextInput.trim()) return;
    const label = `Context ${Object.keys(simulatedContext).length + 1}`;
    setSimulatedContext(prev => ({ ...prev, [label]: contextInput }));
    setContextInput("");
  };

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
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Eye className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Context Inspector</h1>
          <p className="text-sm text-muted-foreground">Section 8 — Context System</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Priority Hierarchy */}
        <div className="lg:col-span-3 space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground">Context Priority Hierarchy</h3>
          <div className="space-y-2">
            {config?.priorityHierarchy.map((source, i) => (
              <Card
                key={i}
                className={cn(
                  "border shadow-sm hover:border-primary/30 transition-colors cursor-pointer",
                  activeSource === source.source && "border-primary/30"
                )}
                onClick={() => setActiveSource(source.source)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold",
                        source.priority <= 2 ? "text-cyan-500 bg-cyan-500/10" :
                        source.priority <= 4 ? "text-blue-500 bg-blue-500/10" :
                        "text-muted-foreground bg-muted"
                      )}>
                        P{source.priority}
                      </div>
                      <CardTitle className="text-sm font-semibold">{source.source.replace(/_/g, " ")}</CardTitle>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs rounded-md px-2 py-0 h-5",
                        source.priority <= 2 ? "text-cyan-500 border-cyan-500/20" :
                        source.priority <= 4 ? "text-blue-500 border-blue-500/20" :
                        "text-muted-foreground"
                      )}
                    >
                      Priority {source.priority}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">{source.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Side Panels */}
        <div className="lg:col-span-2 space-y-6">
          {/* Context Rules */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground">Context Rules</h3>
            <div className="space-y-1.5">
              {config?.rules.map((rule, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-muted/50 border border-border">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span className="text-sm text-muted-foreground">{rule}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Window Strategy */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground">Context Window Strategy</h3>
            <div className="space-y-1.5">
              {config?.windowStrategy.map((strategy, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-muted/50 border border-border">
                  <Target className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-sm text-muted-foreground">{strategy}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Simulated Context */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground">Simulated Context</h3>
            <div className="flex gap-2">
              <Input
                type="text"
                value={contextInput}
                onChange={e => setContextInput(e.target.value)}
                placeholder="Add context value..."
                className="h-9 text-xs"
                onKeyDown={e => e.key === "Enter" && handleAddContext()}
              />
              <button
                onClick={handleAddContext}
                disabled={!contextInput.trim()}
                className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add
              </button>
            </div>
            {Object.keys(simulatedContext).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No simulated context loaded
              </p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {Object.entries(simulatedContext).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
                    <Zap className="w-3 h-3 text-primary shrink-0" />
                    <span className="text-xs font-medium text-primary shrink-0">{key}:</span>
                    <span className="text-xs text-muted-foreground truncate">{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Context Preview */}
          <Card className="border shadow-sm bg-primary/5 border-primary/10">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-primary" />
                <CardTitle className="text-xs font-semibold text-primary">Active Context Preview</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">
                {activeSource
                  ? `Using context source: ${activeSource.replace(/_/g, " ")} (Priority ${config?.priorityHierarchy.find(s => s.source === activeSource)?.priority || "?"})`
                  : "Click a context source to preview its details"}
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
