"use client";

import { format, parseISO } from "date-fns";
import {
  CalendarDays, User, Flag, Tag, CheckCircle2, Target, Clock, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIORITY_CONFIG } from "./calendar-types";
import { getPriorityColor, getStatusColor } from "./calendar-utils";
import type { CalendarEvent } from "./calendar-types";
import { useWorkspace } from "@/hooks/use-workspace";
import { useWorkspaceMembers } from "@/hooks/use-workspace-members";
import { UserAvatar } from "@/components/ui/user-avatar";

const statusLabels: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  cancelled: "Cancelled",
  backlog: "Backlog",
  review: "Review",
};

interface CalendarEventBarProps {
  event: CalendarEvent;
  onClick: (event: CalendarEvent) => void;
  onMouseEnter?: (event: CalendarEvent, rect: DOMRect) => void;
  onMouseLeave?: () => void;
  compact?: boolean;
}

export function CalendarEventBar({ event, onClick, onMouseEnter, onMouseLeave, compact }: CalendarEventBarProps) {
  const priorityColor = PRIORITY_CONFIG[event.priority]?.color || PRIORITY_CONFIG.none.color;

  return (
    <div
      className={cn(
        "relative flex items-center gap-1 px-1.5 py-0.5 select-none cursor-pointer group",
        "transition-all duration-150 ease-out rounded-md",
        "hover:shadow-md hover:z-10",
        event.isCompleted && "opacity-50",
        event.isOverdue && "ring-1 ring-destructive/30",
      )}
      style={{
        backgroundColor: `${event.color}18`,
      }}
      onClick={(e) => { e.stopPropagation(); onClick(event); }}
      onMouseEnter={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        onMouseEnter?.(event, rect);
      }}
      onMouseLeave={onMouseLeave}
    >
      <div
        className="absolute left-0 top-0.5 bottom-0.5 w-0.5 rounded-full transition-all duration-200"
        style={{ backgroundColor: priorityColor }}
      />

      {compact ? (
        <div className="h-1.5 w-full rounded-full ml-1" style={{ backgroundColor: event.color }} />
      ) : (
        <>
          <span className="text-[11px] font-medium truncate flex-1 text-foreground/70 group-hover:text-foreground transition-colors duration-200 ml-1">
            {event.title}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0 mr-0.5">
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0 ring-1 ring-background"
              style={{ backgroundColor: getStatusColor(event.status) }}
            />
          </div>
        </>
      )}
    </div>
  );
}

interface CalendarEventHoverCardProps {
  event: CalendarEvent;
}

export function CalendarEventHoverCard({ event }: CalendarEventHoverCardProps) {
  const priorityColor = getPriorityColor(event.priority);
  const statusColor = getStatusColor(event.status);
  const statusLabel = statusLabels[event.status] || event.status?.replace(/_/g, " ");
  const { activeWorkspaceId } = useWorkspace();
  const { memberMap } = useWorkspaceMembers(activeWorkspaceId);

  const dateRange = (() => {
    const start = event.startDate ? format(parseISO(event.startDate), "MMM d") : "";
    const end = event.dueDate ? format(parseISO(event.dueDate), "MMM d, yyyy") : "";
    if (event.isMultiDay) return `${start} → ${end}`;
    return end || start;
  })();

  const assignees = event.assigneeIds
    .map((id) => memberMap[id]?.user)
    .filter(Boolean);

  return (
    <div className="w-72 rounded-xl border bg-popover/95 backdrop-blur-xl shadow-2xl overflow-hidden">
      {event.color && (
        <div className="h-1 w-full" style={{ backgroundColor: event.color }} />
      )}
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

          {assignees.length > 0 && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <User className="h-3.5 w-3.5 shrink-0" />
              <div className="flex -space-x-1">
                {assignees.map((u: any) => (
                  <UserAvatar key={u.id} imageUrl={u.imageUrl} name={u.name} size="sm" className="ring-1 ring-background" />
                ))}
              </div>
            </div>
          )}

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
