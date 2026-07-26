"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { isSameMonth, isToday, format, parseISO, differenceInDays, addDays, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { getWeeksForMonth, placeEventsInWeek } from "./calendar-utils";
import { DAY_HEADERS } from "./calendar-utils";
import type { CalendarEvent } from "./calendar-types";
import { TaskBar } from "./calendar-task-bar";

interface CalendarMonthViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onDayClick?: (day: Date) => void;
  onEventDrop?: (event: CalendarEvent, dropDay: Date) => void;
  onEventResize?: (event: CalendarEvent, newStart: string, newEnd: string) => void;
}

const MAX_VISIBLE_LANES = 5;

export function MonthView({ events, currentDate, onDayClick, onEventDrop, onEventResize }: CalendarMonthViewProps) {
  const weeks = useMemo(() => getWeeksForMonth(currentDate), [currentDate]);
  const gridRef = useRef<HTMLDivElement>(null);

  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const [dragState, setDragState] = useState<{
    event: CalendarEvent;
    type: "move" | "resize-left" | "resize-right";
    startX: number;
    startY: number;
    weekStart: Date;
  } | null>(null);

  const weekPlacements = useMemo(() => {
    return weeks.map((week) => placeEventsInWeek(events, week));
  }, [events, weeks]);

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!gridRef.current || !dragState) return;

      const rect = gridRef.current.getBoundingClientRect();
      const colWidth = rect.width / 7;
      const relX = e.clientX - rect.left;
      const colIndex = Math.max(0, Math.min(6, Math.floor(relX / colWidth)));

      const fromDate = dragState.event.startDate ? parseISO(dragState.event.startDate) : new Date();
      const toDate = dragState.event.dueDate ? parseISO(dragState.event.dueDate) : fromDate;
      const duration = differenceInDays(toDate, fromDate);
      const dropDay = addDays(dragState.weekStart, colIndex);

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
  }, [dragState, onEventDrop, onEventResize]);

  const toggleExpanded = (weekIdx: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekIdx)) next.delete(weekIdx);
      else next.add(weekIdx);
      return next;
    });
  };

  const getWeekStartForEvent = useCallback((event: CalendarEvent): Date => {
    const eventStart = event.startDate ? parseISO(event.startDate) : new Date();
    const weekStart = weeks.find(w => {
      const wStart = startOfDay(w[0]);
      const wEnd = startOfDay(w[w.length - 1]);
      return eventStart >= wStart && eventStart <= wEnd;
    });
    return weekStart ? weekStart[0] : weeks[0]?.[0] || new Date();
  }, [weeks]);

  const handleDragStart = useCallback((event: CalendarEvent, _e: React.MouseEvent) => {
    if (!onEventDrop) return;
    setDragState({ event, type: "move", startX: _e.clientX, startY: _e.clientY, weekStart: getWeekStartForEvent(event) });
  }, [onEventDrop, getWeekStartForEvent]);

  const handleResizeStart = useCallback((event: CalendarEvent, edge: "left" | "right", _e: React.MouseEvent) => {
    if (!onEventResize) return;
    setDragState({
      event,
      type: edge === "left" ? "resize-left" : "resize-right",
      startX: _e.clientX,
      startY: _e.clientY,
      weekStart: getWeekStartForEvent(event),
    });
  }, [onEventResize, getWeekStartForEvent]);

  return (
    <div className="flex flex-col rounded-xl border shadow-sm overflow-hidden bg-card">
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {DAY_HEADERS.map((header) => (
          <div key={header} className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">
            {header}
          </div>
        ))}
      </div>

      <div ref={gridRef} className="flex-1">
        {weeks.map((weekDays, weekIdx) => {
          const placements = weekPlacements[weekIdx];
          const maxLane = placements.reduce((max, p) => Math.max(max, p.laneIndex + 1), 0);
          const visibleLanes = expandedWeeks.has(weekIdx) ? maxLane : Math.min(maxLane, MAX_VISIBLE_LANES);
          const hiddenCount = maxLane - visibleLanes;

          return (
            <div key={weekIdx} className="border-b last:border-b-0">
              <div
                className="relative"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gridTemplateRows: `auto repeat(${visibleLanes + 1}, 22px)`,
                }}
                onMouseDown={(e) => {
                  if (e.button === 0 && dragState) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const colWidth = rect.width / 7;
                    const colIndex = Math.max(0, Math.min(6, Math.floor((e.clientX - rect.left) / colWidth)));
                    const dropDay = addDays(weekDays[0], colIndex);
                    setDragState(prev => prev ? { ...prev, weekStart: weekDays[0] } : null);
                  }
                }}
              >
                {weekDays.map((day, dayIdx) => (
                  <div
                    key={dayIdx}
                    className={cn(
                      "relative px-1.5 pt-1.5 pb-0.5 cursor-pointer transition-colors",
                      !isSameMonth(day, currentDate) && "bg-muted/20",
                      isToday(day) && "bg-primary/[0.03]",
                      dragState && "select-none",
                    )}
                    style={{ gridRow: 1, gridColumn: dayIdx + 1 }}
                    onClick={() => {
                      if (!dragState) onDayClick?.(day);
                    }}
                  >
                    <span
                      className={cn(
                        "inline-flex items-center justify-center w-6 h-6 text-xs rounded-full",
                        isToday(day) && "bg-primary text-primary-foreground font-semibold",
                        !isSameMonth(day, currentDate) && "text-muted-foreground/40",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                  </div>
                ))}

                {placements
                  .filter((p) => p.laneIndex < visibleLanes)
                  .map((placement) => (
                    <TaskBar
                      key={placement.event.id + "-" + weekIdx}
                      placement={placement}
                      weekDays={weekDays}
                      maxLanes={visibleLanes}
                      onDragStart={handleDragStart}
                      onResizeStart={handleResizeStart}
                    />
                  ))}

                {hiddenCount > 0 && (
                  <button
                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 text-left"
                    style={{ gridColumn: "1 / -1", gridRow: visibleLanes + 2 }}
                    onClick={() => toggleExpanded(weekIdx)}
                  >
                    +{hiddenCount} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
