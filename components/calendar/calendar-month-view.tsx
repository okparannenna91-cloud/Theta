"use client";

import { useMemo, useState } from "react";
import { isSameMonth, isToday, format } from "date-fns";
import { cn } from "@/lib/utils";
import { getWeeksForMonth, placeEventsInWeek } from "./calendar-utils";
import { DAY_HEADERS } from "./calendar-utils";
import type { CalendarEvent } from "./calendar-types";
import { TaskBar } from "./calendar-task-bar";

interface CalendarMonthViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick?: (event: CalendarEvent) => void;
  onDayClick?: (day: Date) => void;
  onEventDrop?: (event: CalendarEvent, dropDay: Date) => void;
}

const MAX_VISIBLE_LANES = 5;

export function MonthView({ events, currentDate, onEventClick, onDayClick, onEventDrop }: CalendarMonthViewProps) {
  const weeks = useMemo(() => getWeeksForMonth(currentDate), [currentDate]);

  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());

  const weekPlacements = useMemo(() => {
    return weeks.map((week) => placeEventsInWeek(events, week));
  }, [events, weeks]);

  const toggleExpanded = (weekIdx: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekIdx)) next.delete(weekIdx);
      else next.add(weekIdx);
      return next;
    });
  };

  return (
    <div className="flex flex-col rounded-xl border shadow-sm overflow-hidden bg-card">
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {DAY_HEADERS.map((header) => (
          <div key={header} className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">
            {header}
          </div>
        ))}
      </div>

      <div className="flex-1">
        {weeks.map((weekDays, weekIdx) => {
          const placements = weekPlacements[weekIdx];
          const maxLane = placements.reduce((max, p) => Math.max(max, p.laneIndex + 1), 0);
          const visibleLanes = expandedWeeks.has(weekIdx) ? maxLane : Math.min(maxLane, MAX_VISIBLE_LANES);
          const hiddenCount = maxLane - visibleLanes;

          return (
            <div key={weekIdx} className="border-b last:border-b-0">
              <div
                className="grid grid-cols-7 relative"
                style={{ gridTemplateRows: `auto repeat(${visibleLanes + 1}, 22px)` }}
              >
                {weekDays.map((day, dayIdx) => (
                  <div
                    key={dayIdx}
                    className={cn(
                      "relative px-1.5 pt-1.5 pb-0.5 cursor-pointer transition-colors",
                      !isSameMonth(day, currentDate) && "bg-muted/20",
                      isToday(day) && "bg-primary/[0.03]",
                    )}
                    style={{ gridRow: 1, gridColumn: dayIdx + 1 }}
                    onClick={() => onDayClick?.(day)}
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
                      onEventClick={onEventClick}
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
