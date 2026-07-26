"use client";

import { useMemo, useState } from "react";
import { isToday, isWeekend, format, parseISO, isAfter, isBefore } from "date-fns";
import { cn } from "@/lib/utils";
import { getWeekDays, getEventsForDay, placeEventsInWeek } from "./calendar-utils";
import { CalendarEventBar, CalendarEventHoverCard } from "./calendar-event";
import type { CalendarEvent } from "./calendar-types";
import { TaskBar } from "./calendar-task-bar";

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDayClick: (day: Date) => void;
  onEventDrop: (event: CalendarEvent, dropDay: Date) => void;
  onLogActivity: (action: string, taskId: string, metadata?: any) => void;
  showWeekends: boolean;
}

export function WeekView({
  events,
  currentDate,
  onDayClick,
}: WeekViewProps) {
  const [hoveredEvent, setHoveredEvent] = useState<{ event: CalendarEvent; rect: DOMRect } | null>(null);

  const days = useMemo(() => getWeekDays(currentDate), [currentDate]);

  const multiDayEvents = useMemo(() => {
    const weekStart = days[0];
    const weekEnd = days[days.length - 1];
    return events.filter(ev => {
      if (!ev.isMultiDay) return false;
      const eStart = ev.startDate ? parseISO(ev.startDate) : null;
      const eEnd = ev.dueDate ? parseISO(ev.dueDate) : null;
      if (!eStart && !eEnd) return false;
      const s = eStart || eEnd!;
      const end = eEnd || s;
      return !isBefore(end, weekStart) && !isAfter(s, weekEnd);
    });
  }, [events, days]);

  const allDayPlacements = useMemo(() => {
    if (multiDayEvents.length === 0) return [];
    return placeEventsInWeek(multiDayEvents, days);
  }, [multiDayEvents, days]);

  const timedEvents = useMemo(() => events.filter(e => !e.isMultiDay), [events]);

  const HOURS = Array.from({ length: 24 }, (_, h) => h);

  return (
    <div className="rounded-xl border shadow-sm bg-card overflow-hidden">
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/30">
        <div className="py-2.5 text-center text-[10px] font-semibold text-muted-foreground" />
        {days.map((day, i) => (
          <div
            key={day.toISOString()}
            className={cn("py-2 text-center cursor-pointer hover:bg-muted/50 transition-colors", isToday(day) && "bg-primary/5")}
            onClick={() => onDayClick(day)}
          >
            <div className="text-[10px] font-medium text-muted-foreground">{format(day, "EEE")}</div>
            <div className={cn("text-sm font-semibold mt-0.5 h-7 w-7 mx-auto flex items-center justify-center rounded-full", isToday(day) && "bg-primary text-primary-foreground")}>
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {allDayPlacements.length > 0 && (
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/10">
          <div className="text-[9px] text-muted-foreground px-1 py-2 text-right flex items-center justify-end">All day</div>
          <div className="col-span-7 p-1 space-y-0.5" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {allDayPlacements.map((placement) => (
              <div key={placement.event.id} style={{ gridColumn: `${placement.columnStart} / span ${placement.columnSpan}` }}>
                <TaskBar
                  placement={placement}
                  weekDays={days}
                  maxLanes={allDayPlacements.length}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-y-auto max-h-[600px]">
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              <div className="border-b border-r text-[10px] text-muted-foreground pr-2 text-right py-3 sticky left-0 bg-card">
                {hour === 0 ? "" : format(new Date().setHours(hour, 0, 0, 0), "ha")}
              </div>
              {days.map((day, i) => {
                const hourStart = new Date(day);
                hourStart.setHours(hour, 0, 0, 0);
                const hourEnd = new Date(day);
                hourEnd.setHours(hour + 1, 0, 0, 0);

                const cellEvents = getEventsForDay(timedEvents, day).filter(e => {
                  if (!e.startDate) return false;
                  const h = parseISO(e.startDate).getHours();
                  return h === hour;
                });

                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className={cn(
                      "border-b border-r min-h-[44px] relative transition-colors hover:bg-muted/10",
                      isWeekend(day) && "bg-muted/5",
                      isToday(day) && hour === new Date().getHours() && "bg-primary/[0.03]",
                    )}
                    onClick={() => onDayClick(day)}
                  >
                    <div className="absolute inset-x-0.5 top-0.5 space-y-0.5">
                      {cellEvents.map((event) => (
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
          ))}
        </div>
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
