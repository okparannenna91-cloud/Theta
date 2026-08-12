import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay,
  addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
  eachDayOfInterval, eachWeekOfInterval,
  differenceInDays, differenceInCalendarDays,
  isSameDay, isSameMonth, isToday, isWeekend, isBefore, isAfter,
  format, parseISO, max, min,
} from "date-fns";
import { getStatusColor, getPriorityColor } from "@/components/timeline/timeline-utils";
import type { CalendarEvent, CalendarViewType, EventPlacement } from "./calendar-types";
import { isDoneStatus } from "@/lib/constants/status";

export const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_HEADERS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

export function computeCalendarRange(currentDate: Date, viewType: CalendarViewType): { start: Date; end: Date } {
  switch (viewType) {
    case "month": {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(monthStart);
      return { start: startOfWeek(monthStart), end: endOfWeek(monthEnd) };
    }
    case "week": {
      return { start: startOfWeek(currentDate, { weekStartsOn: 0 }), end: endOfWeek(currentDate, { weekStartsOn: 0 }) };
    }
    case "day": {
      return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
    }
    case "agenda": {
      return { start: startOfDay(new Date()), end: endOfDay(addDays(new Date(), 30)) };
    }
    default:
      return { start: startOfWeek(currentDate), end: endOfWeek(currentDate) };
  }
}

export function getCalendarDays(currentDate: Date, viewType: CalendarViewType): Date[] {
  const { start, end } = computeCalendarRange(currentDate, viewType);
  return eachDayOfInterval({ start, end });
}

export function getWeekDays(currentDate: Date): Date[] {
  const start = startOfWeek(currentDate, { weekStartsOn: 0 });
  const end = endOfWeek(currentDate, { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end });
}

export function getWeeksForMonth(currentDate: Date): Date[][] {
  const { start, end } = computeCalendarRange(currentDate, "month");
  const days = eachDayOfInterval({ start, end });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

export function navigateCalendar(currentDate: Date, viewType: CalendarViewType, direction: -1 | 1): Date {
  switch (viewType) {
    case "month": return addMonths(currentDate, direction);
    case "week": return addWeeks(currentDate, direction);
    case "day": return addDays(currentDate, direction);
    case "agenda": return addMonths(currentDate, direction);
    default: return addMonths(currentDate, direction);
  }
}

export function getViewTitle(currentDate: Date, viewType: CalendarViewType): string {
  switch (viewType) {
    case "month": return format(currentDate, "MMMM yyyy");
    case "week": {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      if (start.getMonth() === end.getMonth()) {
        return `${format(start, "MMM d")} - ${format(end, "d, yyyy")}`;
      }
      return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
    }
    case "day": return format(currentDate, "EEEE, MMMM d, yyyy");
    case "agenda": return "Upcoming Tasks";
    default: return format(currentDate, "MMMM yyyy");
  }
}

export function taskToCalendarEvent(task: any): CalendarEvent | null {
  const start = task.startDate ? parseISO(task.startDate) : null;
  const end = task.dueDate ? parseISO(task.dueDate) : null;

  if (!start && !end) return null;

  const effectiveStart = start || end!;
  const effectiveEnd = end || start || effectiveStart;

  const now = new Date();
  const isMultiDay = !isSameDay(effectiveStart, effectiveEnd);
  const isOverdue = isBefore(effectiveEnd, now) && !isDoneStatus(task.status, task.customStatus?.category) && task.status !== "cancelled";
  const isDueToday = isToday(effectiveEnd);

  const color = task.color || getStatusColor(task.status, task.customStatus?.category);
  const isCompleted = isDoneStatus(task.status, task.customStatus?.category);

  return {
    id: task.id,
    title: task.title || "Untitled",
    startDate: task.startDate || task.dueDate,
    dueDate: task.dueDate || task.startDate,
    isMultiDay,
    isAllDay: !task.startDate || isMultiDay,
    isOverdue,
    isDueToday,
    isCompleted,
    color,
    priority: task.priority || "none",
    status: task.status || "todo",
    assigneeIds: task.assigneeIds || [],
    project: task.project || null,
    tags: task.tags || [],
    progress: task.progress || 0,
    isMilestone: task.isMilestone || false,
    originalTask: task,
  };
}

export function tasksToCalendarEvents(tasks: any[]): CalendarEvent[] {
  return tasks
    .map(taskToCalendarEvent)
    .filter((e): e is CalendarEvent => e !== null)
    .sort((a, b) => {
      const aStart = a.startDate ? parseISO(a.startDate).getTime() : 0;
      const bStart = b.startDate ? parseISO(b.startDate).getTime() : 0;
      return aStart - bStart;
    });
}

export function getEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter((event) => {
    const start = event.startDate ? parseISO(event.startDate) : null;
    const end = event.dueDate ? parseISO(event.dueDate) : null;
    if (!start && !end) return false;
    const s = start || end!;
    const e = end || start!;
    const dayStart = startOfDay(day);
    return !isAfter(dayStart, e) && !isBefore(endOfDay(day), s);
  });
}

