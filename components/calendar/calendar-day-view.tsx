"use client";

import { useMemo, useState } from "react";
import { isToday, format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { getEventsForDay } from "./calendar-utils";
import { CalendarEventBar, CalendarEventHoverCard } from "./calendar-event";
import type { CalendarEvent } from "./calendar-types";

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDayClick: (day: Date) => void;
  onLogActivity: (action: string, taskId: string, metadata?: any) => void;
}

export function DayView({
  currentDate,
  events,
  onDayClick,
}: DayViewProps) {
  const [hoveredEvent, setHoveredEvent] = useState<{ event: CalendarEvent; rect: DOMRect } | null>(null);

  const dayEvents = useMemo(() => getEventsForDay(events, currentDate), [events, currentDate]);

  const allDayEvents = useMemo(
    () => dayEvents.filter((e) => e.isAllDay || !e.startDate),
    [dayEvents]
  );

  const timedEvents = useMemo(
    () => dayEvents.filter((e) => !e.isAllDay && e.startDate),
    [dayEvents]
  );

  const HOURS = Array.from({ length: 24 }, (_, h) => h);

  return (
    <div className="rounded-xl border shadow-sm bg-card overflow-hidden">
      <div className="border-b bg-muted/30 p-4 text-center">
        <div className="text-xs font-medium text-muted-foreground">{format(currentDate, "EEEE")}</div>
        <div className={cn("text-2xl font-bold mt-1 h-10 w-10 mx-auto flex items-center justify-center rounded-full", isToday(currentDate) && "bg-primary text-primary-foreground")}>
          {format(currentDate, "d")}
        </div>
        <div className="text-xs text-muted-foreground mt-1">{format(currentDate, "MMMM yyyy")}</div>
      </div>

      {allDayEvents.length > 0 && (
        <div className="border-b">
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary/50" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">All Day</span>
              <span className="text-[10px] text-muted-foreground/60">({allDayEvents.length})</span>
            </div>
            <div className="space-y-1">
              {allDayEvents.map((event) => (
                <CalendarEventBar
                  key={event.id}
                  event={event}
                  onMouseEnter={(ev, rect) => setHoveredEvent({ event: ev, rect })}
                  onMouseLeave={() => setHoveredEvent(null)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="divide-y max-h-[500px] overflow-y-auto">
        {HOURS.map((hour) => {
          const hourlyEvents = timedEvents.filter((e) => {
            if (!e.startDate) return false;
            return parseISO(e.startDate).getHours() === hour;
          });

          return (
            <div
              key={hour}
              className="flex min-h-[52px] hover:bg-muted/10 transition-colors cursor-pointer"
              onClick={() => onDayClick(currentDate)}
            >
              <div className="w-16 shrink-0 border-r px-2 py-1.5 text-right sticky left-0 bg-card">
                <span className="text-[10px] text-muted-foreground font-medium">
                  {format(new Date().setHours(hour, 0, 0, 0), "ha")}
                </span>
              </div>
              <div className="flex-1 px-2 py-1 space-y-0.5">
                {hourlyEvents.map((event) => (
                  <CalendarEventBar
                    key={event.id}
                    event={event}
                    onMouseEnter={(ev, rect) => setHoveredEvent({ event: ev, rect })}
                    onMouseLeave={() => setHoveredEvent(null)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

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
