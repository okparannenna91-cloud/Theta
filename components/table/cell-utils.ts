import type { Column, FilterRule, SortConfig, GroupInfo } from "./types";
import { STATUS_COLORS, PRIORITY_META } from "./constants";

export function getCellValue(row: any, col: Column): any {
  if (col.id === "__checkbox") return undefined;
  if (col.type === "title") return row.title;
  if (col.type === "assignee") return row.assigneeIds || [];
  if (col.type === "project") return row.project?.name || row.projectId || "";
  if (col.type === "createdBy") return row.user?.name || row.createdBy || "";
  if (col.type === "updatedAt") return row.updatedAt;
  if (col.type === "labels") return row.labels || row.tagIds || [];
  if (col.type === "sprint") return row.sprint?.name || row.sprintId || "";
  if (col.type === "milestone") return row.milestone || "";
  return row[col.id] ?? row.fieldValues?.[col.id] ?? "";
}

export function getCellValueForRow(row: any, colId: string, columns: Column[]): any {
  const col = columns.find(c => c.id === colId);
  if (!col) return "";
  return getCellValue(row, col);
}

export function buildCellPayload(row: any, col: Column, value: any): Record<string, any> {
  const payload: Record<string, any> = {};
  switch (col.type) {
    case "title": payload.title = value; break;
    case "status": payload.status = value; break;
    case "priority": payload.priority = value; break;
    case "assignee": payload.assigneeIds = value; break;
    case "dueDate": payload.dueDate = value; break;
    case "startDate": payload.startDate = value; break;
    case "progress": payload.progress = value; break;
    case "number": case "estimate": payload[col.id] = value; break;
    case "labels": payload.tagIds = value; break;
    case "tags": payload.tagIds = value; break;
    case "project": payload.projectId = value; break;
    case "boolean": payload[col.id] = value; break;
    case "color": payload.color = value; break;
    case "sprint": payload.sprintId = value; break;
    case "milestone": payload.milestoneId = value; break;
    default: payload.fieldValues = { ...(row.fieldValues || {}), [col.id]: value }; break;
  }
  return payload;
}

export function formatCellValue(col: Column, value: any): string {
  if (value == null || value === "") return "";
  if (col.type === "date" || col.type === "dueDate" || col.type === "startDate") {
    try { return new Date(value).toLocaleDateString(); } catch { return String(value); }
  }
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return String(value.name || value.id || "");
  return String(value);
}

export function serializeToCSV(rows: any[], cols: Column[]): string {
  const visible = cols.filter(c => c.type !== "checkbox");
  const header = visible.map(c => c.name).join("\t");
  const body = rows.map(r =>
    visible.map(c => formatCellValue(c, getCellValue(r, c))).join("\t")
  ).join("\n");
  return header + "\n" + body;
}

export function parseCSVToRows(text: string, cols: Column[]): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const headerLine = lines[0].split("\t").map(s => s.trim());
  const dataLines = lines.slice(1).map(l => l.split("\t").map(s => s.trim()));
  const visible = cols.filter(c => c.type !== "checkbox");
  return dataLines.map(values => {
    const row: Record<string, string> = {};
    visible.forEach((col, i) => { row[col.id] = values[i] ?? ""; });
    return row;
  });
}

export function parsePastedValue(col: Column, textValue: string): any {
  if (textValue === "" || textValue == null) return undefined;
  if (col.type === "date" || col.type === "dueDate" || col.type === "startDate") {
    const d = new Date(textValue);
    if (!isNaN(d.getTime())) return d.toISOString();
    return undefined;
  }
  if (col.type === "number" || col.type === "estimate" || col.type === "progress") {
    const n = Number(textValue);
    return isNaN(n) ? undefined : n;
  }
  if (col.type === "boolean") return textValue === "true" || textValue === "yes" || textValue === "1";
  if (col.type === "assignee" || col.type === "labels" || col.type === "tags") {
    return textValue.split(",").map(s => s.trim()).filter(Boolean);
  }
  return textValue;
}

