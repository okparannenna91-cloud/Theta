"use client";

import { format, parseISO } from "date-fns";
import { PRIORITY_CONFIG } from "./calendar-types";
import type { CalendarEvent } from "./calendar-types";
import { useMemberMap } from "@/components/providers/members-provider";
import { UserAvatar } from "@/components/ui/user-avatar";

interface CalendarTooltipProps {
  event: CalendarEvent;
  x: number;
  y: number;
}

const statusLabels: Record<string, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  "in-progress": "In Progress",
  review: "Review",
  done: "Done",
};

const statusColors: Record<string, string> = {
  todo: "#9ca3af",
  in_progress: "#3b82f6",
  "in-progress": "#3b82f6",
  review: "#8b5cf6",
  done: "#10b981",
};

export function CalendarTooltip({ event, x, y }: CalendarTooltipProps) {
  const task = event.originalTask;
  const priority = PRIORITY_CONFIG[event.priority] || PRIORITY_CONFIG.none;
  const memberMap = useMemberMap();

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return format(parseISO(d), "MMM d, yyyy");
  };

  const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  const tooltipWidth = 320;
  const offsetX = x + 16 > windowWidth - tooltipWidth ? x - tooltipWidth - 8 : x + 16;
  const offsetY = y + 16;

  const assignees = event.assigneeIds
    .map((id) => memberMap[id]?.user)
    .filter(Boolean);

  return (
    <div
      className="fixed z-[9999] w-80 rounded-xl shadow-2xl border bg-popover/95 backdrop-blur-xl overflow-hidden pointer-events-none animate-in fade-in zoom-in-95 duration-150"
      style={{ left: offsetX, top: offsetY }}
    >
      {event.color && (
        <div className="h-1 w-full" style={{ backgroundColor: event.color }} />
      )}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold text-foreground leading-snug">{event.title}</h4>
          {event.isOverdue && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex-shrink-0">
              Overdue
            </span>
          )}
        </div>

        {task?.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{task.description}</p>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <div className="text-muted-foreground">Status</div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColors[event.status] || "#9ca3af" }} />
            <span>{statusLabels[event.status] || event.status}</span>
          </div>

          <div className="text-muted-foreground">Priority</div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: priority.color }} />
            <span>{priority.label}</span>
          </div>

          {assignees.length > 0 && (
            <>
              <div className="text-muted-foreground">Assignees</div>
              <div className="flex items-center -space-x-1">
                {assignees.map((u: any) => (
                  <UserAvatar key={u.id} imageUrl={u.imageUrl} name={u.name} size="sm" />
                ))}
              </div>
            </>
          )}

          <div className="text-muted-foreground">Start</div>
          <div>{formatDate(event.startDate)}</div>

          <div className="text-muted-foreground">Due</div>
          <div>{formatDate(event.dueDate)}</div>

          {event.progress > 0 && (
            <>
              <div className="text-muted-foreground">Progress</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${event.progress}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground">{event.progress}%</span>
              </div>
            </>
          )}

          {event.project && (
            <>
              <div className="text-muted-foreground">Project</div>
              <div className="flex items-center gap-1.5">
                {event.project.color && (
                  <span className="w-2 h-2 rounded" style={{ backgroundColor: event.project.color }} />
                )}
                <span>{event.project.name}</span>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {task?.subtasks && task.subtasks.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
              {task.subtasks.filter((s: any) => s.completed).length}/{task.subtasks.length} subtasks
            </span>
          )}
          {task?.fieldValues?.attachments?.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
              {task.fieldValues.attachments.length} attachments
            </span>
          )}
          {task?._count?.comments > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
              {task._count.comments} comments
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
