"use client";

import { format, parseISO } from "date-fns";
import {
  CalendarDays, User, Flag, Tag, CheckCircle2, Target, Clock, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPriorityColor, getStatusColor } from "./calendar-utils";
import type { CalendarEvent } from "./calendar-types";

const statusLabels: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  cancelled: "Cancelled",
  backlog: "Backlog",
  review: "Review",
};

interface CalendarEventHoverCardProps {
  event: CalendarEvent;
}

export function CalendarEventHoverCard({ event }: CalendarEventHoverCardProps) {
  const priorityColor = getPriorityColor(event.priority);
  const statusColor = getStatusColor(event.status);
  const statusLabel = statusLabels[event.status] || event.status?.replace(/_/g, " ");

  const dateRange = (() => {
    const start = event.startDate ? format(parseISO(event.startDate), "MMM d") : "";
    const end = event.dueDate ? format(parseISO(event.dueDate), "MMM d, yyyy") : "";
    if (event.isMultiDay) return `${start} → ${end}`;
    return end || start;
  })();

  return (
    <div className="w-72 rounded-xl border-subtle bg-popover/95 backdrop-blur-xl shadow-2xl overflow-hidden">
      <div className="p-3.5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {event.isMilestone && <Target className="h-4 w-4 text-amber-500 shrink-0" />}
            <span className="text-sm font-semibold leading-tight truncate">{event.title}</span>
          </div>
          {event.isMilestone && (
            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded shrink-0">
              Milestone
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span>{dateRange}</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Flag className="h-3.5 w-3.5 shrink-0" style={{ color: priorityColor }} />
            <span className="capitalize">{event.priority}</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: statusColor }} />
            <span>{statusLabel}</span>
          </div>

          {event.isOverdue && (
            <div className="flex items-center gap-2 text-[11px] text-destructive font-medium">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>Overdue</span>
            </div>
          )}

          {event.isDueToday && !event.isOverdue && (
            <div className="flex items-center gap-2 text-[11px] text-amber-500 font-medium">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>Due today</span>
            </div>
          )}

          {event.assigneeIds.length > 0 && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span>{event.assigneeIds.length} assignee{event.assigneeIds.length !== 1 ? "s" : ""}</span>
            </div>
          )}

          {event.project && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Tag className="h-3.5 w-3.5 shrink-0" />
              <span>{event.project.name}</span>
            </div>
          )}
        </div>

        {event.progress > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Progress</span>
              <span>{Math.round(event.progress)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.max(0, event.progress))}%` }} />
            </div>
          </div>
        )}

        {event.isCompleted && (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-500 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Completed
          </div>
        )}
      </div>
    </div>
  );
}

interface CalendarEventBarProps {
  event: CalendarEvent;
  onClick: (event: CalendarEvent) => void;
  onMouseEnter?: (event: CalendarEvent, rect: DOMRect) => void;
  onMouseLeave?: () => void;
  compact?: boolean;
}

export function CalendarEventBar({ event, onClick, onMouseEnter, onMouseLeave, compact }: CalendarEventBarProps) {
  return (
    <div
      className={cn(
        "rounded-md px-1.5 py-0.5 text-[11px] font-medium truncate cursor-pointer select-none",
        "hover:brightness-110 active:brightness-90 transition-all",
        "border-l-2",
        event.isCompleted && "opacity-60 line-through",
        event.isOverdue && "ring-1 ring-destructive/30",
      )}
      style={{
        backgroundColor: `${event.color}20`,
        borderLeftColor: event.color,
      }}
      onClick={(e) => { e.stopPropagation(); onClick(event); }}
      onMouseEnter={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        onMouseEnter?.(event, rect);
      }}
      onMouseLeave={onMouseLeave}
    >
      {compact ? (
        <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: event.color }} />
      ) : (
        <span>{event.title}</span>
      )}
    </div>
  );
}