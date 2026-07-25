"use client";

import { useMemo, useState } from "react";
import { isSameDay, isToday, isWeekend, format, startOfDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { getWeekDays, getEventsForDay } from "./calendar-utils";
import { CalendarEventBar, CalendarEventHoverCard } from "./calendar-event";
import type { CalendarEvent } from "./calendar-types";

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDayClick: (day: Date) => void;
  onEventDrop: (event: CalendarEvent, dropDay: Date) => void;
  onLogActivity: (action: string, taskId: string, metadata?: any) => void;
  showWeekends: boolean;
}

export function WeekView({
  currentDate,
  events,
  onEventClick,
  onDayClick,
  onEventDrop,
  onLogActivity,
  showWeekends,
}: WeekViewProps) {
  const [hoveredEvent, setHoveredEvent] = useState<{ event: CalendarEvent; rect: DOMRect } | null>(null);
  const [dragOverDay, setDragOverDay] = useState<Date | null>(null);

  const days = useMemo(() => getWeekDays(currentDate), [currentDate]);

  return (
    <div className="border-subtle rounded-xl bg-card overflow-hidden shadow-sm">
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/30">
        <div className="py-2.5 text-center text-[10px] font-semibold text-muted-foreground" />
        {days.map((day, i) => {
          if (!showWeekends && (i === 0 || i === 6)) return null;
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "py-2 text-center cursor-pointer hover:bg-muted/50 transition-colors",
                isToday(day) && "bg-primary/5"
              )}
              onClick={() => onDayClick(day)}
            >
              <div className="text-[10px] font-medium text-muted-foreground">{format(day, "EEE")}</div>
              <div
                className={cn(
                  "text-sm font-semibold mt-0.5 h-7 w-7 mx-auto flex items-center justify-center rounded-full",
                  isToday(day) && "bg-primary text-primary-foreground"
                )}
              >
                {format(day, "d")}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-[60px_repeat(7,1fr)]">
        {Array.from({ length: 24 }, (_, hour) => (
          <>
            <div
              key={`time-${hour}`}
              className="border-b border-r text-[10px] text-muted-foreground pr-2 text-right py-3"
            >
              {hour === 0 ? "" : format(new Date().setHours(hour, 0, 0, 0), "ha")}
            </div>
            {days.map((day, i) => {
              if (!showWeekends && (i === 0 || i === 6)) return null;
              const dayEvents = getEventsForDay(events, day);
              const hourlyEvents = dayEvents.filter((e) => {
                if (!e.startDate) return false;
                const h = parseISO(e.startDate).getHours();
                return h === hour;
              });

              return (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  className={cn(
                    "border-b border-r min-h-[48px] relative",
                    isWeekend(day) && "bg-muted/10",
                    isToday(day) && "bg-primary/[0.02]",
                  )}
                  onClick={() => onDayClick(day)}
                  onMouseEnter={() => setDragOverDay(day)}
                >
                  {hourlyEvents.map((event) => (
                    <div key={event.id} className="absolute inset-x-0.5 top-0.5 z-10">
                      <CalendarEventBar
                        event={event}
                        onClick={onEventClick}
                        onMouseEnter={(ev, rect) => setHoveredEvent({ event: ev, rect })}
                        onMouseLeave={() => setHoveredEvent(null)}
                      />
                    </div>
                  ))}
                  {hour === 0 && dayEvents.filter((e) => !e.startDate || parseISO(e.startDate).getHours() !== 0).length > 0 && (
                    <div className="pt-1 space-y-0.5">
                      {dayEvents
                        .filter((e) => !e.startDate || parseISO(e.startDate).getHours() !== 0)
                        .slice(0, 3)
                        .map((event) => (
                          <CalendarEventBar
                            key={event.id}
                            event={event}
                            onClick={onEventClick}
                            compact
                          />
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ))}
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