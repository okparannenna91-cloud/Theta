"use client";

import { useState, useMemo } from "react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth, isToday,
  format, addMonths, subMonths
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DAY_HEADERS_SHORT } from "./calendar-utils";

interface MiniCalendarProps {
  currentDate: Date;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  taskDates?: Set<string>;
}

export function MiniCalendar({ currentDate, selectedDate, onDateSelect, taskDates }: MiniCalendarProps) {
  const [viewDate, setViewDate] = useState(startOfMonth(currentDate));

  const days = useMemo(() => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    const start = startOfWeek(monthStart);
    const end = endOfWeek(monthEnd);
    return eachDayOfInterval({ start, end });
  }, [viewDate]);

  return (
    <div className="w-full rounded-xl border bg-card shadow-sm p-3">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setViewDate(subMonths(viewDate, 1))}
          className="p-1 rounded-md hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs font-semibold">{format(viewDate, "MMMM yyyy")}</span>
        <button
          onClick={() => setViewDate(addMonths(viewDate, 1))}
          className="p-1 rounded-md hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS_SHORT.map((d) => (
          <div key={d} className="text-[10px] font-medium text-muted-foreground text-center h-6 flex items-center justify-center">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const hasTasks = taskDates?.has(format(day, "yyyy-MM-dd"));
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateSelect(day)}
              className={cn(
                "text-[11px] h-7 w-full rounded-md flex items-center justify-center transition-colors relative",
                !isSameMonth(day, viewDate) && "text-muted-foreground/30",
                isSameDay(day, selectedDate) && "bg-primary text-primary-foreground font-semibold",
                !isSameDay(day, selectedDate) && isToday(day) && "border border-primary text-primary font-semibold",
                !isSameDay(day, selectedDate) && !isToday(day) && isSameMonth(day, viewDate) && "hover:bg-muted",
              )}
            >
              {format(day, "d")}
              {hasTasks && !isSameDay(day, selectedDate) && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}