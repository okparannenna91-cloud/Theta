"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { isToday, isWeekend, format, parseISO, isAfter, isBefore, startOfDay, addDays, differenceInDays, min as dateMin, max as dateMax } from "date-fns";
import { cn } from "@/lib/utils";
import { getWeekDays, getEventsForDay, placeEventsInWeek } from "./calendar-utils";
import { CalendarEventBar, CalendarEventHoverCard } from "./calendar-event";
import type { CalendarEvent } from "./calendar-types";
import { TaskBar } from "./calendar-task-bar";
import { CalendarDays } from "lucide-react";

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDayClick: (day: Date) => void;
  onEventDrop?: (event: CalendarEvent, dropDay: Date) => void;
  onEventResize?: (event: CalendarEvent, newStart: string, newEnd: string) => void;
  onLogActivity: (action: string, taskId: string, metadata?: any) => void;
  showWeekends: boolean;
  onCreateTask?: (startDate: string, endDate: string) => void;
}

export function WeekView({
  events,
  currentDate,
  onDayClick,
  onEventDrop,
  onEventResize,
  onCreateTask,
}: WeekViewProps) {
  const [hoveredEvent, setHoveredEvent] = useState<{ event: CalendarEvent; rect: DOMRect } | null>(null);
  const [dragState, setDragState] = useState<{
    event: CalendarEvent;
    type: "move" | "resize-left" | "resize-right";
    startX: number;
    startY: number;
    currentCol: number;
    currentHour: number;
  } | null>(null);
  const [dragCreate, setDragCreate] = useState<{
    startCol: number;
    startHour: number;
    currentCol: number;
    currentHour: number;
  } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      if (!gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();
      const colWidth = rect.width / 7;
      const colIndex = Math.max(0, Math.min(6, Math.floor((e.clientX - rect.left) / colWidth)));
      const scrollTop = gridRef.current?.scrollTop || 0;
      const hourHeight = 44;
      const relY = e.clientY - rect.top + scrollTop - 30;
      const hourIndex = Math.max(0, Math.min(23, Math.floor(relY / hourHeight)));
      setDragState(prev => prev ? { ...prev, currentCol: colIndex, currentHour: hourIndex } : null);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!gridRef.current || !dragState) return;

      const rect = gridRef.current.getBoundingClientRect();
      const colWidth = rect.width / 7;
      const relX = e.clientX - rect.left;
      const colIndex = Math.max(0, Math.min(6, Math.floor(relX / colWidth)));

      const dropDay = addDays(days[0], colIndex);
      const fromDate = dragState.event.startDate ? parseISO(dragState.event.startDate) : new Date();
      const toDate = dragState.event.dueDate ? parseISO(dragState.event.dueDate) : fromDate;
      const duration = differenceInDays(toDate, fromDate);

      if (dragState.type === "move") {
        onEventDrop?.(dragState.event, dropDay);
      } else if (dragState.type === "resize-left" && onEventResize) {
        const newStart = startOfDay(dropDay).toISOString();
        const newEnd = toDate.toISOString();
        if (new Date(newStart) < toDate) {
          onEventResize(dragState.event, newStart, newEnd);
        }
      } else if (dragState.type === "resize-right" && onEventResize) {
        const newStart = fromDate.toISOString();
        const newEnd = startOfDay(dropDay).toISOString();
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
  }, [dragState, onEventDrop, onEventResize, days]);

  // Drag-to-create
  useEffect(() => {
    if (!dragCreate) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!gridRef.current || !dragCreate) return;
      const rect = gridRef.current.getBoundingClientRect();
      const colWidth = rect.width / 7;
      const colIndex = Math.max(0, Math.min(6, Math.floor((e.clientX - rect.left) / colWidth)));
      const scrollTop = gridRef.current?.scrollTop || 0;
      const hourHeight = 44;
      const relY = e.clientY - rect.top + scrollTop - 30;
      const hourIndex = Math.max(0, Math.min(23, Math.floor(relY / hourHeight)));
      setDragCreate(prev => prev ? { ...prev, currentCol: colIndex, currentHour: hourIndex } : null);
    };

    const handleMouseUp = () => {
      if (!dragCreate || !onCreateTask) return;
      const startCol = Math.min(dragCreate.startCol, dragCreate.currentCol);
      const endCol = Math.max(dragCreate.startCol, dragCreate.currentCol);
      const startDay = addDays(days[0], startCol);
      const endDay = addDays(days[0], endCol);
      onCreateTask(startOfDay(startDay).toISOString(), startOfDay(endDay).toISOString());
      setDragCreate(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragCreate, onCreateTask, days]);

  const handleEventDragStart = useCallback((event: CalendarEvent, e: React.MouseEvent) => {
    if (!onEventDrop) return;
    setDragState({ event, type: "move", startX: e.clientX, startY: e.clientY, currentCol: 0, currentHour: 0 });
  }, [onEventDrop]);

  const handleEventResizeStart = useCallback((event: CalendarEvent, edge: "left" | "right", e: React.MouseEvent) => {
    if (!onEventResize) return;
    setDragState({
      event,
      type: edge === "left" ? "resize-left" : "resize-right",
      startX: e.clientX,
      startY: e.clientY,
      currentCol: 0,
      currentHour: 0,
    });
  }, [onEventResize]);

  if (events.length === 0) {
    return (
      <div className="rounded-xl border shadow-sm bg-card overflow-hidden">
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <div className="text-center">
            <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm font-medium">No events this week</p>
            <p className="text-xs mt-1">Click a day to create a new task.</p>
          </div>
        </div>
      </div>
    );
  }

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

      <div className="overflow-y-auto max-h-[600px]" ref={gridRef}>
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
                  const es = parseISO(e.startDate);
                  const ee = e.dueDate ? parseISO(e.dueDate) : es;
                  return es < hourEnd && ee >= hourStart;
                });

                const isDropTarget = dragState && dragState.currentCol === i && dragState.currentHour === hour;
                const isDragCreateTarget = dragCreate &&
                  i >= Math.min(dragCreate.startCol, dragCreate.currentCol) &&
                  i <= Math.max(dragCreate.startCol, dragCreate.currentCol) &&
                  hour >= Math.min(dragCreate.startHour, dragCreate.currentHour) &&
                  hour <= Math.max(dragCreate.startHour, dragCreate.currentHour);

                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className={cn(
                      "border-b border-r min-h-[44px] relative transition-colors hover:bg-muted/10",
                      isWeekend(day) && "bg-muted/5",
                      isToday(day) && hour === new Date().getHours() && "bg-primary/[0.03]",
                      isDropTarget && "bg-primary/10",
                      isDragCreateTarget && "bg-primary/15",
                    )}
                    onClick={() => onDayClick(day)}
                    onMouseDown={(e) => {
                      if (e.button !== 0 || dragState || !onCreateTask) return;
                      const target = e.target as HTMLElement;
                      if (target.closest("[data-event-bar]")) return;
                      if (cellEvents.length > 0) return;
                      e.preventDefault();
                      setDragCreate({ startCol: i, startHour: hour, currentCol: i, currentHour: hour });
                    }}
                  >
                    <div className="absolute inset-x-0.5 top-0.5 space-y-0.5">
                      {cellEvents.map((event) => (
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
          ))}
        </div>
      </div>

      {dragState && (
        <div
          className="fixed z-50 border-2 border-dashed border-primary/40 bg-primary/10 rounded-md pointer-events-none"
          style={{
            left: (dragState.currentCol * (gridRef.current?.offsetWidth || 0)) / 7 + (gridRef.current?.offsetLeft || 0),
            top: (gridRef.current?.offsetTop || 0) + dragState.currentHour * 44 + 30,
            width: (gridRef.current?.offsetWidth || 0) / 7 - 4,
            height: 40,
          }}
        />
      )}

      {dragCreate && (
        <div
          className="absolute z-40 border-2 border-dashed border-primary/50 bg-primary/10 rounded-md pointer-events-none flex items-center justify-center"
          style={{
            left: (Math.min(dragCreate.startCol, dragCreate.currentCol) * ((gridRef.current?.offsetWidth || 0) / 7)) + 2,
            top: Math.min(dragCreate.startHour, dragCreate.currentHour) * 44 + 30,
            width: (Math.abs(dragCreate.currentCol - dragCreate.startCol) + 1) * ((gridRef.current?.offsetWidth || 0) / 7) - 4,
            height: (Math.abs(dragCreate.currentHour - dragCreate.startHour) + 1) * 44,
          }}
        >
          <span className="text-[9px] font-semibold text-primary">
            {format(addDays(days[0], Math.min(dragCreate.startCol, dragCreate.currentCol)), "MMM d")}
            {(Math.abs(dragCreate.currentCol - dragCreate.startCol) > 0 || Math.abs(dragCreate.currentHour - dragCreate.startHour) > 0) &&
              ` → ${format(addDays(days[0], Math.max(dragCreate.startCol, dragCreate.currentCol)), "MMM d")}`
            }
          </span>
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
