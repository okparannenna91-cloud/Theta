"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import { isSameDay, isSameMonth, isToday, isWeekend, format, startOfDay, addDays, differenceInCalendarDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { getCalendarDays, getEventsForDay, getDateRangeFromDrop } from "./calendar-utils";
import { CalendarEventBar, CalendarEventHoverCard } from "./calendar-event";
import type { CalendarEvent } from "./calendar-types";
import { Plus } from "lucide-react";

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDayClick: (day: Date) => void;
  onEventDrop: (event: CalendarEvent, dropDay: Date) => void;
  onCreateTask: (startDate: string, endDate: string) => void;
  onLogActivity: (action: string, taskId: string, metadata?: any) => void;
  showWeekends: boolean;
  maxEventsPerDay?: number;
}

export function MonthView({
  currentDate,
  events,
  onEventClick,
  onDayClick,
  onEventDrop,
  onCreateTask,
  onLogActivity,
  showWeekends,
  maxEventsPerDay = 4,
}: MonthViewProps) {
  const [hoveredEvent, setHoveredEvent] = useState<{ event: CalendarEvent; rect: DOMRect } | null>(null);
  const [dragState, setDragState] = useState<{ event: CalendarEvent; startDay: Date; currentDay: Date } | null>(null);
  const [createDrag, setCreateDrag] = useState<{ startDay: Date; currentDay: Date } | null>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  const calendarDays = useMemo(() => getCalendarDays(currentDate, "month"), [currentDate]);
  const monthStart = useMemo(() => startOfDay(currentDate), [currentDate]);
  const monthEnd = useMemo(() => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    return startOfDay(d);
  }, [currentDate]);

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  const handleDragStart = useCallback((event: CalendarEvent, day: Date) => {
    setDragState({ event, startDay: day, currentDay: day });
  }, []);

  const handleCreateDragStart = useCallback((day: Date) => {
    setCreateDrag({ startDay: day, currentDay: day });
  }, []);

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (createDrag) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el) {
        const dayCell = el.closest("[data-day]");
        if (dayCell) {
          const dayStr = dayCell.getAttribute("data-day");
          if (dayStr) {
            setCreateDrag((prev) => prev ? { ...prev, currentDay: new Date(dayStr) } : prev);
          }
        }
      }
    }
  }, [createDrag]);

  const handleGlobalMouseUp = useCallback(() => {
    if (createDrag) {
      const start = createDrag.startDay;
      const end = createDrag.currentDay;
      const startStr = start.toISOString();
      const endStr = (end > start ? end : start).toISOString();
      onCreateTask(startStr, endStr);
      onLogActivity("task_created_from_calendar", "new", { startDate: startStr, endDate: endStr });
      setCreateDrag(null);
    }
    if (dragState) {
      const dropDay = dragState.currentDay;
      const updates = getDateRangeFromDrop(dropDay, dragState.event);
      onEventDrop(dragState.event, dropDay);
      onLogActivity("task_rescheduled", dragState.event.id, { from: dragState.startDay.toISOString(), to: dropDay.toISOString() });
      setDragState(null);
    }
  }, [createDrag, dragState, onCreateTask, onLogActivity, onEventDrop]);

  return (
    <div
      ref={dragRef}
      className="border-subtle rounded-xl bg-card overflow-hidden shadow-sm"
      onMouseMove={(e) => {
        if (createDrag) {
          const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
          const dayCell = el?.closest("[data-day]");
          if (dayCell) {
            const dayStr = dayCell.getAttribute("data-day");
            if (dayStr) {
              setCreateDrag((prev) => prev ? { ...prev, currentDay: new Date(dayStr) } : prev);
            }
          }
        }
      }}
      onMouseUp={() => {
        if (createDrag) {
          const start = createDrag.startDay;
          const end = createDrag.currentDay;
          const startStr = start.toISOString();
          const endStr = (end > start ? end : start).toISOString();
          onCreateTask(startStr, endStr);
          onLogActivity("task_created_from_calendar", "new", { startDate: startStr, endDate: endStr });
          setCreateDrag(null);
        }
        if (dragState) {
          const dropDay = dragState.currentDay;
          onEventDrop(dragState.event, dropDay);
          onLogActivity("task_rescheduled", dragState.event.id, { from: dragState.startDay.toISOString(), to: dropDay.toISOString() });
          setDragState(null);
        }
      }}
      onMouseLeave={() => {
        setCreateDrag(null);
        setDragState(null);
      }}
    >
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
          <div
            key={day}
            className={cn(
              "py-2.5 text-center text-xs font-semibold text-muted-foreground",
              !showWeekends && (i === 0 || i === 6) && "hidden"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {weeks.map((week, weekIdx) => (
        <div key={weekIdx} className="grid grid-cols-7 border-b last:border-b-0">
          {week.map((day, dayIdx) => {
            const dayEvents = getEventsForDay(events, day);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isTodayDate = isToday(day);
            const isWeekendDay = isWeekend(day);
            const isDragOver = dragState && isSameDay(dragState.currentDay, day);
            const isCreateOver = createDrag && (
              isSameDay(createDrag.startDay, day) ||
              isSameDay(createDrag.currentDay, day) ||
              (day > createDrag.startDay && day < createDrag.currentDay) ||
              (day < createDrag.startDay && day > createDrag.currentDay)
            );

            if (!showWeekends && (dayIdx === 0 || dayIdx === 6)) return null;

            return (
              <div
                key={day.toISOString()}
                data-day={day.toISOString()}
                className={cn(
                  "min-h-[110px] p-1.5 border-r border-b last:border-r-0 relative cursor-pointer transition-colors",
                  !isCurrentMonth && "bg-muted/20",
                  isCurrentMonth && "hover:bg-muted/30",
                  isTodayDate && "bg-primary/[0.03]",
                  isDragOver && "bg-primary/10",
                  isCreateOver && "bg-primary/15",
                )}
                onClick={() => onDayClick(day)}
                onMouseDown={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest("[data-event]")) return;
                  handleCreateDragStart(day);
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      "text-xs font-medium h-6 w-6 flex items-center justify-center rounded-full",
                      isTodayDate && "bg-primary text-primary-foreground font-semibold shadow-sm",
                      !isTodayDate && isCurrentMonth && "text-foreground",
                      !isTodayDate && !isCurrentMonth && "text-muted-foreground/50",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {isTodayDate && (
                    <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="h-3 w-3 text-primary/30" />
                    </div>
                  )}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, maxEventsPerDay).map((event) => (
                    <div key={event.id} data-event="true">
                      <CalendarEventBar
                        event={event}
                        onClick={onEventClick}
                        onMouseEnter={(ev, rect) => setHoveredEvent({ event: ev, rect })}
                        onMouseLeave={() => setHoveredEvent(null)}
                        compact={dayEvents.length > maxEventsPerDay}
                      />
                    </div>
                  ))}
                  {dayEvents.length > maxEventsPerDay && (
                    <div className="text-[10px] font-medium text-muted-foreground pl-1.5">
                      +{dayEvents.length - maxEventsPerDay} more
                    </div>
                  )}
                  {dayEvents.length === 0 && createDrag && isCreateOver && (
                    <div className="h-6 rounded-md bg-primary/20 border border-primary/40 flex items-center justify-center">
                      <span className="text-[10px] text-primary font-medium">Create</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}

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