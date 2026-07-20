"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  FileText,
  Loader2,
  RefreshCw,
  Download,
  Calendar,
  TrendingUp,
  Users,
  Briefcase,
  Send,
} from "lucide-react";
import { toast } from "sonner";

interface Report {
  type: string;
  description: string;
  content?: string;
  generatedAt?: string;
}

const REPORT_TYPES = [
  { type: "PROJECT", description: "Project progress updates", icon: Briefcase },
  { type: "SPRINT", description: "Sprint performance", icon: TrendingUp },
  { type: "TEAM", description: "Workload analysis", icon: Users },
  { type: "EXECUTIVE", description: "High-level summaries", icon: FileText },
];

export default function ReportsPage() {
  const { activeWorkspace } = useWorkspace();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const fetchReports = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      setLoading(true);
      // We'll generate reports on-demand, so just show the types
      setReports(REPORT_TYPES.map(r => ({ ...r })));
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const generateReport = useCallback(async (type: string) => {
    if (!activeWorkspace) return;
    try {
      setGenerating(type);
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          workspaceId: activeWorkspace.id,
          scopeId: activeWorkspace.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate report");
      }

      const data = await res.json();
      const report = { type, description: REPORT_TYPES.find(r => r.type === type)?.description || "", content: data.report, generatedAt: new Date().toISOString() };
      setSelectedReport(report);
      toast.success("Report generated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setGenerating(null);
    }
  }, [activeWorkspace]);

  if (!activeWorkspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-slate-500">Select a workspace to view reports</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            AI-generated workspace reports and analytics
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Report Types */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Report Types</h3>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 bg-slate-700 rounded-lg" />
            ))
          ) : (
            reports.map((report) => {
              const Icon = REPORT_TYPES.find(r => r.type === report.type)?.icon || FileText;
              const isActive = selectedReport?.type === report.type;
              return (
                <button
                  key={report.type}
                  onClick={() => generateReport(report.type)}
                  disabled={generating !== null}
                  className={`w-full text-left rounded-lg p-4 border transition-all ${
                    isActive
                      ? "bg-indigo-500/10 border-indigo-500/30"
                      : "bg-slate-800/50 border-slate-700/50 hover:border-slate-600/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700/50">
                      <Icon className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-200">{report.type}</div>
                      <div className="text-xs text-slate-500">{report.description}</div>
                    </div>
                    {generating === report.type && (
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Report Content */}
        <div className="lg:col-span-2">
          <Card className="border-slate-700/50 bg-slate-800/50 min-h-[500px]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-200">
                  {selectedReport ? `${selectedReport.type} Report` : "Select a report type"}
                </CardTitle>
                {selectedReport && (
                  <div className="flex items-center gap-2">
                    {selectedReport.generatedAt && (
                      <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">
                        <Calendar className="mr-1 h-3 w-3" />
                        {new Date(selectedReport.generatedAt).toLocaleString()}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedReport?.content ? (
                <ScrollArea className="max-h-[600px]">
                  <div className="prose prose-invert prose-sm max-w-none">
                    <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                      {selectedReport.content}
                    </pre>
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="h-8 w-8 text-slate-600 mb-3" />
                  <p className="text-sm text-slate-500">
                    Click a report type to generate an AI-powered analysis
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
