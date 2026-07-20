import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// ─── Types ────────────────────────────────────────────────

export type ExportFormat = "csv" | "json" | "pdf";
export type ExportType =
  | "tasks"
  | "projects"
  | "boards"
  | "documents"
  | "chat"
  | "activities"
  | "time_logs"
  | "analytics";

export interface ExportFilters {
  projectId?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ExportOptions {
  format: ExportFormat;
  type: ExportType;
  workspaceId: string;
  filters?: ExportFilters;
}

export interface ExportResult {
  data: string | Buffer;
  filename: string;
  mimeType: string;
  count: number;
}

// ─── Helpers ──────────────────────────────────────────────

function formatDateSuffix(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function serializeValue(value: unknown): unknown {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

function escapeCSVField(value: unknown): string {
  const str = String(serializeValue(value));
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ─── Filter Builder ───────────────────────────────────────

type PrismaWhere = Record<string, unknown>;

function buildFilters(filters: ExportFilters | undefined, workspaceId: string): PrismaWhere {
  const where: PrismaWhere = { workspaceId };

  if (!filters) return where;

  if (filters.projectId) {
    where.projectId = filters.projectId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.priority) {
    where.priority = filters.priority;
  }

  if (filters.assigneeId) {
    where.assigneeIds = { has: filters.assigneeId };
  }

  if (filters.startDate || filters.endDate) {
    const createdAt: PrismaWhere = {};
    if (filters.startDate) {
      createdAt.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      createdAt.lte = new Date(filters.endDate);
    }
    where.createdAt = createdAt;
  }

  return where;
}

// ─── Format Converters ────────────────────────────────────

export function exportCSV(
  data: Record<string, unknown>[],
  filename: string
): ExportResult {
  if (data.length === 0) {
    return { data: "", filename: `${filename}.csv`, mimeType: "text/csv", count: 0 };
  }

  const headers = Object.keys(data[0]);
  const rows = [
    headers.map(escapeCSVField).join(","),
    ...data.map((row) => headers.map((h) => escapeCSVField(row[h])).join(",")),
  ];

  return {
    data: rows.join("\n"),
    filename: `${filename}.csv`,
    mimeType: "text/csv",
    count: data.length,
  };
}

export function exportJSON(
  data: Record<string, unknown>[],
  filename: string
): ExportResult {
  return {
    data: JSON.stringify(data, null, 2),
    filename: `${filename}.json`,
    mimeType: "application/json",
    count: data.length,
  };
}

/**
 * Real PDF export using jsPDF + autoTable
 * Generates a proper PDF with tables, headers, and styling
 */
export async function exportPDF(
  data: Record<string, unknown>[],
  filename: string,
  title: string
): Promise<ExportResult> {
  if (data.length === 0) {
    return { data: "", filename: `${filename}.pdf`, mimeType: "application/pdf", count: 0 };
  }

  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Add header
  doc.setFontSize(18);
  doc.setTextColor(79, 70, 229); // Indigo-600
  doc.text(`Theta - ${title}`, 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(`Exported on ${new Date().toLocaleDateString()} | ${data.length} records`, 14, 28);

  // Build table
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = serializeValue(row[h]);
      const str = String(val);
      // Truncate long strings for PDF readability
      return str.length > 60 ? str.substring(0, 57) + "..." : str;
    })
  );

  autoTable(doc, {
    startY: 34,
    head: [headers],
    body: rows,
    styles: {
      fontSize: 7,
      cellPadding: 2,
      overflow: "linebreak",
      font: "helvetica",
    },
    headStyles: {
      fillColor: [79, 70, 229], // Indigo-600
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate-50
    },
    columnStyles: headers.reduce((acc, header, idx) => {
      // Auto-width: make date/metadata columns narrower
      if (header.includes("date") || header.includes("Date") || header.includes("At")) {
        acc[idx] = { cellWidth: 30 };
      } else if (header.includes("metadata") || header.includes("content") || header.includes("description")) {
        acc[idx] = { cellWidth: 50 };
      }
      return acc;
    }, {} as Record<number, { cellWidth: number }>),
    margin: { top: 34, left: 14, right: 14 },
    didDrawPage: (data: any) => {
      // Footer
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // Slate-400
      doc.text(
        `Theta PM | Page ${data.pageNumber} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: "center" }
      );
    },
  });

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return {
    data: pdfBuffer,
    filename: `${filename}.pdf`,
    mimeType: "application/pdf",
    count: data.length,
  };
}

function formatExport(
  data: Record<string, unknown>[],
  format: ExportFormat,
  type: ExportType
): ExportResult | Promise<ExportResult> {
  const base = `${type}_${formatDateSuffix()}`;
  if (format === "csv") return exportCSV(data, base);
  if (format === "json") return exportJSON(data, base);
  // PDF requires async import
  return exportPDF(data, base, type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " "));
}

// ─── Data Fetchers ────────────────────────────────────────

async function fetchTasks(
  where: PrismaWhere,
  format: ExportFormat
): Promise<ExportResult> {
  const rows = await prisma.task.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const data = rows.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description ?? "",
    status: t.status,
    priority: t.priority,
    taskType: t.taskType,
    dueDate: t.dueDate?.toISOString() ?? "",
    projectId: t.projectId,
    workspaceId: t.workspaceId,
    userId: t.userId,
    assigneeIds: t.assigneeIds,
    tags: t.tagIds,
    estimatedHours: t.estimatedHours ?? "",
    timeSpent: t.timeSpent ?? "",
    progress: t.progress,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    completedAt: t.completedAt?.toISOString() ?? "",
    fieldValues: t.fieldValues ?? "",
    customFieldMetadata: t.customFieldMetadata ?? "",
  }));

  return formatExport(data, format, "tasks") as Promise<ExportResult>;
}

async function fetchProjects(
  where: PrismaWhere,
  format: ExportFormat
): Promise<ExportResult> {
  const rows = await prisma.project.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const data = rows.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? "",
    color: p.color ?? "",
    workspaceId: p.workspaceId,
    userId: p.userId,
    visibility: p.visibility,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return formatExport(data, format, "projects") as Promise<ExportResult>;
}

async function fetchBoards(
  where: PrismaWhere,
  format: ExportFormat
): Promise<ExportResult> {
  const rows = await prisma.board.findMany({
    where,
    include: { columns: true },
    orderBy: { createdAt: "desc" },
  });

  const data = rows.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description ?? "",
    icon: b.icon ?? "",
    visibility: b.visibility,
    projectId: b.projectId,
    workspaceId: b.workspaceId,
    columnCount: b.columns.length,
    columns: b.columns.map((c) => c.name).join("; "),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }));

  return formatExport(data, format, "boards") as Promise<ExportResult>;
}

async function fetchDocuments(
  where: PrismaWhere,
  format: ExportFormat
): Promise<ExportResult> {
  const rows = await prisma.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const data = rows.map((d) => ({
    id: d.id,
    title: d.title,
    content: d.content ?? "",
    emoji: d.emoji ?? "",
    status: d.status,
    visibility: d.visibility,
    tags: d.tags,
    isTemplate: d.isTemplate,
    views: d.views,
    projectId: d.projectId ?? "",
    workspaceId: d.workspaceId,
    userId: d.userId,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));

  return formatExport(data, format, "documents") as Promise<ExportResult>;
}

async function fetchChatMessages(
  where: PrismaWhere,
  format: ExportFormat
): Promise<ExportResult> {
  const rows = await prisma.chatMessage.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const data = rows.map((m) => ({
    id: m.id,
    content: m.content,
    workspaceId: m.workspaceId,
    projectId: m.projectId ?? "",
    teamId: m.teamId ?? "",
    userId: m.userId,
    isPinned: m.isPinned,
    isEdited: m.isEdited,
    deletedAt: m.deletedAt?.toISOString() ?? "",
    replyToId: m.replyToId ?? "",
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }));

  return formatExport(data, format, "chat") as Promise<ExportResult>;
}

async function fetchActivities(
  where: PrismaWhere,
  format: ExportFormat
): Promise<ExportResult> {
  const rows = await prisma.activity.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const data = rows.map((a) => ({
    id: a.id,
    action: a.action,
    entityType: a.entityType,
    entityId: a.entityId,
    workspaceId: a.workspaceId,
    userId: a.userId,
    projectId: a.projectId ?? "",
    metadata: a.metadata ?? "",
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));

  return formatExport(data, format, "activities") as Promise<ExportResult>;
}

async function fetchTimeLogs(
  where: PrismaWhere,
  format: ExportFormat
): Promise<ExportResult> {
  const rows = await prisma.timeLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const data = rows.map((t) => ({
    id: t.id,
    duration: t.duration,
    durationFormatted: formatDuration(t.duration),
    description: t.description ?? "",
    userId: t.userId,
    taskId: t.taskId,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  return formatExport(data, format, "time_logs") as Promise<ExportResult>;
}

async function fetchAnalytics(
  where: PrismaWhere,
  format: ExportFormat
): Promise<ExportResult> {
  const workspaceId = where.workspaceId as string;

  const [taskStats, projectStats, activityStats, timeLogStats] =
    await prisma.$transaction([
      prisma.task.groupBy({
        by: ["status", "priority"],
        where: { workspaceId },
        orderBy: {},
        _count: true,
        _sum: { estimatedHours: true, timeSpent: true },
      }),
      prisma.project.findMany({
        where: { workspaceId },
        select: { id: true, name: true },
      }),
      prisma.activity.groupBy({
        by: ["action"],
        where: { workspaceId },
        orderBy: {},
        _count: true,
      }),
      prisma.timeLog.aggregate({
        where: { task: { workspaceId } },
        _sum: { duration: true },
        _count: true,
      }),
    ]);

  const projectTaskCounts = await prisma.task.groupBy({
    by: ["projectId"],
    where: { workspaceId },
    orderBy: {},
    _count: true,
  });

  const projectCountMap = new Map(
    projectTaskCounts.map((p) => [p.projectId, p._count])
  );

  const projectBreakdown = projectStats.map((p) => ({
    projectId: p.id,
    projectName: p.name,
    taskCount: projectCountMap.get(p.id) ?? 0,
  }));

  const data: Record<string, unknown>[] = [
    {
      metric: "summary",
      totalTasks: taskStats.reduce((s, g) => s + (g._count as number), 0),
      totalProjects: projectStats.length,
      totalActivities: activityStats.reduce((s, g) => s + (g._count as number), 0),
      totalTimeLogs: timeLogStats._count,
      totalTrackedSeconds: timeLogStats._sum?.duration ?? 0,
      exportedAt: new Date().toISOString(),
    },
    ...taskStats.map((g) => ({
      metric: "task_by_status_priority",
      status: g.status,
      priority: g.priority,
      count: g._count,
      estimatedHoursTotal: g._sum?.estimatedHours ?? 0,
      timeSpentTotal: g._sum?.timeSpent ?? 0,
    })),
    ...activityStats.map((g) => ({
      metric: "activity_by_action",
      action: g.action,
      count: g._count,
    })),
    ...projectBreakdown.map((p) => ({
      metric: "project_task_count",
      projectId: p.projectId,
      projectName: p.projectName,
      taskCount: p.taskCount,
    })),
  ];

  return formatExport(data, format, "analytics") as Promise<ExportResult>;
}

// ─── Utilities ────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

// ─── Main Export Function ─────────────────────────────────

const FETCHERS: Record<
  ExportType,
  (where: PrismaWhere, format: ExportFormat) => Promise<ExportResult>
> = {
  tasks: fetchTasks,
  projects: fetchProjects,
  boards: fetchBoards,
  documents: fetchDocuments,
  chat: fetchChatMessages,
  activities: fetchActivities,
  time_logs: fetchTimeLogs,
  analytics: fetchAnalytics,
};

export async function exportData(
  options: ExportOptions
): Promise<ExportResult> {
  const { format, type, workspaceId, filters } = options;

  logger.info(`Export requested: type=${type}, format=${format}, workspace=${workspaceId}`);

  if (!workspaceId) {
    throw new Error("workspaceId is required for export");
  }

  const fetcher = FETCHERS[type];
  if (!fetcher) {
    throw new Error(`Unknown export type: ${type}`);
  }

  const where = buildFilters(filters, workspaceId);

  try {
    const result = await fetcher(where, format);
    logger.info(`Export completed: type=${type}, count=${result.count}`);
    return result;
  } catch (error) {
    logger.error(`Export failed for type=${type}`, error);
    throw error;
  }
}

export async function exportTimeline(options: { format: "csv" | "json" | "pdf"; tasks: Record<string, unknown>[] }): Promise<ExportResult> {
  const { format, tasks } = options;
  const filename = `theta-timeline-${formatDateSuffix()}`;

  if (format === "json") {
    return exportJSON(tasks, filename);
  }

  if (format === "pdf") {
    return exportPDF(tasks, filename, "Timeline");
  }

  return exportCSV(tasks, filename);
}