export function getDateRangeFromDrop(dropDay: Date, draggedEvent: CalendarEvent): { startDate?: string; dueDate?: string } {
  const oldStart = draggedEvent.startDate ? parseISO(draggedEvent.startDate) : new Date();
  const oldEnd = draggedEvent.dueDate ? parseISO(draggedEvent.dueDate) : oldStart;
  const duration = differenceInDays(oldEnd, oldStart);

  const newStart = new Date(dropDay);
  newStart.setHours(oldStart.getHours(), oldStart.getMinutes());

  const newEnd = new Date(newStart);
  newEnd.setDate(newEnd.getDate() + duration);

  return {
    startDate: newStart.toISOString(),
    dueDate: newEnd.toISOString(),
  };
}

export function getTaskColor(task: any): string {
  return task.color || getStatusColor(task.status, task.customStatus?.category);
}

export { getStatusColor, getPriorityColor };

export function eventOverlapsWeek(event: CalendarEvent, weekStart: Date, weekEnd: Date): boolean {
  const eStart = event.startDate ? parseISO(event.startDate) : null;
  const eEnd = event.dueDate ? parseISO(event.dueDate) : null;
  if (!eStart && !eEnd) return false;
  const s = eStart || eEnd!;
  const e = eEnd || s;
  return !isBefore(e, weekStart) && !isAfter(s, weekEnd);
}

export function placeEventsInWeek(events: CalendarEvent[], weekDays: Date[]): EventPlacement[] {
  const weekStart = weekDays[0];
  const weekEnd = endOfDay(weekDays[weekDays.length - 1]);

  const overlapping = events.filter(e => eventOverlapsWeek(e, weekStart, weekEnd));
  const sorted = [...overlapping].sort((a, b) => {
    const aStart = a.startDate ? parseISO(a.startDate).getTime() : 0;
    const bStart = b.startDate ? parseISO(b.startDate).getTime() : 0;
    return aStart - bStart;
  });

  const lanes: { end: Date }[] = [];
  const placements: EventPlacement[] = [];

  for (const event of sorted) {
    const eStart = event.startDate ? parseISO(event.startDate) : weekStart;
    const eEnd = event.dueDate ? parseISO(event.dueDate) : weekStart;

    const effectiveStart = max([eStart, weekStart]);
    const effectiveEnd = min([eEnd, weekEnd]);

    const colStart = effectiveStart.getDay() + 1;
    const colEnd = effectiveEnd.getDay() + 1;
    const span = colEnd - colStart + 1;

    let lane = 0;
    for (let i = 0; i < lanes.length; i++) {
      if (isAfter(lanes[i].end, effectiveStart)) {
        lane = i + 1;
      }
    }
    while (lane >= lanes.length) {
      lanes.push({ end: weekStart });
    }
    lanes[lane] = { end: effectiveEnd };

    placements.push({
      event,
      columnStart: colStart,
      columnSpan: span,
      laneIndex: lane,
      continuesFromPrev: isBefore(eStart, weekStart),
      continuesToNext: isAfter(eEnd, weekEnd),
    });
  }

  return placements;
}