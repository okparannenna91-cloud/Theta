import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfQuarter, endOfQuarter, addDays, addWeeks, addMonths, addQuarters,
  eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, eachQuarterOfInterval,
  differenceInDays, isToday, isWeekend, format, parseISO
} from "date-fns";
import type { ZoomLevel } from "@/components/shared/timeline/types";

export const ROW_HEIGHT = 52;
export const LANE_HEADER_HEIGHT = 40;
export const HEADER_HEIGHT = 48;
export const HEADER_SUB_HEIGHT = 24;
export const SIDEBAR_WIDTH = 280;
export const MINI_AVATAR_SIZE = 18;

export interface TimeUnit {
  date: Date;
  isWeekend: boolean;
  label: string;
  sublabel?: string;
}

export interface HeaderRow {
  label: string;
  width: number;
  sublabel?: string;
}

export function computeDateRange(zoomLevel: ZoomLevel, centerDate?: Date): { start: Date; end: Date } {
  const now = centerDate || new Date();
  switch (zoomLevel) {
    case "day":
      return { start: startOfMonth(addDays(now, -30)), end: endOfMonth(addDays(now, 60)) };
    case "week":
      return { start: startOfWeek(addDays(now, -30), { weekStartsOn: 1 }), end: endOfWeek(addDays(now, 120), { weekStartsOn: 1 }) };
    case "month":
      return { start: startOfMonth(addDays(now, -60)), end: endOfMonth(addDays(now, 365)) };
    case "quarter":
      return { start: startOfQuarter(addDays(now, -90)), end: endOfQuarter(addDays(now, 540)) };
    default:
      return { start: startOfMonth(addDays(now, -30)), end: endOfMonth(addDays(now, 180)) };
  }
}

export const CELL_WIDTHS: Record<ZoomLevel, number> = {
  hour: 60,
  day: 100,
  week: 140,
  month: 180,
  quarter: 220,
  year: 280,
};

export function computeTimeUnits(zoomLevel: ZoomLevel, start: Date, end: Date): { units: TimeUnit[]; headers: HeaderRow[][] } {
  let units: TimeUnit[];
  const headers: HeaderRow[][] = [];
  const cellWidth = CELL_WIDTHS[zoomLevel];

  switch (zoomLevel) {
    case "day": {
      const days = eachDayOfInterval({ start, end });
      units = days.map(d => ({ date: d, isWeekend: isWeekend(d), label: format(d, "d"), sublabel: format(d, "EEE") }));
      const months = eachMonthOfInterval({ start, end });
      headers.push(months.map(m => ({
        label: format(m, "MMMM yyyy"),
        width: days.filter(d => d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear()).length * cellWidth,
      })));
      headers.push(units.map(u => ({ label: u.label, sublabel: u.sublabel, width: cellWidth })));
      break;
    }
    case "week": {
      const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
      units = weeks.map(w => ({ date: w, isWeekend: false, label: `W${format(w, "w")}`, sublabel: format(w, "MMM d") }));
      const months = eachMonthOfInterval({ start, end });
      headers.push(months.map(m => ({
        label: format(m, "MMMM yyyy"),
        width: weeks.filter(w => w.getMonth() === m.getMonth() && w.getFullYear() === m.getFullYear()).length * cellWidth,
      })));
      headers.push(units.map(u => ({ label: u.label, sublabel: u.sublabel, width: cellWidth })));
      break;
    }
    case "month": {
      const months = eachMonthOfInterval({ start, end });
      units = months.map(m => ({ date: m, isWeekend: false, label: format(m, "MMM"), sublabel: format(m, "yyyy") }));
      const quarters = eachQuarterOfInterval({ start, end });
      headers.push(quarters.map(q => ({
        label: `Q${Math.ceil((q.getMonth() + 1) / 3)} ${format(q, "yyyy")}`,
        width: months.filter(m => m.getFullYear() === q.getFullYear() && Math.floor(m.getMonth() / 3) === Math.floor(q.getMonth() / 3)).length * cellWidth,
      })));
      headers.push(units.map(u => ({ label: u.label, sublabel: u.sublabel, width: cellWidth })));
      break;
    }
    case "quarter": {
      const quarters = eachQuarterOfInterval({ start, end });
      units = quarters.map(q => ({ date: q, isWeekend: false, label: `Q${Math.ceil((q.getMonth() + 1) / 3)}`, sublabel: format(q, "yyyy") }));
      headers.push(quarters.map(q => ({
        label: format(q, "yyyy"),
        width: quarters.filter(innerQ => innerQ.getFullYear() === q.getFullYear()).length * cellWidth,
      })));
      headers.push(units.map(u => ({ label: u.label, sublabel: u.sublabel, width: cellWidth })));
      break;
    }
    default: {
      const days = eachDayOfInterval({ start, end });
      units = days.map(d => ({ date: d, isWeekend: isWeekend(d), label: format(d, "d"), sublabel: format(d, "EEE") }));
      const months = eachMonthOfInterval({ start, end });
      headers.push(months.map(m => ({
        label: format(m, "MMMM yyyy"),
        width: days.filter(d => d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear()).length * cellWidth,
      })));
      headers.push(units.map(u => ({ label: u.label, sublabel: u.sublabel, width: cellWidth })));
    }
  }

  return { units, headers };
}

