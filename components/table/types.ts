export type ColumnType =
  | "checkbox" | "title" | "status" | "priority" | "assignee"
  | "date" | "dueDate" | "startDate" | "labels" | "progress" | "number" | "boolean" | "color"
  | "text" | "project" | "sprint" | "estimate" | "storyPoints"
  | "milestone" | "tags" | "createdBy" | "updatedAt" | "custom";

export interface Column {
  id: string;
  name: string;
  type: ColumnType;
  width: number;
  visible: boolean;
  pinned: boolean;
  order: number;
  options?: string[];
  color?: string;
}

export interface CellPosition {
  row: number;
  col: number;
}

export interface SortConfig {
  col: string;
  dir: "asc" | "desc";
}

export interface FilterRule {
  id: string;
  column: string;
  operator: string;
  value: string;
  logic: "and" | "or";
}

export interface GroupInfo {
  key: string;
  label: string;
  tasks: any[];
}

export interface FlatItem {
  type: "group" | "row";
  key: string;
  offset: number;
  height: number;
  data: {
    group?: GroupInfo;
    isCollapsed?: boolean;
    task?: any;
    globalIdx?: number;
  };
}