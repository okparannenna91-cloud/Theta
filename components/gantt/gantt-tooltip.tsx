"use client";

import { useMemo } from "react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays, Flag, Users, Link2, Clock, AlertCircle,
  CheckCircle2, Circle, ArrowRight, Milestone, Layers
} from "lucide-react";

interface GanttTooltipProps {
  task: any;
  style?: React.CSSProperties;
}

export function GanttTooltip({ task, style }: GanttTooltipProps) {
  const duration = useMemo(() => {
    if (!task.startDate || !task.dueDate) return null;
    return differenceInDays(new Date(task.dueDate), new Date(task.startDate)) + 1;
  }, [task]);

  const priorityColor: Record<string, string> = {
    urgent: "text-red-500 bg-red-500/10",
    high: "text-rose-500 bg-rose-500/10",
    medium: "text-amber-500 bg-amber-500/10",
    low: "text-emerald-500 bg-emerald-500/10",
  };

  const statusColor: Record<string, string> = {
    done: "text-emerald-500 bg-emerald-500/10",
    in_progress: "text-blue-500 bg-blue-500/10",
    todo: "text-muted-foreground bg-muted/30",
    blocked: "text-red-500 bg-red-500/10",
    stuck: "text-red-500 bg-red-500/10",
    backlog: "text-muted-foreground bg-muted/10",
  };

  return (
    <div
      style={style}
      className="absolute z-50 pointer-events-none"
    >
      <div className="bg-popover/95 backdrop-blur-xl border rounded-xl shadow-2xl p-3 min-w-[240px] max-w-[300px]">
        <div className="flex items-start gap-2 mb-2">
          {task.isMilestone ? (
            <Milestone className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          ) : task.isSummary ? (
            <Layers className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          ) : (
            <div className="h-4 w-4 rounded-full border-2 mt-0.5 flex-shrink-0" style={{
              borderColor: task.color || (task.isCritical ? "#ef4444" : "#8b5cf6"),
              backgroundColor: (task.color || (task.isCritical ? "#ef4444" : "#8b5cf6")) + "20"
            }} />
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold leading-tight truncate">{task.title}</p>
            {task.project && (
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{task.project.name}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[10px]">
            {task.status && (
              <span className={cn("px-1.5 py-0.5 rounded-full font-medium", statusColor[task.status] || "bg-muted/30 text-muted-foreground")}>
                {task.status.replace("_", " ")}
              </span>
            )}
            {task.priority && (
              <span className={cn("px-1.5 py-0.5 rounded-full font-medium", priorityColor[task.priority] || "bg-muted/30 text-muted-foreground")}>
                {task.priority}
              </span>
            )}
            {task.isCritical && (
              <Badge variant="outline" className="bg-red-500/20 text-red-500 border-red-500/40 text-[8px] py-0 h-4">CRITICAL</Badge>
            )}
          </div>

          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            {task.startDate && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {format(new Date(task.startDate), "MMM d")}
              </span>
            )}
            {task.startDate && task.dueDate && (
              <ArrowRight className="h-2.5 w-2.5" />
            )}
            {task.dueDate && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {format(new Date(task.dueDate), "MMM d")}
              </span>
            )}
          </div>

          {duration !== null && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{duration} {duration === 1 ? "day" : "days"}</span>
            </div>
          )}

          {task.progress > 0 && (
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">{Math.round(task.progress)}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, task.progress))}%` }}
                />
              </div>
            </div>
          )}

          {task.assigneeIds && task.assigneeIds.length > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{task.assigneeIds.length} assignee{task.assigneeIds.length !== 1 ? "s" : ""}</span>
            </div>
          )}

          {task.predecessors && task.predecessors.length > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Link2 className="h-3 w-3" />
              <span>{task.predecessors.length} predecessor{task.predecessors.length !== 1 ? "s" : ""}</span>
              <span className="flex gap-1">
                {Array.from(new Set(task.predecessors.map((p: any) => p.type).filter(Boolean))).map((t) => (
                  <span key={t as string} className="px-1 rounded bg-muted text-[8px] font-semibold text-muted-foreground">{t as string}</span>
                ))}
              </span>
            </div>
          )}

          {task.isMilestone && (
            <div className="flex items-center gap-1.5 text-[10px] text-amber-500 font-medium">
              <Milestone className="h-3 w-3" />
              <span>Milestone</span>
            </div>
          )}

          {task.isSummary && task.children && task.children.length > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Layers className="h-3 w-3" />
              <span>{task.children.length} subtask{task.children.length !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}