"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  BarChart3, PieChart, TrendingUp, Activity,
  BarChartHorizontal, LineChart, Donut,
  Download, Settings, RefreshCcw
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, Legend,
  LineChart as ReLineChart, Line, AreaChart, Area
} from "recharts";

interface ChartViewProps {
  tasks: any[];
  columns: any[];
  onSelectTask: (task: any) => void;
}

const CHART_TYPES = [
  { id: "bar", icon: BarChart3, label: "Bar" },
  { id: "pie", icon: PieChart, label: "Pie" },
  { id: "line", icon: LineChart, label: "Line" },
  { id: "area", icon: Activity, label: "Area" },
  { id: "donut", icon: Donut, label: "Donut" },
  { id: "horizontal", icon: BarChartHorizontal, label: "Horizontal" },
] as const;

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

export default function ChartView({ tasks, columns, onSelectTask }: ChartViewProps) {
  const [chartType, setChartType] = useState<string>("bar");
  const [groupBy, setGroupBy] = useState<string>("status");

  const groupData = (field: string) => {
    const groups: Record<string, number> = {};
    tasks.forEach(t => {
      const key = t[field] || "unassigned";
      groups[key] = (groups[key] || 0) + 1;
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  };

  const data = groupData(groupBy);

  const statusColors: Record<string, string> = {
    todo: "#94a3b8", in_progress: "#f59e0b", done: "#10b981",
    completed: "#10b981", high: "#ef4444", medium: "#f59e0b",
    low: "#10b981", unassigned: "#94a3b8"
  };

  const renderChart = () => {
    switch (chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff", borderRadius: "8px",
                  border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                }}
              />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      case "pie":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RePieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </RePieChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ReLineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1" }} />
            </ReLineChart>
          </ResponsiveContainer>
        );
      case "area":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#chartGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        );
      case "donut":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RePieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </RePieChart>
          </ResponsiveContainer>
        );
      default:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip />
              <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold">Analytics</h3>
          <p className="text-xs text-muted-foreground">{tasks.length} items across {data.length} groups</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="h-8 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-2"
          >
            <option value="status">Status</option>
            <option value="priority">Priority</option>
            <option value="assigneeId">Assignee</option>
          </select>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <RefreshCcw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="flex gap-1 mb-6 p-1 bg-slate-100/50 dark:bg-slate-900/50 rounded-xl w-fit border border-slate-200/50 dark:border-slate-800/50">
        {CHART_TYPES.map(ct => (
          <button
            key={ct.id}
            onClick={() => setChartType(ct.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
              chartType === ct.id
                ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            <ct.icon className="h-3 w-3" />
            {ct.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0">
        <Card className="h-full border shadow-sm">
          <CardContent className="p-6 h-full">
            {data.length > 0 ? (
              <div className="h-full">{renderChart()}</div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No data to chart</p>
                  <p className="text-xs mt-1">Add tasks to see analytics</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{d.name}</p>
              <p className="text-lg font-bold">{d.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