export function filterTasks(tasks: any[], filterRules: FilterRule[], columns: Column[]): any[] {
  if (filterRules.length === 0) return tasks;
  let result = [...tasks];

  const andRules = filterRules.filter(r => r.logic === "and");
  for (const rule of andRules) {
    const col = columns.find(c => c.id === rule.column);
    if (!col) continue;
    result = result.filter(t => {
      const cellVal = getCellValue(t, col);
      const strVal = String(cellVal ?? "").toLowerCase();
      const ruleVal = rule.value.toLowerCase();
      switch (rule.operator) {
        case "equals": return strVal === ruleVal;
        case "not_equals": return strVal !== ruleVal;
        case "contains": return strVal.includes(ruleVal);
        case "not_contains": return !strVal.includes(ruleVal);
        case "is_empty": return strVal === "" || cellVal == null;
        case "is_not_empty": return strVal !== "" && cellVal != null;
        case "is_before":
          if (col.type === "date" || col.type === "dueDate" || col.type === "startDate") {
            const d = new Date(cellVal); const r = new Date(ruleVal);
            return !isNaN(d.getTime()) && !isNaN(r.getTime()) && d < r;
          }
          return String(cellVal).localeCompare(ruleVal) < 0;
        case "is_after":
          if (col.type === "date" || col.type === "dueDate" || col.type === "startDate") {
            const d = new Date(cellVal); const r = new Date(ruleVal);
            return !isNaN(d.getTime()) && !isNaN(r.getTime()) && d > r;
          }
          return String(cellVal).localeCompare(ruleVal) > 0;
        default: return true;
      }
    });
  }

  const orRules = filterRules.filter(r => r.logic === "or");
  if (orRules.length > 0) {
    const orMatches = new Set<number>();
    result.forEach((t, i) => {
      for (const rule of orRules) {
        const col = columns.find(c => c.id === rule.column);
        if (!col) continue;
        const cellVal = getCellValue(t, col);
        const strVal = String(cellVal ?? "").toLowerCase();
        const ruleVal = rule.value.toLowerCase();
        let match = false;
        switch (rule.operator) {
          case "equals": match = strVal === ruleVal; break;
          case "not_equals": match = strVal !== ruleVal; break;
          case "contains": match = strVal.includes(ruleVal); break;
          case "not_contains": match = !strVal.includes(ruleVal); break;
          case "is_empty": match = strVal === "" || cellVal == null; break;
          case "is_not_empty": match = strVal !== "" && cellVal != null; break;
          case "is_before": case "is_after":
            if (col.type === "date" || col.type === "dueDate" || col.type === "startDate") {
              const d = new Date(cellVal); const r = new Date(ruleVal);
              if (!isNaN(d.getTime()) && !isNaN(r.getTime())) {
                match = rule.operator === "is_before" ? d < r : d > r;
              }
            }
            break;
        }
        if (match) { orMatches.add(i); break; }
      }
    });
    result = result.filter((_, i) => orMatches.has(i));
  }

  return result;
}

export function sortTasks(tasks: any[], sortConfig: SortConfig[], columns: Column[]): any[] {
  if (sortConfig.length === 0) return tasks;
  return [...tasks].sort((a, b) => {
    for (const s of sortConfig) {
      const col = columns.find(c => c.id === s.col);
      if (!col) continue;
      let aVal = getCellValue(a, col) ?? "";
      let bVal = getCellValue(b, col) ?? "";
      if (col.type === "date" || col.type === "dueDate" || col.type === "startDate" || col.type === "updatedAt") {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      } else if (typeof aVal === "number") {
        // already numeric
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }
      if (aVal < bVal) return s.dir === "asc" ? -1 : 1;
      if (aVal > bVal) return s.dir === "asc" ? 1 : -1;
    }
    return 0;
  });
}

export function searchTasks(tasks: any[], query: string): any[] {
  if (!query) return tasks;
  const q = query.toLowerCase();
  return tasks.filter(t =>
    (t.title || "").toLowerCase().includes(q) ||
    (t.description || "").toLowerCase().includes(q) ||
    (t.status || "").toLowerCase().includes(q) ||
    (t.labels || []).some((l: string) => l.toLowerCase().includes(q)) ||
    (t.assigneeIds || []).some((id: string) => id.toLowerCase().includes(q)) ||
    (t.project?.name || "").toLowerCase().includes(q)
  );
}

export function groupTasks(tasks: any[], groupBy: string | null): GroupInfo[] {
  if (!groupBy) return [{ key: "all", label: `All Tasks (${tasks.length})`, tasks }];
  const groups = new Map<string, any[]>();
  for (const t of tasks) {
    let key: string;
    if (groupBy === "status") key = t.status || "none";
    else if (groupBy === "priority") key = t.priority || "none";
    else if (groupBy === "assignee") {
      const ids = t.assigneeIds || [];
      key = ids.length ? ids[0] : "unassigned";
    }
    else if (groupBy === "project") key = t.project?.name || t.projectId || "no-project";
    else if (groupBy === "sprint") key = t.sprint?.name || t.sprintId || "no-sprint";
    else key = "all";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }
  return Array.from(groups.entries()).map(([key, ts]) => ({
    key,
    label: `${key.replace(/[_-]/g, " ")} (${ts.length})`,
    tasks: ts,
  }));
}

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || STATUS_COLORS.todo;
}

export function getPriorityMeta(p: string) {
  return PRIORITY_META[p] || PRIORITY_META.none;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}