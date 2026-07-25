"use client";

export type CalendarViewType = "month" | "week" | "day" | "agenda";

export interface CalendarEvent {
  id: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  isMultiDay: boolean;
  isAllDay: boolean;
  isOverdue: boolean;
  isDueToday: boolean;
  isCompleted: boolean;
  color: string;
  priority: string;
  status: string;
  assigneeIds: string[];
  project?: { id: string; name: string; color?: string } | null;
  tags?: string[];
  progress: number;
  isMilestone: boolean;
  originalTask: any;
}

export type CalendarGroupByKey = "project" | "assignee" | "none";

export const CALENDAR_VIEW_OPTIONS: { value: CalendarViewType; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
  { value: "agenda", label: "Agenda" },
];

export const CALENDAR_GROUP_OPTIONS: { value: CalendarGroupByKey | "none"; label: string }[] = [
  { value: "none", label: "No Grouping" },
  { value: "project", label: "Project" },
  { value: "assignee", label: "Assignee" },
];

export const CALENDAR_COLORS = [
  "#4f46e5",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];