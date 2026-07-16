"use client";

import { useMemo, useState, useCallback } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  differenceInDays,
  isSameDay,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  isToday,
} from "date-fns";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Flag,
  Milestone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type ZoomLevel = "day" | "week" | "month";

interface TimelineViewProps {
  tasks: any[];
  projectId?: string;
}

const ZOOM_CONFIG = {
  day: { cellWidth: 48, label: "Day" },
  week: { cellWidth: 120, label: "Week" },
  month: { cellWidth: 200, label: "Month" },
} as const;

function getVisibleDays(zoom: ZoomLevel, refDate: Date): Date[] {
  switch (zoom) {
    case "day": {
      const start = startOfWeek(refDate);
      return Array.from({ length: 42 }).map((_, i) => addDays(start, i));
    }
    case "week": {
      const start = startOfMonth(subMonths(refDate, 1));
      return Array.from({ length: 90 }).map((_, i) => addDays(start, i));
    }
    case "month": {
      const start = startOfMonth(subMonths(refDate, 6));
      return Array.from({ length: 365 }).map((_, i) => addDays(start, i));
    }
  }
}

export function TimelineView({ tasks, projectId }: TimelineViewProps) {
  const router = useRouter();
  const [zoom, setZoom] = useState<ZoomLevel>("week");
  const [refDate, setRefDate] = useState(new Date());
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const days = useMemo(() => getVisibleDays(zoom, refDate), [zoom, refDate]);
  const cellWidth = ZOOM_CONFIG[zoom].cellWidth;

  const startDate = days[0];
  const totalDays = days.length;

  const safeTasks = useMemo(() => {
    if (!Array.isArray(tasks)) return [];
    return tasks.filter((t) => {
      if (!t.dueDate) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      return true;
    });
  }, [tasks, filterPriority, filterStatus]);

  const handleTaskClick = useCallback(
    (task: any) => {
      if (projectId) {
        router.push(`/projects/${projectId}?task=${task.id}`);
      }
    },
    [router, projectId]
  );

  const goToday = () => setRefDate(new Date());
  const goPrev = () =>
    setRefDate((d) => (zoom === "month" ? subMonths(d, 1) : addDays(d, zoom === "day" ? -7 : -30)));
  const goNext = () =>
    setRefDate((d) => (zoom === "month" ? addMonths(d, 1) : addDays(d, zoom === "day" ? 7 : 30)));

  const todayOffset = useMemo(() => {
    const today = new Date();
    return differenceInDays(today, startDate);
  }, [startDate]);

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-slate-950 rounded-xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Project Timeline</h3>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
              Visual roadmap of planned work
            </p>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="h-8 w-28 text-[10px] font-semibold">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 w-28 text-[10px] font-semibold">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Zoom controls */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            {(["day", "week", "month"] as ZoomLevel[]).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setZoom(lvl)}
                className={cn(
                  "px-3 py-1 rounded-md text-[10px] font-semibold transition-all",
                  zoom === lvl
                    ? "bg-white dark:bg-slate-900 text-primary shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                )}
              >
                {ZOOM_CONFIG[lvl].label}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goPrev}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[10px] font-semibold px-3" onClick={goToday}>
              Today
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goNext}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Timeline grid */}
      <ScrollArea className="flex-1">
        <div className="min-w-[1200px] flex flex-col">
          {/* Day headers */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10 bg-white dark:bg-slate-950">
            <div className="w-56 sticky left-0 bg-white dark:bg-slate-950 border-r z-10 px-4 py-2 text-[10px] font-bold text-slate-400">
              Task
            </div>
            {days.map((day, i) => {
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const isMonthStart = day.getDate() === 1;
              return (
                <div
                  key={i}
                  className={cn(
                    "border-r border-slate-100 dark:border-slate-800 px-1 py-2 flex flex-col items-center",
                    isWeekend && "bg-slate-50/50 dark:bg-slate-900/50",
                    isMonthStart && "border-l-2 border-l-slate-300"
                  )}
                  style={{ width: cellWidth }}
                >
                  {zoom !== "month" && (
                    <span className="text-[9px] text-slate-400 font-semibold">
                      {format(day, "EEE")}
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-xs font-bold",
                      isToday(day) ? "text-primary" : "text-slate-700 dark:text-slate-300"
                    )}
                  >
                    {zoom === "month" ? format(day, "MMM") : format(day, "d")}
                  </span>
                  {isMonthStart && (
                    <span className="text-[8px] font-bold text-slate-400">{format(day, "MMM yy")}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Today marker line */}
          {todayOffset >= 0 && todayOffset < totalDays && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-primary/40 z-5 pointer-events-none"
              style={{ left: 224 + todayOffset * cellWidth }}
            />
          )}

          {/* Task rows */}
          <div className="flex-1 relative">
            {safeTasks.map((task) => {
              const taskStart = task.startDate ? new Date(task.startDate) : new Date(task.createdAt);
              const taskEnd = new Date(task.dueDate);
              const startOffset = Math.max(0, differenceInDays(taskStart, startDate));
              const duration = Math.max(1, differenceInDays(taskEnd, taskStart));

              const isMilestone = task.isMilestone || task.title?.toLowerCase().includes("milestone");

              const priorityColor =
                task.priority === "high"
                  ? "bg-red-500"
                  : task.priority === "medium"
                  ? "bg-amber-400"
                  : "bg-emerald-500";

              const statusOpacity = task.status === "done" ? "opacity-50" : "";

              return (
                <div
                  key={task.id}
                  className="flex border-b border-slate-50 dark:border-slate-800/50 group hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                  onClick={() => handleTaskClick(task)}
                >
                  <div className="w-56 sticky left-0 bg-white dark:bg-slate-950 border-r z-10 px-4 py-3 flex items-center min-w-0 gap-2">
                    {task.priority === "high" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    )}
                    <span className="text-xs font-bold truncate group-hover:text-primary transition-colors">
                      {task.title}
                    </span>
                    {task.status === "done" && (
                      <span className="text-[8px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded flex-shrink-0">
                        DONE
                      </span>
                    )}
                  </div>
                  <div className="flex-1 relative h-11">
                    {isMilestone ? (
                      <div
                        className="absolute top-2.5"
                        style={{ left: startOffset * cellWidth }}
                      >
                        <div className="relative">
                          <Milestone
                            className="h-5 w-5 text-primary rotate-45 fill-primary/20"
                          />
                          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-primary whitespace-nowrap">
                            {task.title}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "absolute top-2 h-7 rounded-md flex items-center px-2 shadow-sm border border-black/5 transition-all group-hover:shadow-md",
                          priorityColor,
                          "text-white",
                          statusOpacity
                        )}
                        style={{
                          left: startOffset * cellWidth,
                          width: Math.max(duration * cellWidth, cellWidth * 0.5),
                        }}
                      >
                        <span className="text-[9px] font-bold truncate">{task.title}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {safeTasks.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
                <Flag className="h-8 w-8 mb-3 opacity-30" />
                <span className="text-xs font-semibold">
                  {tasks.length === 0
                    ? "No tasks with due dates yet."
                    : "No tasks match your filters."}
                </span>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
