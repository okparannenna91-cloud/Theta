"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3, Clock, Mail, Bell, ArrowRight, Info, CheckCircle2,
  FileText, Globe, Zap, Search, BookOpen, FolderOpen, Target, Users
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ReportTypeDef {
  type: string;
  description: string;
  contents: string[];
}

interface ReportingSectionData {
  reportTypes: ReportTypeDef[];
  frequencies: string[];
  channels: string[];
  generationProcess: string[];
  answers: string[];
}

const REPORT_ICONS: Record<string, React.ElementType> = {
  PROJECT: Globe,
  SPRINT: Zap,
  TEAM: Users,
  EXECUTIVE: Target,
  CLIENT: FolderOpen,
};

const REPORT_COLORS: Record<string, string> = {
  PROJECT: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  SPRINT: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  TEAM: "text-violet-500 bg-violet-500/10 border-violet-500/20",
  EXECUTIVE: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  CLIENT: "text-rose-500 bg-rose-500/10 border-rose-500/20",
};

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  DASHBOARD: BarChart3,
  EMAIL: Mail,
  CLIENT_PORTAL: Globe,
  NOTIFICATION: Bell,
};

export function ReportingDashboard() {
  const [data, setData] = useState<ReportingSectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"types" | "process" | "distribution">("types");
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai/constitution?section=16")
      .then(r => r.json())
      .then(d => {
        const s = d?.data;
        setData({
          reportTypes: s?.reportTypes || [],
          frequencies: s?.frequencies || [],
          channels: s?.channels || [],
          generationProcess: s?.generationProcess || [],
          answers: s?.answers || [],
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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Reporting Intelligence</h1>
          <p className="text-sm text-muted-foreground">Section 16 — Nova Reporting Capabilities</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["types", "process", "distribution"] as const).map(tab => (
          <Badge
            key={tab}
            variant={activeTab === tab ? "default" : "outline"}
            className="cursor-pointer text-xs rounded-md px-3 py-1"
            onClick={() => setActiveTab(tab)}
          >
            {tab === "types" && <BookOpen className="w-3 h-3 inline mr-1.5" />}
            {tab === "process" && <ArrowRight className="w-3 h-3 inline mr-1.5" />}
            {tab === "distribution" && <Bell className="w-3 h-3 inline mr-1.5" />}
            {tab}
          </Badge>
        ))}
      </div>

      {activeTab === "types" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.reportTypes.map((r, i) => {
            const Icon = REPORT_ICONS[r.type] || FileText;
            const colorClass = REPORT_COLORS[r.type] || "text-muted-foreground bg-muted border-border";
            return (
              <Card
                key={i}
                className={cn(
                  "border shadow-sm hover:border-primary/30 transition-colors cursor-pointer",
                  expandedReport === r.type && "ring-2 ring-primary/40"
                )}
                onClick={() => setExpandedReport(expandedReport === r.type ? null : r.type)}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center border", colorClass)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{r.type}</h3>
                      <p className="text-xs text-muted-foreground">Report</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.description}</p>
                  {expandedReport === r.type && (
                    <div className="space-y-2 pt-2 border-t border-border">
                      <span className="text-xs font-medium text-muted-foreground">Contents</span>
                      {r.contents.map((c, j) => (
                        <div key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span>{c}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {activeTab === "process" && (
        <div className="relative">
          {data?.generationProcess.map((step, i) => (
            <div key={i} className="flex items-start gap-4 pb-8 last:pb-0 relative">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">{i + 1}</span>
                </div>
                {i < (data?.generationProcess.length || 1) - 1 && <div className="w-px flex-1 bg-border mt-1" />}
              </div>
              <div className="flex-1 pt-1">
                <p className="text-sm text-muted-foreground">{step}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "distribution" && (
        <div className="space-y-6">
          {/* Frequencies */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Frequencies</h3>
            <div className="flex flex-wrap gap-2">
              {data?.frequencies.map((f, i) => (
                <Badge key={i} variant="outline" className="text-xs rounded-md px-3 py-1.5 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {f}
                </Badge>
              ))}
            </div>
          </div>

          {/* Channels */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Distribution Channels</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data?.channels.map((ch, i) => {
                const Icon = CHANNEL_ICONS[ch] || Bell;
                return (
                  <Card key={i} className="border shadow-sm hover:border-primary/30 transition-colors">
                    <CardContent className="flex items-center gap-3 px-4 py-3">
                      <Icon className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm text-muted-foreground">{ch.replace(/_/g, " ")}</span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* What Every Report Answers */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Every Report Answers</h3>
            {data?.answers.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-muted border border-border rounded-lg">
                <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-sm text-muted-foreground">{a}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
