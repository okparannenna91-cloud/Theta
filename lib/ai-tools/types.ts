import type { Prisma } from "@prisma/client";

export interface UserContext {
  id: string;
  name: string;
  email: string;
}

export interface WorkspaceContext {
  id: string;
  name: string;
  plan: string;
}

export interface ToolContext {
  workspaceId: string;
  user: UserContext;
  projectId?: string;
}

export interface ToolResult {
  success?: boolean;
  message?: string;
  error?: string;
  data?: unknown;
}

export type AutomationConfigValue = string | number | boolean | string[] | number[];

export interface AutomationConfig {
  [key: string]: AutomationConfigValue;
}

export interface ReportingStructuredData {
  project?: { name: string };
  workspace?: { name: string; plan: string };
  task?: { title: string; status: string };
}

export interface TranscriptionUtterance {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export interface WhisperSegment {
  start: number;
  end: number;
  text: string;
}

export interface ParsedActionItem {
  title: string;
  assignee?: string;
  priority?: string;
  dueDate?: string;
}

export interface TaskDependency {
  type: string;
  predecessorId?: string;
}

export interface SavedSearchFilters {
  status?: string[];
  priority?: string[];
  assigneeIds?: string[];
  projectId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  tags?: string[];
  [key: string]: unknown;
}
