"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { isToday, format, parseISO, startOfDay, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { getEventsForDay } from "./calendar-utils";
import { CalendarEventBar, CalendarEventHoverCard } from "./calendar-event";
import type { CalendarEvent } from "./calendar-types";
import { CalendarDays } from "lucide-react";

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDayClick: (day: Date) => void;
  onEventDrop?: (event: CalendarEvent, dropDay: Date) => void;
  onEventResize?: (event: CalendarEvent, newStart: string, newEnd: string) => void;
  onLogActivity: (action: string, taskId: string, metadata?: any) => void;
}

export function DayView({
  currentDate,
  events,
  onDayClick,
  onEventDrop,
  onEventResize,
}: DayViewProps) {
  const [hoveredEvent, setHoveredEvent] = useState<{ event: CalendarEvent; rect: DOMRect } | null>(null);
  const [dragState, setDragState] = useState<{
    event: CalendarEvent;
    type: "move" | "resize-left" | "resize-right";
    startX: number;
    startY: number;
    currentHour: number;
  } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      if (!gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();
      const scrollTop = gridRef.current?.scrollTop || 0;
      const hourHeight = 52;
      const relY = e.clientY - rect.top + scrollTop;
      const hourIndex = Math.max(0, Math.min(23, Math.floor(relY / hourHeight)));
      setDragState(prev => prev ? { ...prev, currentHour: hourIndex } : null);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!gridRef.current || !dragState) return;

      const fromDate = dragState.event.startDate ? parseISO(dragState.event.startDate) : new Date();
      const toDate = dragState.event.dueDate ? parseISO(dragState.event.dueDate) : fromDate;

      if (dragState.type === "move") {
        onEventDrop?.(dragState.event, currentDate);
      } else if (dragState.type === "resize-left" && onEventResize) {
        const newStart = startOfDay(currentDate).toISOString();
        const newEnd = toDate.toISOString();
        if (new Date(newStart) < toDate) {
          onEventResize(dragState.event, newStart, newEnd);
        }
      } else if (dragState.type === "resize-right" && onEventResize) {
        const newStart = fromDate.toISOString();
        const newEnd = startOfDay(currentDate).toISOString();
        if (fromDate < new Date(newEnd)) {
          onEventResize(dragState.event, newStart, newEnd);
        }
      }

      setDragState(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, onEventDrop, onEventResize, currentDate]);

  const handleEventDragStart = useCallback((event: CalendarEvent, e: React.MouseEvent) => {
    if (!onEventDrop) return;
    setDragState({ event, type: "move", startX: e.clientX, startY: e.clientY, currentHour: 0 });
  }, [onEventDrop]);

  if (events.length === 0) {
    return (
      <div className="rounded-xl border shadow-sm bg-card overflow-hidden">
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <div className="text-center">
            <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm font-medium">No events this day</p>
            <p className="text-xs mt-1">Click to create a new task.</p>
          </div>
        </div>
      </div>
    );
  }

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

      <div className="divide-y max-h-[500px] overflow-y-auto" ref={gridRef}>
        {HOURS.map((hour) => {
          const hourStart = new Date(currentDate);
          hourStart.setHours(hour, 0, 0, 0);
          const hourEnd = new Date(currentDate);
          hourEnd.setHours(hour + 1, 0, 0, 0);
          const hourlyEvents = timedEvents.filter((e) => {
            if (!e.startDate) return false;
            const es = parseISO(e.startDate);
            const ee = e.dueDate ? parseISO(e.dueDate) : es;
            return es < hourEnd && ee >= hourStart;
          });

          const isDropTarget = dragState && dragState.currentHour === hour;

          return (
            <div
              key={hour}
              className={cn(
                "flex min-h-[52px] hover:bg-muted/10 transition-colors cursor-pointer",
                isDropTarget && "bg-primary/10",
              )}
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
                    onMouseDown={(e, ev) => handleEventDragStart(ev, e)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {dragState && (
        <div
          className="fixed z-50 border-2 border-dashed border-primary/40 bg-primary/10 rounded-md pointer-events-none"
          style={{
            left: (gridRef.current?.offsetLeft || 0) + 64,
            top: (gridRef.current?.offsetTop || 0) + dragState.currentHour * 52,
            width: (gridRef.current?.offsetWidth || 0) - 64,
            height: 48,
          }}
        />
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
