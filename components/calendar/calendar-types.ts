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

export interface EventPlacement {
  event: CalendarEvent;
  columnStart: number;
  columnSpan: number;
  laneIndex: number;
  continuesFromPrev: boolean;
  continuesToNext: boolean;
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
  "#4f46e5", "#f59e0b", "#10b981", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16",
];

export const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  critical: { color: "#dc2626", label: "Critical" },
  high: { color: "#ea580c", label: "High" },
  medium: { color: "#ca8a04", label: "Medium" },
  low: { color: "#2563eb", label: "Low" },
  none: { color: "#9ca3af", label: "None" },
};
