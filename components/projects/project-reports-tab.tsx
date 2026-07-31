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
      <Card className="border-2 border-dashed border-border">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-sm font-semibold mb-1">Reports</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            AI-generated project reports and analytics are coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
