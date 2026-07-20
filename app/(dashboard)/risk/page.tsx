"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  RefreshCw,
  Target,
} from "lucide-react";
import { toast } from "sonner";

interface RiskFactor {
  score: number;
  level: "low" | "medium" | "high" | "critical";
  factors: string[];
  assessment: string;
  recommendations: string[];
}

interface WorkspaceRiskOverview {
  projectId: string;
  projectName: string;
  risk: RiskFactor;
}

interface VelocityEntry {
  memberId: string;
  name: string;
  velocity: number;
  trend: "improving" | "stable" | "declining";
}

const RISK_CONFIG = {
  low: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle2 },
  medium: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: Clock },
  high: { color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", icon: AlertTriangle },
  critical: { color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", icon: AlertTriangle },
};

const TREND_ICONS = {
  improving: { icon: TrendingUp, color: "text-emerald-400" },
  stable: { icon: Minus, color: "text-slate-400" },
  declining: { icon: TrendingDown, color: "text-rose-400" },
};

export default function RiskDashboardPage() {
  const { activeWorkspace } = useWorkspace();
  const [overview, setOverview] = useState<WorkspaceRiskOverview[]>([]);
  const [velocity, setVelocity] = useState<VelocityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!activeWorkspace) return;
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [overviewRes, velocityRes] = await Promise.all([
        fetch(`/api/risk-prediction?workspaceId=${activeWorkspace.id}`),
        fetch(`/api/risk-prediction?workspaceId=${activeWorkspace.id}&includeVelocity=true`),
      ]);

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setOverview(Array.isArray(data) ? data : []);
      }

      // Velocity is embedded in the overview response or we extract it
      if (velocityRes.ok) {
        const data = await velocityRes.json();
        if (data.velocity) setVelocity(data.velocity);
      }
    } catch {
      toast.error("Failed to load risk data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const overallRisk = overview.length > 0
    ? overview.reduce((worst, curr) => {
        const order: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        return order[curr.risk.level] > order[worst] ? curr.risk.level : worst;
      }, "low" as string)
    : "low";

  const avgScore = overview.length > 0
    ? Math.round(overview.reduce((sum, o) => sum + o.risk.score, 0) / overview.length)
    : 0;

  if (!activeWorkspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-slate-500">Select a workspace to view risk analysis</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">Risk Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            AI-powered risk analysis across all projects
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800 border border-slate-700 rounded-lg transition-colors"
        >
          {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-slate-700/50 bg-slate-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Overall Risk</p>
                <Badge className={`mt-1 text-xs border ${RISK_CONFIG[overallRisk as keyof typeof RISK_CONFIG]?.bg} ${RISK_CONFIG[overallRisk as keyof typeof RISK_CONFIG]?.color} ${RISK_CONFIG[overallRisk as keyof typeof RISK_CONFIG]?.border}`}>
                  {overallRisk}
                </Badge>
              </div>
              <Shield className="h-8 w-8 text-slate-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700/50 bg-slate-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Avg Risk Score</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">{avgScore}</p>
              </div>
              <Target className="h-8 w-8 text-slate-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700/50 bg-slate-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Projects Analyzed</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">{overview.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-slate-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList className="bg-slate-800/80 border border-slate-700/50">
          <TabsTrigger value="projects" className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100">
            Projects
          </TabsTrigger>
          <TabsTrigger value="velocity" className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100">
            Team Velocity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-4">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-48 bg-slate-700 rounded-lg" />
              ))}
            </div>
          ) : overview.length === 0 ? (
            <Card className="border-slate-700/50 bg-slate-800/50">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Shield className="h-8 w-8 text-slate-600 mb-3" />
                <p className="text-sm text-slate-500">No projects to analyze</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {overview.map((item) => {
                const config = RISK_CONFIG[item.risk.level];
                const Icon = config.icon;
                return (
                  <Card key={item.projectId} className={`border-slate-700/50 bg-slate-800/50 ${item.risk.level === "critical" ? "ring-1 ring-rose-500/20" : ""}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-slate-200">
                          {item.projectName}
                        </CardTitle>
                        <Badge className={`text-[10px] border ${config.bg} ${config.color} ${config.border}`}>
                          <Icon className="mr-1 h-3 w-3" />
                          {item.risk.level}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Score bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Risk Score</span>
                          <span className="text-slate-300 font-mono">{item.risk.score}/100</span>
                        </div>
                        <Progress
                          value={item.risk.score}
                          className="h-2 bg-slate-700"
                        />
                      </div>

                      {/* Factors */}
                      {item.risk.factors.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Risk Factors</p>
                          <div className="flex flex-wrap gap-1">
                            {item.risk.factors.slice(0, 3).map((f, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] border-slate-600 text-slate-400">
                                {f}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Assessment */}
                      {item.risk.assessment && (
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {item.risk.assessment}
                        </p>
                      )}

                      {/* Recommendations */}
                      {item.risk.recommendations.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Actions</p>
                          <p className="text-xs text-indigo-400">
                            {item.risk.recommendations[0]}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="velocity" className="space-y-4">
          <Card className="border-slate-700/50 bg-slate-800/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-200">
                Team Velocity Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              {velocity.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No velocity data available yet. Complete some tasks to see trends.
                </p>
              ) : (
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-3">
                    {velocity.map((v) => {
                      const trend = TREND_ICONS[v.trend];
                      const TrendIcon = trend.icon;
                      return (
                        <div
                          key={v.memberId}
                          className="flex items-center gap-3 rounded-lg bg-slate-900/30 p-3 border border-slate-700/30"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-200">{v.name}</div>
                            <div className="text-xs text-slate-500">
                              {v.velocity} tasks/week
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendIcon className={`h-4 w-4 ${trend.color}`} />
                            <span className={`text-xs ${trend.color}`}>{v.trend}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
