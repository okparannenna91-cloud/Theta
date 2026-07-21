"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, FileText, Loader2, RefreshCw } from "lucide-react";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

interface ReportsTabProps {
  projectId: string;
  workspaceId: string;
  projectName: string;
}

export function ReportsTab({ projectId, workspaceId, projectName }: ReportsTabProps) {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "PROJECT",
          scopeId: projectId,
          workspaceId,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate report");
      const data = await res.json();
      setReport(data.report);
      toast.success("Report generated");
    } catch {
      toast.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Reports</h2>
          <p className="text-sm text-muted-foreground">AI-generated project reports and analytics</p>
        </div>
        <Button onClick={generateReport} disabled={loading} size="sm">
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <BarChart3 className="h-4 w-4 mr-2" />
          )}
          {report ? "Regenerate Report" : "Generate Report"}
        </Button>
      </div>

      {report ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">{projectName} Report</h3>
              <Badge variant="outline" className="text-xs ml-auto">AI Generated</Badge>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
              {report}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-dashed border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-sm font-semibold mb-1">No report yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              Generate an AI-powered report for {projectName} including progress, risks, and recommendations.
            </p>
            <Button variant="outline" onClick={generateReport} disabled={loading}>
              Generate Report
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
