"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2, AlertTriangle, Clock, Flag, ArrowRight,
  Search, Zap, Brain, BarChart3, ListTodo, GanttChartSquare,
  UserCheck, AlertCircle, Info
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface QualityStandard {
  attribute: string;
  description: string;
}

interface Capability {
  name: string;
  description: string;
}

interface TaskSectionData {
  qualityStandards: QualityStandard[];
  capabilities: Capability[];
  creationFlow: string[];
}

export function TaskDashboard() {
  const [data, setData] = useState<TaskSectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"standards" | "capabilities" | "flow">("standards");

  useEffect(() => {
    fetch("/api/ai/constitution?section=9")
      .then(r => r.json())
      .then(d => {
        const s = d?.data;
        setData({
          qualityStandards: s?.qualityStandards || [],
          capabilities: s?.capabilities || [],
          creationFlow: s?.creationFlow || [],
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <ListTodo className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Task Intelligence</h1>
          <p className="text-sm text-muted-foreground">Section 9 — Nova Task Capabilities</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["standards", "capabilities", "flow"] as const).map(tab => (
          <Badge
            key={tab}
            variant={activeTab === tab ? "default" : "outline"}
            className="cursor-pointer text-xs rounded-md px-3 py-1"
            onClick={() => setActiveTab(tab)}
          >
            {tab === "standards" && <CheckCircle2 className="w-3 h-3 inline mr-1.5" />}
            {tab === "capabilities" && <Zap className="w-3 h-3 inline mr-1.5" />}
            {tab === "flow" && <ArrowRight className="w-3 h-3 inline mr-1.5" />}
            {tab}
          </Badge>
        ))}
      </div>

      {activeTab === "standards" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.qualityStandards.map((s, i) => (
              <Card key={i} className="border shadow-sm hover:border-primary/30 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <CardTitle className="text-sm font-semibold">{s.attribute}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">{s.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
          {(!data?.qualityStandards || data.qualityStandards.length === 0) && (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">No quality standards loaded.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "capabilities" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.capabilities.map((c, i) => (
              <Card key={i} className="border shadow-sm hover:border-primary/30 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-500" />
                    <CardTitle className="text-sm font-semibold">{c.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">{c.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
          {(!data?.capabilities || data.capabilities.length === 0) && (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">No capabilities loaded.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "flow" && (
        <div className="space-y-4">
          <div className="relative">
            {data?.creationFlow.map((step, i) => (
              <div key={i} className="flex items-start gap-4 pb-8 last:pb-0 relative">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">{i + 1}</span>
                  </div>
                  {i < (data?.creationFlow.length || 1) - 1 && (
                    <div className="w-px flex-1 bg-border mt-1" />
                  )}
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm text-muted-foreground">{step}</p>
                </div>
              </div>
            ))}
          </div>
          {(!data?.creationFlow || data.creationFlow.length === 0) && (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">No creation flow loaded.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
