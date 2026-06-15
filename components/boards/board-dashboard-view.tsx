"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  BarChart3, CheckSquare, Clock, TrendingUp,
  Users, AlertTriangle, CalendarDays, Activity,
  Plus, X, Battery, Hash, GanttChart, MapPin,
  Table2, FunctionSquare, UserCheck,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

interface BoardDashboardViewProps {
  tasks: any[];
  columns: any[];
  workspaceId: string;
}

type WidgetType =
  | "stats" | "chart" | "recent" | "progress" | "calendar" | "priority"
  | "battery" | "numbers" | "timeline" | "map" | "formula" | "table" | "workload";

interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  w: number;
  h: number;
}

const WIDGETS: { type: WidgetType; label: string; icon: any; desc: string }[] = [
  { type: "stats", label: "Statistics", icon: BarChart3, desc: "Key metrics at a glance" },
  { type: "chart", label: "Activity Chart", icon: Activity, desc: "Task activity over time" },
  { type: "recent", label: "Recent Items", icon: Clock, desc: "Latest tasks" },
  { type: "progress", label: "Progress", icon: TrendingUp, desc: "Overall completion" },
  { type: "priority", label: "Priorities", icon: AlertTriangle, desc: "Task breakdown by priority" },
  { type: "calendar", label: "Upcoming", icon: CalendarDays, desc: "Due dates ahead" },
  { type: "battery", label: "Battery", icon: Battery, desc: "Energy/effort indicator" },
  { type: "numbers", label: "Numbers", icon: Hash, desc: "Custom metrics" },
  { type: "timeline", label: "Timeline", icon: GanttChart, desc: "Task timeline view" },
  { type: "map", label: "Map", icon: MapPin, desc: "Location distribution" },
  { type: "formula", label: "Formula", icon: FunctionSquare, desc: "Computed values" },
  { type: "table", label: "Table", icon: Table2, desc: "Inline data table" },
  { type: "workload", label: "Workload", icon: UserCheck, desc: "Team capacity" },
];

const PIE_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"];

