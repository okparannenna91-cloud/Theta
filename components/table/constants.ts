import type { Column } from "./types";

export const ROW_HEIGHT = 34;
export const GROUP_HEADER_HEIGHT = 28;
export const OVERSCAN = 10;
export const MAX_HISTORY = 50;
export const CELL_PADDING = "px-3 py-1";

export const STATUS_COLORS: Record<string, string> = {
  todo: "#94a3b8",
  "in_progress": "#3b82f6",
  "in-progress": "#3b82f6",
  review: "#8b5cf6",
  done: "#10b981",
  cancelled: "#ef4444",
  backlog: "#64748b",
};

export const STATUS_OPTIONS = [
  { value: "todo", label: "Todo", color: "#94a3b8" },
  { value: "in_progress", label: "In Progress", color: "#3b82f6" },
  { value: "review", label: "Review", color: "#8b5cf6" },
  { value: "done", label: "Done", color: "#10b981" },
  { value: "backlog", label: "Backlog", color: "#64748b" },
  { value: "cancelled", label: "Cancelled", color: "#ef4444" },
];

export const PRIORITY_VALUES = ["urgent", "high", "medium", "low", "none"] as const;

export const PRIORITY_META: Record<string, { label: string; text: string; dot: string }> = {
  urgent: { label: "Urgent", text: "text-red-600 dark:text-red-400", dot: "bg-red-500" },
  high: { label: "High", text: "text-orange-600 dark:text-orange-400", dot: "bg-orange-500" },
  medium: { label: "Medium", text: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  low: { label: "Low", text: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
  none: { label: "None", text: "text-slate-400 dark:text-slate-500", dot: "bg-slate-300 dark:bg-slate-600" },
};

export const DEFAULT_COLUMNS: Column[] = [
  { id: "__checkbox", name: "", type: "checkbox", width: 36, visible: true, pinned: true, order: -1 },
  { id: "title", name: "Task", type: "title", width: 320, visible: true, pinned: true, order: 0 },
  { id: "status", name: "Status", type: "status", width: 120, visible: true, pinned: false, order: 1 },
  { id: "priority", name: "Priority", type: "priority", width: 100, visible: true, pinned: false, order: 2 },
  { id: "assignee", name: "Assignee", type: "assignee", width: 130, visible: true, pinned: false, order: 3 },
  { id: "dueDate", name: "Due Date", type: "date", width: 120, visible: true, pinned: false, order: 4 },
  { id: "startDate", name: "Start Date", type: "date", width: 120, visible: false, pinned: false, order: 5 },
  { id: "progress", name: "Progress", type: "progress", width: 110, visible: true, pinned: false, order: 6 },
  { id: "project", name: "Project", type: "project", width: 120, visible: true, pinned: false, order: 7 },
  { id: "labels", name: "Labels", type: "labels", width: 140, visible: false, pinned: false, order: 8 },
  { id: "estimate", name: "Estimate", type: "number", width: 70, visible: false, pinned: false, order: 9 },
  { id: "createdBy", name: "Created By", type: "createdBy", width: 110, visible: false, pinned: false, order: 10 },
  { id: "updatedAt", name: "Updated", type: "updatedAt", width: 110, visible: false, pinned: false, order: 11 },
];

export const MEMBER_COLORS = [
  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
];

export const LABEL_COLORS = [
  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
];

export const COLOR_PALETTE = [
  "", "#ef4444", "#f59e0b", "#10b981", "#3b82f6",
  "#8b5cf6", "#ec4899", "#64748b", "#0f172a", "#14b8a6",
];