export function getTaskLeft(task: any, timelineStart: Date, cellWidth: number): number {
  const start = task.startDate ? parseISO(task.startDate) : (task.dueDate ? parseISO(task.dueDate) : new Date());
  const days = differenceInDays(startOfDay(start), startOfDay(timelineStart));
  return Math.max(0, days * cellWidth);
}

export function getTaskWidth(task: any, cellWidth: number): number {
  if (task.isMilestone) return 24;
  const start = task.startDate ? parseISO(task.startDate) : (task.dueDate ? parseISO(task.dueDate) : new Date());
  const end = task.dueDate ? parseISO(task.dueDate) : start;
  const duration = Math.max(1, differenceInDays(startOfDay(end), startOfDay(start)) + 1);
  return duration * cellWidth;
}

export function getTaskDuration(task: any): number {
  const start = task.startDate ? parseISO(task.startDate) : (task.dueDate ? parseISO(task.dueDate) : new Date());
  const end = task.dueDate ? parseISO(task.dueDate) : start;
  return Math.max(1, differenceInDays(startOfDay(end), startOfDay(start)) + 1);
}

export function getDateFromX(x: number, timelineStart: Date, cellWidth: number): Date {
  const daysOffset = Math.round(x / cellWidth);
  return addDays(startOfDay(timelineStart), daysOffset);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    todo: "#64748b",
    in_progress: "#3b82f6",
    done: "#22c55e",
    cancelled: "#ef4444",
    backlog: "#a855f7",
    review: "#f59e0b",
  };
  return colors[status] || "#64748b";
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    urgent: "#ef4444",
    high: "#f97316",
    medium: "#eab308",
    low: "#22c55e",
    none: "#64748b",
  };
  return colors[priority] || "#64748b";
}

export const PRIORITY_OPTIONS = [
  { value: "urgent", label: "Urgent", color: "#ef4444" },
  { value: "high", label: "High", color: "#f97316" },
  { value: "medium", label: "Medium", color: "#eab308" },
  { value: "low", label: "Low", color: "#22c55e" },
];

export const STATUS_OPTIONS = [
  { value: "todo", label: "To Do", color: "#64748b" },
  { value: "in_progress", label: "In Progress", color: "#3b82f6" },
  { value: "done", label: "Done", color: "#22c55e" },
  { value: "cancelled", label: "Cancelled", color: "#ef4444" },
  { value: "backlog", label: "Backlog", color: "#a855f7" },
  { value: "review", label: "Review", color: "#f59e0b" },
];

export type GroupByKey = "project" | "assignee" | "status" | "priority";

export const GROUP_BY_OPTIONS: { value: GroupByKey | "none"; label: string }[] = [
  { value: "none", label: "No Grouping" },
  { value: "project", label: "Project" },
  { value: "assignee", label: "Assignee" },
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
];

export function groupTasks(tasks: any[], groupBy: GroupByKey | "none"): { key: string; label: string; tasks: any[] }[] {
  if (groupBy === "none") return [{ key: "all", label: "All Tasks", tasks }];

  const groups = new Map<string, any[]>();

  for (const task of tasks) {
    let keys: string[] = [];

    switch (groupBy) {
      case "project":
        keys = [task.project?.id || "no-project"];
        break;
      case "assignee": {
        if (task.assigneeIds && task.assigneeIds.length > 0) {
          keys = task.assigneeIds.map((id: string) => `assignee:${id}`);
        } else {
          keys = ["unassigned"];
        }
        break;
      }
      case "status": {
        const statusLabel = STATUS_OPTIONS.find(s => s.value === task.status)?.label || task.status || "unknown";
        keys = [`status:${task.status || "unknown"}`];
        break;
      }
      case "priority": {
        const priorityLabel = PRIORITY_OPTIONS.find(p => p.value === task.priority)?.label || task.priority || "none";
        keys = [`priority:${task.priority || "none"}`];
        break;
      }
    }

    for (const key of keys) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(task);
    }
  }

  function getGroupLabel(key: string): string {
    if (groupBy === "project") {
      const task = groups.get(key)?.[0];
      return task?.project?.name || "No Project";
    }
    if (groupBy === "assignee") {
      if (key === "unassigned") return "Unassigned";
      const task = groups.get(key)?.[0];
      const memberName = task?.assigneeNames?.[key.replace("assignee:", "")];
      if (memberName) return memberName;
      const taskWithUser = groups.get(key)?.find((t: any) => t.user?.id === key.replace("assignee:", ""));
      if (taskWithUser?.user?.name) return taskWithUser.user.name;
      const idx = Array.from(groups.keys()).indexOf(key);
      return `Assignee ${idx + 1}`;
    }
    if (groupBy === "status") {
      const status = key.replace("status:", "");
      return STATUS_OPTIONS.find(s => s.value === status)?.label || status.replace(/_/g, " ") || "Unknown";
    }
    if (groupBy === "priority") {
      const priority = key.replace("priority:", "");
      return PRIORITY_OPTIONS.find(p => p.value === priority)?.label || priority || "None";
    }
    return key;
  }

  return Array.from(groups.entries()).map(([key, tasks]) => ({ key, label: getGroupLabel(key), tasks }));
}