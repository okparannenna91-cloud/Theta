"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  BarChart3, PieChart, Activity,
  BarChartHorizontal, LineChart,
  RefreshCcw
} from "lucide-react";
import { PostHogChart, PostHogMetricCard } from "@/components/analytics/posthog-chart";

interface ChartViewProps {
  workspaceId?: string;
}

const CHART_EVENTS = [
  { event: "task_created", label: "Tasks Created", color: "text-indigo-500" },
  { event: "task_completed", label: "Tasks Completed", color: "text-emerald-500" },
  { event: "ai_used", label: "AI Usage", color: "text-violet-500" },
  { event: "project_created", label: "Projects", color: "text-amber-500" },
];

export default function ChartView({ workspaceId }: ChartViewProps) {
  const [selectedEvent, setSelectedEvent] = useState("task_created");

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold">PostHog Analytics</h3>
          <p className="text-xs text-muted-foreground">Event data from PostHog</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {CHART_EVENTS.map((evt) => (
          <PostHogMetricCard
            key={evt.event}
            label={evt.label}
            value="—"
            color={evt.color}
          />
        ))}
      </div>

      <div className="flex gap-1 mb-4 p-1 bg-slate-100/50 dark:bg-slate-900/50 rounded-xl w-fit border border-slate-200/50 dark:border-slate-800/50">
        {CHART_EVENTS.map((evt) => (
          <button
            key={evt.event}
            onClick={() => setSelectedEvent(evt.event)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
              selectedEvent === evt.event
                ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Activity className="h-3 w-3" />
            {evt.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0">
        <Card className="h-full border shadow-sm">
          <CardContent className="p-6 h-full">
            <PostHogChart
              event={selectedEvent}
              since="-30d"
              type="bar"
              height={300}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
