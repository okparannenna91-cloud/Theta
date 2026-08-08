import { format } from "date-fns";

export interface ActivityChange {
  old: unknown;
  new: unknown;
}

export const STATUS_LABELS: Record<string, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
  cancelled: "Cancelled",
  backlog: "Backlog",
  review: "Review",
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const FIELD_LABELS: Record<string, string> = {
  title: "title",
  description: "description",
  status: "status",
  priority: "priority",
  dueDate: "due date",
  startDate: "start date",
  estimatedHours: "estimate",
  progress: "progress",
  color: "color",
  assigneeIds: "assignees",
  tagIds: "tags",
  tags: "tags",
};

export function humanize(value: string): string {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Date pickers sometimes record "unset" as an epoch-ish timestamp
export function isEpochish(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  const t = new Date(String(value)).getTime();
  return !Number.isFinite(t) || Math.abs(t) < 3 * 86400000;
}

export function formatValue(field: string, value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (field === "dueDate" || field === "startDate") {
    return isEpochish(value) ? null : format(new Date(String(value)), "MMM d");
  }
  if (field === "status") return STATUS_LABELS[String(value)] || humanize(String(value));
  if (field === "priority") return PRIORITY_LABELS[String(value)] || humanize(String(value));
  if (field === "progress") return `${value}%`;
  if (field === "estimatedHours") return `${value}h`;
  if (field === "assigneeIds") return null;
  if (typeof value === "string") return value || null;
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return value ? String(value) : null;
}

export function isMeaningfulChange(field: string, change: ActivityChange): boolean {
  if (field === "assigneeIds") {
    const oldArr = Array.isArray(change.old) ? (change.old as unknown[]) : [];
    const newArr = Array.isArray(change.new) ? (change.new as unknown[]) : [];
    return oldArr.length !== newArr.length || oldArr.some((x) => !newArr.includes(x));
  }
  return formatValue(field, change.old) !== formatValue(field, change.new);
}

export function describeChange(field: string, change: ActivityChange, entity?: string): string {
  const label = FIELD_LABELS[field] || humanize(field);
  const ref = entity ? `"${entity}"` : null;

  if (field === "assigneeIds") {
    const oldArr = Array.isArray(change.old) ? (change.old as string[]) : [];
    const newArr = Array.isArray(change.new) ? (change.new as string[]) : [];
    const added = newArr.filter((id) => !oldArr.includes(id)).length;
    const removed = oldArr.filter((id) => !newArr.includes(id)).length;
    const bits: string[] = [];
    if (added > 0) bits.push(`added ${added} assignee${added > 1 ? "s" : ""}`);
    if (removed > 0) bits.push(`removed ${removed} assignee${removed > 1 ? "s" : ""}`);
    if (!bits.length) return ref ? `updated the assignees of ${ref}` : "updated the assignees";
    return `${bits.join(" and ")}${ref ? (bits.length > 1 ? " on" : " to") + ` ${ref}` : ""}`;
  }

  if (field === "title") return ref ? `renamed ${ref}` : "renamed the task";
  if (field === "description") return ref ? `updated the description of ${ref}` : "updated the description";

  if (field === "color") {
    if (change.old == null && change.new != null) return ref ? `gave ${ref} a color` : "gave the task a color";
    if (change.new == null) return ref ? `cleared the color of ${ref}` : "cleared the task color";
    return ref ? `changed the color of ${ref}` : "changed the task color";
  }

  const o = formatValue(field, change.old);
  const n = formatValue(field, change.new);

  if (field === "dueDate" || field === "startDate") {
    if (!o && n) return ref ? `set the ${label} of ${ref} to ${n}` : `set the ${label} to ${n}`;
    if (o && !n) return ref ? `cleared the ${label} of ${ref}` : `cleared the ${label}`;
    if (o && n) return ref ? `moved the ${label} of ${ref} from ${o} to ${n}` : `moved the ${label} from ${o} to ${n}`;
    return `updated the ${label}`;
  }

  if (field === "status") {
    if (o && n && o !== n) return ref ? `moved ${ref} from ${o} to ${n}` : `moved the status from ${o} to ${n}`;
    if (!o && n) return ref ? `set ${ref} to ${n}` : `set the status to ${n}`;
    return "updated the status";
  }

  if (field === "priority") {
    if (o && n && o !== n) return ref ? `changed the priority of ${ref} from ${o} to ${n}` : `changed the priority from ${o} to ${n}`;
    if (!o && n) return ref ? `set the priority of ${ref} to ${n}` : `set the priority to ${n}`;
    return "updated the priority";
  }

  if (o && n) return ref ? `changed the ${label} of ${ref} from ${o} to ${n}` : `changed the ${label} from ${o} to ${n}`;
  if (o && !n) return ref ? `removed the ${label} from ${ref}` : `removed the ${label}`;
  if (!o && n) return ref ? `set the ${label} of ${ref} to ${n}` : `set the ${label} to ${n}`;
  return `updated the ${label}`;
}
