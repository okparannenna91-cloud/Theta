export type ZoomLevel = "hour" | "day" | "week" | "month" | "quarter" | "year";

export type TimelineVariant = "timeline" | "gantt";

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
  predecessors?: { predecessorId: string; type: string; lag: number }[];
  successors?: { id: string }[];
  schedulingMode?: string;
  isCritical?: boolean;
  baselineStartDate?: string | null;
  baselineDueDate?: string | null;
  color?: string | null;
  user?: { id: string; name: string; imageUrl: string } | null;
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
  hour: 80,
  day: 120,
  week: 160,
  month: 200,
  quarter: 250,
  year: 300,
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

export const ROW_HEIGHT = 64;
export const VISIBLE_BUFFER = 5;
export const SIDEBAR_WIDTH = 350;

export interface UndoCommand {
  type: "drag" | "resize" | "dependency" | "milestone" | "create" | "delete";
  taskId: string;
  previous: Record<string, any>;
  next: Record<string, any>;
  timestamp: number;
}
