export type ZoomLevel = "hour" | "day" | "week" | "month" | "quarter" | "year";

export type TimelineVariant = "timeline" | "gantt";

export type DependencyType = "FS" | "SS" | "FF" | "SF";

export interface TimelineTask {
  id: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
  priority: string;
  status: string;
  progress: number;
  isMilestone: boolean;
  isSummary: boolean;
  parentId: string | null;
  children?: TimelineTask[];
  depth?: number;
  assigneeIds: string[];
  predecessors?: { id: string; predecessorId: string; type: DependencyType; lag: number }[];
  successors?: { id: string }[];
  schedulingMode?: string;
  isCritical?: boolean;
  baselineStartDate?: string | null;
  baselineDueDate?: string | null;
  slack?: number;
  color?: string | null;
  user?: { id: string; name: string; imageUrl: string } | null;
  projectId?: string;
  project?: { id: string; name: string } | null;
}

export interface CellWidths {
  hour: number;
  day: number;
  week: number;
  month: number;
  quarter: number;
  year: number;
}

export const ZOOM_CELL_WIDTHS: CellWidths = {
  hour: 60,
  day: 100,
  week: 140,
  month: 180,
  quarter: 220,
  year: 280,
};

export const ZOOM_OPTIONS: { label: string; value: ZoomLevel }[] = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Quarter", value: "quarter" },
];

export const GANTT_ZOOM_OPTIONS: { label: string; value: ZoomLevel }[] = [
  { label: "Hour", value: "hour" },
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Quarter", value: "quarter" },
  { label: "Year", value: "year" },
];

export const ROW_HEIGHT = 56;
export const VISIBLE_BUFFER = 10;
export const SIDEBAR_WIDTH = 320;

export const GANTT_SIDEBAR_WIDTH = 360;

export interface UndoCommand {
  type: "drag" | "resize" | "dependency" | "milestone" | "create" | "delete" | "baseline";
  taskId: string;
  previous: Record<string, any>;
  next: Record<string, any>;
  timestamp: number;
}

export interface DragState {
  type: "move" | "resize-left" | "resize-right" | "dependency" | "pan" | null;
  taskId: string | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  initialLeft: number;
  initialWidth: number;
}

export interface DependencyLine {
  id: string;
  sourceTaskId: string;
  targetTaskId: string;
  type: DependencyType;
  path: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

export interface Baseline {
  id?: string;
  startDate: string;
  dueDate: string;
  label?: string;
  createdAt?: string;
}

export interface WorkingDayConfig {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

export interface Holiday {
  date: string;
  label: string;
}

export interface ZoomConfig {
  level: ZoomLevel;
  cellWidth: number;
  labelFormat: string;
  subLabelFormat: string;
  snapUnit: "hour" | "day" | "week" | "month";
}

export const ZOOM_CONFIG_MAP: Record<ZoomLevel, ZoomConfig> = {
  hour: { level: "hour", cellWidth: 60, labelFormat: "MMM d", subLabelFormat: "HH:mm", snapUnit: "hour" },
  day: { level: "day", cellWidth: 100, labelFormat: "MMMM yyyy", subLabelFormat: "d", snapUnit: "day" },
  week: { level: "week", cellWidth: 140, labelFormat: "MMM d", subLabelFormat: "EEE", snapUnit: "day" },
  month: { level: "month", cellWidth: 180, labelFormat: "MMM d", subLabelFormat: "EEE", snapUnit: "day" },
  quarter: { level: "quarter", cellWidth: 220, labelFormat: "QQQ yyyy", subLabelFormat: "MMM", snapUnit: "week" },
  year: { level: "year", cellWidth: 280, labelFormat: "yyyy", subLabelFormat: "MMM", snapUnit: "month" },
};