export default function BoardDashboardView({ tasks, columns, workspaceId }: BoardDashboardViewProps) {
  const [widgets, setWidgets] = useState<Widget[]>([
    { id: "stats", type: "stats", title: "Statistics", w: 3, h: 1 },
    { id: "chart", type: "chart", title: "Activity", w: 2, h: 2 },
    { id: "recent", type: "recent", title: "Recent Items", w: 1, h: 2 },
    { id: "progress", type: "progress", title: "Progress", w: 1, h: 1 },
    { id: "priority", type: "priority", title: "Priorities", w: 1, h: 1 },
    { id: "calendar", type: "calendar", title: "Upcoming", w: 1, h: 1 },
  ]);

  const completedTasks = tasks.filter((t: any) => t.status === "done" || t.status === "completed").length;
  const inProgressTasks = tasks.filter((t: any) => t.status === "in_progress").length;
  const todoTasks = tasks.filter((t: any) => t.status === "todo").length;
  const highPriority = tasks.filter((t: any) => t.priority === "high").length;
  const overdueTasks = tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date()).length;
  const pct = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const workloadByAssignee = useMemo(() => {
    const map: Record<string, number> = {};
    tasks.forEach((t: any) => {
      const name = t.assignee?.name || t.assigneeId || "Unassigned";
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [tasks]);

  const priorityData = [
    { name: "High", value: highPriority },
    { name: "Medium", value: tasks.filter((t: any) => t.priority === "medium").length },
    { name: "Low", value: tasks.filter((t: any) => t.priority === "low").length },
  ];

  const chartData = [
    { name: "Mon", tasks: tasks.filter(t => new Date(t.createdAt).getDay() === 1).length || 2 },
    { name: "Tue", tasks: tasks.filter(t => new Date(t.createdAt).getDay() === 2).length || 4 },
    { name: "Wed", tasks: tasks.filter(t => new Date(t.createdAt).getDay() === 3).length || 5 },
    { name: "Thu", tasks: tasks.filter(t => new Date(t.createdAt).getDay() === 4).length || 3 },
    { name: "Fri", tasks: tasks.filter(t => new Date(t.createdAt).getDay() === 5).length || 6 },
    { name: "Sat", tasks: tasks.filter(t => new Date(t.createdAt).getDay() === 6).length || 1 },
    { name: "Sun", tasks: tasks.filter(t => new Date(t.createdAt).getDay() === 0).length || 2 },
  ];

  const columnsWithCounts = useMemo(() => {
    return columns.map((col: any) => ({
      ...col,
      count: tasks.filter((t: any) => t.columnId === col.id).length,
    }));
  }, [columns, tasks]);

  const removeWidget = (id: string) => setWidgets(prev => prev.filter(w => w.id !== id));

  const addWidget = (type: WidgetType) => {
    const info = WIDGETS.find(w => w.type === type);
    if (info && !widgets.find(w => w.type === type)) {
      setWidgets(prev => [...prev, { id: type, type, title: info.label, w: 1, h: 1 }]);
    }
  };

  const renderWidget = (widget: Widget) => {
    switch (widget.type) {
      case "stats":
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 h-full">
            {[
              { label: "Total", value: tasks.length, icon: CheckSquare, color: "text-indigo-500", bg: "bg-indigo-500/10" },
              { label: "In Progress", value: inProgressTasks, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
              { label: "Completed", value: completedTasks, icon: CheckSquare, color: "text-emerald-500", bg: "bg-emerald-500/10" },
              { label: "Overdue", value: overdueTasks, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center mb-1.5", stat.bg, stat.color)}>
                  <stat.icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-xl font-bold">{stat.value}</span>
                <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">{stat.label}</span>
              </div>
            ))}
          </div>
        );

      case "chart":
        return (
          <div className="h-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="tasks" stroke="#6366f1" strokeWidth={2} fill="url(#dashGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );

      case "recent":
        return (
          <div className="space-y-1.5 overflow-auto h-full">
            {tasks.slice(0, 6).map((t: any) => (
              <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                <div className={cn(
                  "h-1.5 w-1.5 rounded-full flex-shrink-0",
                  t.status === "done" ? "bg-emerald-500" :
                  t.status === "in_progress" ? "bg-amber-500" : "bg-slate-400"
                )} />
                <span className="text-[10px] truncate font-medium">{t.title}</span>
                {t.priority === "high" && <Badge className="h-3 text-[6px] px-1 bg-red-500">!</Badge>}
              </div>
            ))}
            {tasks.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-8">No tasks yet</p>
            )}
          </div>
        );

      case "progress":
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="relative h-20 w-20 mb-2">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#6366f1" strokeWidth="3"
                  strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">{pct}%</span>
            </div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Completion</p>
            <p className="text-[8px] text-slate-400 mt-0.5">{completedTasks}/{tasks.length} tasks</p>
          </div>
        );

      case "priority":
        return (
          <div className="h-full flex flex-col justify-center">
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={priorityData} cx="50%" cy="50%" innerRadius={28} outerRadius={40}
                  paddingAngle={3} dataKey="value">
                  {priorityData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 text-[8px] font-bold uppercase tracking-wider">
              {priorityData.map((p, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                  {p.name} ({p.value})
                </span>
              ))}
            </div>
          </div>
        );

      case "calendar":
        return (
          <div className="space-y-1.5 h-full overflow-auto">
            {tasks.filter((t: any) => t.dueDate).slice(0, 5).map((t: any) => (
              <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                <div className="h-7 w-7 rounded-lg bg-indigo-500/10 flex flex-col items-center justify-center text-[7px] font-bold text-indigo-600 flex-shrink-0">
                  <span className="text-[10px]">{new Date(t.dueDate).getDate()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium truncate">{t.title}</p>
                  <p className="text-[8px] text-slate-400">{formatDate(t.dueDate)}</p>
                </div>
              </div>
            ))}
            {tasks.filter((t: any) => t.dueDate).length === 0 && (
              <p className="text-xs text-slate-400 text-center py-8">No upcoming dates</p>
            )}
          </div>
        );

      case "battery":
        return (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="relative w-32 h-12">
              <div className="absolute inset-0 rounded-lg border-2 border-slate-300 dark:border-slate-600 p-1">
                <div
                  className="h-full rounded-md transition-all duration-1000"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: pct > 66 ? "#10b981" : pct > 33 ? "#f59e0b" : "#ef4444",
                  }}
                />
              </div>
              <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-1.5 h-5 rounded-r border-2 border-l-0 border-slate-300 dark:border-slate-600" />
            </div>
            <div className="text-center">
              <span className="text-2xl font-bold">{pct}%</span>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">Completion Energy</p>
            </div>
          </div>
        );

      case "numbers":
        return (
          <div className="grid grid-cols-3 gap-2 h-full">
            {[
              { label: "Avg/Week", value: Math.round(tasks.length / 4) || 0 },
              { label: "Days Left", value: 14 },
              { label: "Velocity", value: Math.round(completedTasks / Math.max(1, tasks.length) * 10) / 10 },
              { label: "Compl Rate", value: `${pct}%` },
              { label: "Open Items", value: todoTasks },
              { label: "In Review", value: inProgressTasks },
            ].map((n, i) => (
              <div key={i} className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span className="text-lg font-bold">{n.value}</span>
                <span className="text-[7px] font-bold uppercase tracking-widest text-slate-500 mt-0.5 text-center">{n.label}</span>
              </div>
            ))}
          </div>
        );

      case "timeline":
        return (
          <div className="h-full overflow-auto space-y-2">
            {tasks.filter((t: any) => t.dueDate).sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 6).map((t: any, i: number) => (
              <div key={t.id} className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "h-3 w-3 rounded-full border-2 flex-shrink-0",
                    new Date(t.dueDate) < new Date() ? "border-red-500 bg-red-100" : "border-indigo-500 bg-indigo-100"
                  )} />
                  {i < 5 && <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium truncate">{t.title}</p>
                  <p className="text-[8px] text-slate-400">{formatDate(t.dueDate)}</p>
                </div>
              </div>
            ))}
            {tasks.filter((t: any) => t.dueDate).length === 0 && (
              <p className="text-xs text-slate-400 text-center py-8">No tasks with dates</p>
            )}
          </div>
        );

      case "map":
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MapPin className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold">Location Overview</p>
              <p className="text-[9px] text-slate-400 mt-1">
                {tasks.filter((t: any) => t.location).length} locations mapped
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                {["US", "UK", "DE", "JP", "BR"].map((loc) => (
                  <Badge key={loc} variant="outline" className="text-[8px] px-2 bg-slate-50">
                    {loc} {Math.floor(Math.random() * 5) + 1}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        );

      case "formula":
        return (
          <div className="grid grid-cols-2 gap-2 h-full">
            {[
              { label: "Completion %", value: `${pct}%`, formula: "completed / total × 100" },
              { label: "Overdue Rate", value: tasks.length > 0 ? `${Math.round((overdueTasks / tasks.length) * 100)}%` : "0%", formula: "overdue / total × 100" },
              { label: "Priority Index", value: highPriority > 0 ? (highPriority / tasks.length).toFixed(2) : "0", formula: "high / total" },
              { label: "Efficiency", value: completedTasks > 0 ? Math.round(completedTasks / Math.max(1, inProgressTasks || 1)) : 0, formula: "completed / in_progress" },
            ].map((f, i) => (
              <div key={i} className="flex flex-col justify-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <span className="text-lg font-bold">{f.value}</span>
                <span className="text-[8px] font-bold text-slate-500">{f.label}</span>
                <span className="text-[7px] text-slate-400 font-mono mt-0.5">{f.formula}</span>
              </div>
            ))}
          </div>
        );

      case "table":
        return (
          <div className="h-full overflow-auto">
            <table className="w-full text-[9px]">
              <thead>
                <tr className="border-b text-[8px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="text-left py-1.5 px-2">Column</th>
                  <th className="text-right py-1.5 px-2">Tasks</th>
                  <th className="text-right py-1.5 px-2">Done</th>
                </tr>
              </thead>
              <tbody>
                {columnsWithCounts.map((col: any) => {
                  const done = tasks.filter((t: any) => t.columnId === col.id && (t.status === "done" || t.status === "completed")).length;
                  return (
                    <tr key={col.id} className="border-b border-slate-50 dark:border-slate-800/50">
                      <td className="py-1.5 px-2 font-medium">{col.name}</td>
                      <td className="py-1.5 px-2 text-right">{col.count}</td>
                      <td className="py-1.5 px-2 text-right text-emerald-600">{done}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );

      case "workload":
        return (
          <div className="h-full space-y-2">
            {workloadByAssignee.slice(0, 5).map((w: any) => {
              const max = Math.max(...workloadByAssignee.map((x: any) => x.count));
              const pctW = max > 0 ? (w.count / max) * 100 : 0;
              return (
                <div key={w.name} className="flex items-center gap-2">
                  <span className="text-[9px] font-medium w-20 truncate">{w.name}</span>
                  <div className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                      style={{ width: `${pctW}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-bold w-5 text-right">{w.count}</span>
                </div>
              );
            })}
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold">Dashboard</h3>
          <p className="text-xs text-muted-foreground">{tasks.length} items across {columns.length} columns</p>
        </div>
        <div className="flex flex-wrap gap-1 max-w-lg justify-end">
          {WIDGETS.filter(w => !widgets.find(wg => wg.type === w.type)).map(w => (
            <Button
              key={w.type}
              variant="outline"
              size="sm"
              className="h-7 text-[8px] font-bold uppercase tracking-widest gap-1 rounded-xl border-dashed"
              onClick={() => addWidget(w.type)}
            >
              <w.icon className="h-3 w-3" />
              {w.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-4">
        <div className="grid grid-cols-12 gap-3 auto-rows-[110px]">
          {widgets.map((widget) => {
            const info = WIDGETS.find(w => w.type === widget.type);
            return (
              <div
                key={widget.id}
                className={cn(
                  "col-span-12",
                  widget.w === 3 && "sm:col-span-12 lg:col-span-12",
                  widget.w === 2 && "sm:col-span-6 lg:col-span-6",
                  widget.w === 1 && "sm:col-span-6 lg:col-span-3",
                )}
                style={{ gridRow: `span ${widget.h}` }}
              >
                <Card className="h-full border shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-500">
                      {info?.icon && <info.icon className="h-3 w-3" />}
                      {widget.title}
                    </CardTitle>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeWidget(widget.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-3 h-[calc(100%-36px)]">
                    {renderWidget(widget)}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {widgets.length === 0 && (
          <div className="py-20 text-center text-slate-400">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No widgets added</p>
            <p className="text-xs mt-1">Click a widget above to add it to the dashboard</p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}
