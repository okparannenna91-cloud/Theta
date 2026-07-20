"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ListTodo,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Download,
  BarChart3,
  Activity,
  Users,
  Layers,
  Clock,
} from "lucide-react";

import dynamic from "next/dynamic";

const PieChart = dynamic(() => import("recharts").then((m) => m.PieChart), { ssr: false });
const Pie = dynamic(() => import("recharts").then((m) => m.Pie), { ssr: false });
const Cell = dynamic(() => import("recharts").then((m) => m.Cell), { ssr: false });
const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const LineChart = dynamic(() => import("recharts").then((m) => m.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then((m) => m.Line), { ssr: false });
const AreaChart = dynamic(() => import("recharts").then((m) => m.AreaChart), { ssr: false });
const Area = dynamic(() => import("recharts").then((m) => m.Area), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const Legend = dynamic(() => import("recharts").then((m) => m.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });

type DateRange = "7d" | "30d" | "90d" | "1y";

interface AdvancedDashboardProps {
  workspaceId: string;
  projectId?: string;
}

interface DashboardData {
  totals: {
    tasks: number;
    completedTasks: number;
    overdueTasks: number;
    pendingTasks: number;
    projects: number;
    projectCompletionRate: number;
  };
  tasksByStatus: { status: string; count: number }[];
  tasksByPriority: { priority: string; count: number }[];
  tasksOverTime: { date: string; created: number; completed: number }[];
  teamProductivity: { userId: string; name: string | null; completed: number; total: number }[];
  mostActiveProjects: { projectId: string; name: string; taskCount: number; completedCount: number }[];
}

interface BurndownData {
  date: string;
  ideal: number;
  actual: number;
}

interface VelocityData {
  week: string;
  completed: number;
  committed: number;
}

interface WorkloadData {
  userId: string;
  name: string | null;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
}

interface CumulativeFlowData {
  date: string;
  todo: number;
  inProgress: number;
  review: number;
  done: number;
}

const STATUS_COLORS: Record<string, string> = {
  todo: "#6366f1",
  in_progress: "#f59e0b",
  review: "#8b5cf6",
  completed: "#10b981",
  cancelled: "#6b7280",
  done: "#10b981",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

const DAYS_MAP: Record<DateRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
};

export default function AdvancedDashboard({ workspaceId, projectId }: AdvancedDashboardProps) {
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [burndownData, setBurndownData] = useState<BurndownData[]>([]);
  const [velocityData, setVelocityData] = useState<VelocityData[]>([]);
  const [workloadData, setWorkloadData] = useState<WorkloadData[]>([]);
  const [cumulativeFlowData, setCumulativeFlowData] = useState<CumulativeFlowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const days = DAYS_MAP[dateRange];
      const params = new URLSearchParams({ workspaceId, days: String(days) });
      if (projectId) params.set("projectId", projectId);

      const [analyticsRes, velocityRes, workloadRes, cumulativeRes] = await Promise.all([
        fetch(`/api/analytics?${params}`),
        fetch(`/api/analytics/velocity?workspaceId=${workspaceId}&weeks=12`),
        fetch(`/api/analytics/workload?workspaceId=${workspaceId}`),
        fetch(`/api/analytics/cumulative-flow?workspaceId=${workspaceId}&days=${days}`),
      ]);

      if (!analyticsRes.ok) throw new Error("Failed to fetch analytics");

      const analytics = await analyticsRes.json();
      setDashboardData(analytics);

      if (velocityRes.ok) setVelocityData(await velocityRes.json());
      if (workloadRes.ok) setWorkloadData(await workloadRes.json());
      if (cumulativeRes.ok) setCumulativeFlowData(await cumulativeRes.json());

      if (projectId) {
        const burndownRes = await fetch(
          `/api/analytics/burndown?workspaceId=${workspaceId}&projectId=${projectId}&days=${days}`
        );
        if (burndownRes.ok) setBurndownData(await burndownRes.json());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, projectId, dateRange]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleExportCSV = useCallback(() => {
    if (!dashboardData) return;

    const lines = [
      "Metric,Value",
      `Total Tasks,${dashboardData.totals.tasks}`,
      `Completed,${dashboardData.totals.completedTasks}`,
      `Overdue,${dashboardData.totals.overdueTasks}`,
      `Pending,${dashboardData.totals.pendingTasks}`,
      `Completion Rate,${dashboardData.totals.projectCompletionRate}%`,
      "",
      "Status,Count",
      ...dashboardData.tasksByStatus.map((s) => `${s.status},${s.count}`),
      "",
      "Priority,Count",
      ...dashboardData.tasksByPriority.map((p) => `${p.priority},${p.count}`),
      "",
      "Team Member,Completed,Total",
      ...dashboardData.teamProductivity.map(
        (m) => `${m.name ?? m.userId},${m.completed},${m.total}`
      ),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashboard-report-${dateRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [dashboardData, dateRange]);

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="h-16 w-16 bg-red-100 dark:bg-red-900/20 rounded-3xl flex items-center justify-center mb-4 text-red-500">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Dashboard Error</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md mb-4">{error}</p>
        <Button onClick={fetchAllData} variant="outline" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  if (loading) return <LoadingSkeleton />;

  if (!dashboardData) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">No data available.</div>
    );
  }

  const { totals, tasksByStatus, tasksByPriority, tasksOverTime, teamProductivity, mostActiveProjects } =
    dashboardData;

  const completionRate = totals.projectCompletionRate;
  const prevCompletionRate = completionRate;
  const rateTrend: "up" | "down" | "neutral" =
    completionRate > prevCompletionRate ? "up" : completionRate < prevCompletionRate ? "down" : "neutral";

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto space-y-8 relative">
      <div className="absolute top-0 right-0 -z-10 w-[600px] h-[600px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Advanced Reporting
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Comprehensive analytics and performance insights
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            {(["7d", "30d", "90d", "1y"] as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  dateRange === range
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>
          <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Tasks"
          value={totals.tasks}
          icon={<ListTodo className="h-4 w-4" />}
          color="text-indigo-500"
          bgColor="bg-indigo-500/10"
        />
        <MetricCard
          label="Completed"
          value={totals.completedTasks}
          icon={<CheckCircle2 className="h-4 w-4" />}
          color="text-emerald-500"
          bgColor="bg-emerald-500/10"
          subtitle={`${totals.tasks > 0 ? Math.round((totals.completedTasks / totals.tasks) * 100) : 0}% completion`}
        />
        <MetricCard
          label="Overdue"
          value={totals.overdueTasks}
          icon={<AlertCircle className="h-4 w-4" />}
          color="text-red-500"
          bgColor="bg-red-500/10"
        />
        <MetricCard
          label="Completion Rate"
          value={`${completionRate}%`}
          icon={<TrendingUp className="h-4 w-4" />}
          color="text-indigo-500"
          bgColor="bg-indigo-500/10"
          trend={rateTrend}
        />
      </div>

      {/* Charts Grid - Row 1: Pie + Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-500" />
              Task Status Distribution
            </CardTitle>
            <CardDescription>Current tasks by status</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tasksByStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  paddingAngle={2}
                >
                  {tasksByStatus.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={STATUS_COLORS[entry.status.toLowerCase()] || "#6366f1"}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "none",
                    borderRadius: "8px",
                    color: "#f8fafc",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span className="text-xs text-slate-600 dark:text-slate-400 capitalize">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-500" />
              Task Priority Distribution
            </CardTitle>
            <CardDescription>Tasks grouped by priority level</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tasksByPriority} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                <XAxis
                  dataKey="priority"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  tickFormatter={(v: string) => v.charAt(0).toUpperCase() + v.slice(1)}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "none",
                    borderRadius: "8px",
                    color: "#f8fafc",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
                  {tasksByPriority.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={PRIORITY_COLORS[entry.priority.toLowerCase()] || "#6366f1"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Tasks Over Time + Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-500" />
              Tasks Over Time
            </CardTitle>
            <CardDescription>Created vs completed tasks</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tasksOverTime}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "none",
                    borderRadius: "8px",
                    color: "#f8fafc",
                    fontSize: "12px",
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="created" name="Created" stroke="#6366f1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {velocityData.length > 0 && (
          <Card className="bg-card shadow-sm rounded-lg">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                Velocity
              </CardTitle>
              <CardDescription>Tasks committed vs completed per week</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={velocityData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                  <XAxis
                    dataKey="week"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "none",
                      borderRadius: "8px",
                      color: "#f8fafc",
                      fontSize: "12px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="committed" name="Committed" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={16} />
                  <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Row 3: Burndown (conditional) */}
      {burndownData.length > 0 && (
        <Card className="bg-card shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-500" />
              Sprint Burndown
            </CardTitle>
            <CardDescription>Ideal vs actual remaining tasks</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={burndownData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "none",
                    borderRadius: "8px",
                    color: "#f8fafc",
                    fontSize: "12px",
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="ideal" name="Ideal" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                <Line type="monotone" dataKey="actual" name="Actual" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Row 4: Workload + Cumulative Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {workloadData.length > 0 && (
          <Card className="bg-card shadow-sm rounded-lg">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-500" />
                Workload Distribution
              </CardTitle>
              <CardDescription>Active tasks per team member</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" opacity={0.1} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "none",
                      borderRadius: "8px",
                      color: "#f8fafc",
                      fontSize: "12px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="todoTasks" name="Todo" fill="#6366f1" stackId="a" barSize={18} />
                  <Bar dataKey="inProgressTasks" name="In Progress" fill="#f59e0b" stackId="a" barSize={18} />
                  <Bar dataKey="completedTasks" name="Done" fill="#10b981" stackId="a" barSize={18} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {cumulativeFlowData.length > 0 && (
          <Card className="bg-card shadow-sm rounded-lg">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-500" />
                Cumulative Flow
              </CardTitle>
              <CardDescription>Work-in-progress and throughput over time</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativeFlowData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "none",
                      borderRadius: "8px",
                      color: "#f8fafc",
                      fontSize: "12px",
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="done" name="Done" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="review" name="Review" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="inProgress" name="In Progress" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="todo" name="Todo" stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Row 5: Most Active Projects + Team Productivity Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-500" />
              Most Active Projects
            </CardTitle>
            <CardDescription>Projects sorted by task count</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {mostActiveProjects.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mostActiveProjects} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" opacity={0.1} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "none",
                      borderRadius: "8px",
                      color: "#f8fafc",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="taskCount" name="Total Tasks" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={16} />
                  <Bar dataKey="completedCount" name="Completed" fill="#10b981" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 text-center py-12">No project data available.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-500" />
              Team Productivity
            </CardTitle>
            <CardDescription>Completion rate by team member</CardDescription>
          </CardHeader>
          <CardContent>
            {teamProductivity.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="text-left py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Member
                      </th>
                      <th className="text-right py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Completed
                      </th>
                      <th className="text-right py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="text-right py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamProductivity.map((member) => {
                      const rate = member.total > 0 ? Math.round((member.completed / member.total) * 100) : 0;
                      return (
                        <tr
                          key={member.userId}
                          className="border-b border-slate-100 dark:border-slate-800/50 last:border-0"
                        >
                          <td className="py-2.5 font-medium text-slate-900 dark:text-slate-100">
                            {member.name ?? "Unknown"}
                          </td>
                          <td className="py-2.5 text-right text-slate-600 dark:text-slate-400">
                            {member.completed}
                          </td>
                          <td className="py-2.5 text-right text-slate-600 dark:text-slate-400">
                            {member.total}
                          </td>
                          <td className="py-2.5 text-right">
                            <Badge
                              variant={rate >= 80 ? "default" : rate >= 50 ? "secondary" : "destructive"}
                              className="text-[10px] font-mono"
                            >
                              {rate}%
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-12">No productivity data available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  color,
  bgColor,
  subtitle,
  trend,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card className="bg-card shadow-sm rounded-lg">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {label}
          </p>
          <div className={`h-8 w-8 rounded-lg ${bgColor} flex items-center justify-center ${color}`}>
            {icon}
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {trend && (
            <span
              className={`text-xs font-medium ${
                trend === "up"
                  ? "text-emerald-500"
                  : trend === "down"
                    ? "text-red-500"
                    : "text-slate-400"
              }`}
            >
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[320px] rounded-lg" />
        ))}
      </div>
    </div>
  );
}
