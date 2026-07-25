"use client";

import { useMemo, useState } from "react";
import { format, parseISO, isAfter, isBefore, startOfDay, addDays, differenceInCalendarDays } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarEventHoverCard } from "./calendar-event";
import type { CalendarEvent } from "./calendar-types";
import {
  CalendarDays, Clock, AlertCircle, CheckCircle2, Target, ChevronRight
} from "lucide-react";
import { getStatusColor } from "./calendar-utils";

interface AgendaViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export function AgendaView({
  currentDate,
  events,
  onEventClick,
}: AgendaViewProps) {
  const [hoveredEvent, setHoveredEvent] = useState<{ event: CalendarEvent; rect: DOMRect } | null>(null);

  const groupedEvents = useMemo(() => {
    const now = startOfDay(new Date());
    const endDate = addDays(now, 30);

    const upcoming = events
      .filter((e) => {
        if (!e.dueDate) return false;
        const d = startOfDay(parseISO(e.dueDate));
        return !isBefore(d, now) && !isAfter(d, endDate);
      })
      .sort((a, b) => {
        if (!a.dueDate || !b.dueDate) return 0;
        return parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime();
      });

    const grouped: { date: Date; label: string; events: CalendarEvent[] }[] = [];
    let currentGroup: { date: Date; label: string; events: CalendarEvent[] } | null = null;

    for (const event of upcoming) {
      const d = startOfDay(parseISO(event.dueDate!));
      const daysDiff = differenceInCalendarDays(d, now);
      let label: string;
      if (daysDiff === 0) label = "Today";
      else if (daysDiff === 1) label = "Tomorrow";
      else if (daysDiff < 7) label = format(d, "EEEE");
      else label = format(d, "MMM d, yyyy");

      if (!currentGroup || !isSameDay(currentGroup.date, d)) {
        currentGroup = { date: d, label, events: [] };
        grouped.push(currentGroup);
      }
      currentGroup.events.push(event);
    }

    return grouped;
  }, [events]);

  const overdueEvents = useMemo(
    () => events
      .filter((e) => e.isOverdue)
      .sort((a, b) => {
        if (!a.dueDate || !b.dueDate) return 0;
        return parseISO(b.dueDate).getTime() - parseISO(a.dueDate).getTime();
      }),
    [events]
  );

  function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
  }

  return (
    <div className="space-y-4">
      {overdueEvents.length > 0 && (
        <div className="border-subtle rounded-xl bg-card shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-destructive/5 border-b border-destructive/10">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-semibold text-destructive">Overdue</span>
              <span className="text-xs text-muted-foreground">({overdueEvents.length})</span>
            </div>
          </div>
          <div className="divide-y">
            {overdueEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => onEventClick(event)}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredEvent({ event, rect });
                }}
                onMouseLeave={() => setHoveredEvent(null)}
              >
                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: event.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{event.title}</span>
                    {event.isMilestone && <Target className="h-3 w-3 text-amber-500 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">
                      Due {format(parseISO(event.dueDate!), "MMM d")}
                    </span>
                    <span className="text-[11px] capitalize text-destructive font-medium">Overdue</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {groupedEvents.map((group) => (
        <div key={group.date.toISOString()} className="border-subtle rounded-xl bg-card shadow-sm overflow-hidden">
          <div className={cn(
            "px-4 py-2.5 border-b bg-muted/20",
            group.label === "Today" && "bg-primary/5"
          )}>
            <span className={cn(
              "text-sm font-semibold",
              group.label === "Today" && "text-primary"
            )}>
              {group.label}
            </span>
            <span className="text-xs text-muted-foreground ml-2">{format(group.date, "MMM d")}</span>
          </div>
          <div className="divide-y">
            {group.events.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => onEventClick(event)}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredEvent({ event, rect });
                }}
                onMouseLeave={() => setHoveredEvent(null)}
              >
                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: event.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm truncate",
                      event.isCompleted && "text-muted-foreground line-through"
                    )}>
                      {event.title}
                    </span>
                    {event.isMilestone && <Target className="h-3 w-3 text-amber-500 shrink-0" />}
                    {event.isCompleted && <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {event.startDate && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(event.startDate), "MMM d")}
                        {event.isMultiDay && ` → ${format(parseISO(event.dueDate!), "MMM d")}`}
                      </span>
                    )}
                    <span className="text-[11px] capitalize" style={{ color: getStatusColor(event.status) }}>
                      {event.status?.replace(/_/g, " ")}
                    </span>
                    {event.project && (
                      <span className="text-[11px] text-muted-foreground">{event.project.name}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ))}

      {overdueEvents.length === 0 && groupedEvents.length === 0 && (
        <div className="text-center py-16 text-muted-foreground border rounded-xl">
          <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">No upcoming tasks</p>
          <p className="text-xs mt-1">Create a task with a due date to see it here.</p>
        </div>
      )}

      {hoveredEvent && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: Math.min(hoveredEvent.rect.left, window.innerWidth - 300),
            top: hoveredEvent.rect.top - 10,
          }}
        >
          <CalendarEventHoverCard event={hoveredEvent.event} />
        </div>
      )}
    </div>
  );
}