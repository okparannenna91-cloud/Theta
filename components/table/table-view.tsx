"use client";

import React, {
  useState, useCallback, useRef, useEffect, useMemo,
  KeyboardEvent,
} from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { invalidateTaskCaches } from "@/lib/invalidate-task-caches";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  GripVertical, CheckSquare, Square, ChevronDown, ChevronRight,
  Plus, Trash2, ExternalLink, CalendarDays, User, Users,
  MessageSquare, Paperclip, Link2, Clock, Flag, Hash, ArrowUpDown,
  Filter, LayoutList, Search, X, MoreHorizontal, Copy, Archive,
  ChevronsUpDown, Undo2, Redo2, ClipboardPaste, ArrowUp, ArrowDown,
  Columns3, Settings2, Tags,
} from "lucide-react";

const ROW_HEIGHT = 33;
const GROUP_HEADER_HEIGHT = 29;
const OVERSCAN = 10;

/* ─── Column Types ─── */

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

export interface TableData {
  id: string;
  [key: string]: any;
}

/* ─── Default Columns ─── */

export const DEFAULT_COLUMNS: Column[] = [
  { id: "__checkbox", name: "", type: "checkbox", width: 40, visible: true, pinned: true, order: -1 },
  { id: "title", name: "Task", type: "title", width: 280, visible: true, pinned: true, order: 0 },
  { id: "status", name: "Status", type: "status", width: 120, visible: true, pinned: false, order: 1 },
  { id: "priority", name: "Priority", type: "priority", width: 100, visible: true, pinned: false, order: 2 },
  { id: "assignee", name: "Assignee", type: "assignee", width: 140, visible: true, pinned: false, order: 3 },
  { id: "dueDate", name: "Due Date", type: "date", width: 120, visible: true, pinned: false, order: 4 },
  { id: "startDate", name: "Start Date", type: "date", width: 120, visible: false, pinned: false, order: 5 },
  { id: "progress", name: "Progress", type: "progress", width: 100, visible: true, pinned: false, order: 6 },
  { id: "project", name: "Project", type: "project", width: 120, visible: true, pinned: false, order: 7 },
  { id: "labels", name: "Labels", type: "labels", width: 140, visible: false, pinned: false, order: 8 },
  { id: "estimate", name: "Estimate", type: "number", width: 80, visible: false, pinned: false, order: 9 },
  { id: "createdBy", name: "Created By", type: "createdBy", width: 120, visible: false, pinned: false, order: 10 },
  { id: "updatedAt", name: "Updated", type: "updatedAt", width: 120, visible: false, pinned: false, order: 11 },
];

/* ─── Helpers ─── */

const STATUS_COLORS: Record<string, string> = {
  todo: "#9ca3af", in_progress: "#3b82f6", "in-progress": "#3b82f6",
  review: "#8b5cf6", done: "#10b981", cancelled: "#ef4444", backlog: "#64748b",
};

const PRIORITY_CLASSES: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  none: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

const PRIORITY_VALUES = ["urgent", "high", "medium", "low", "none"];

function getCellValue(row: any, col: Column): any {
  if (col.id === "__checkbox") return undefined;
  if (col.type === "title") return row.title;
  if (col.type === "assignee") return row.assigneeIds || [];
  if (col.type === "project") return row.project?.name || row.projectId || "";
  if (col.type === "createdBy") return row.user?.name || row.createdBy || "";
  if (col.type === "updatedAt") return row.updatedAt;
  if (col.type === "labels") return row.labels || row.tagIds || [];
  return row[col.id] ?? row.fieldValues?.[col.id] ?? "";
}

/* ─── Undo/Redo Hook ─── */

function useUndoRedo<T>(initial: T) {
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initial);
  const [future, setFuture] = useState<T[]>([]);

  const setState = useCallback((newState: T) => {
    setPast(prev => [...prev.slice(-50), present]);
    setPresent(newState);
    setFuture([]);
  }, [present]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast(prev => prev.slice(0, -1));
    setFuture(prev => [present, ...prev.slice(0, 49)]);
    setPresent(previous);
  }, [past, present]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture(prev => prev.slice(1));
    setPast(prev => [...prev, present]);
    setPresent(next);
  }, [future, present]);

  const reset = useCallback((v: T) => {
    setPast([]);
    setPresent(v);
    setFuture([]);
  }, []);

  return {
    state: present, setState, undo, redo, reset,
    canUndo: past.length > 0, canRedo: future.length > 0,
  };
}

/* ─── Clipboard Helpers ─── */

function serializeToCSV(rows: any[], cols: Column[], getValue: (r: any, c: Column) => any): string {
  const header = cols.filter(c => c.type !== "checkbox").map(c => c.name).join("\t");
  const body = rows.map(r =>
    cols.filter(c => c.type !== "checkbox").map(c => {
      const v = getValue(r, c);
      if (Array.isArray(v)) return v.join(", ");
      if (v && typeof v === "object") return String(v.name || v.id || "");
      return String(v ?? "");
    }).join("\t")
  ).join("\n");
  return header + "\n" + body;
}

function parseCSVToRows(text: string, cols: Column[]): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const headerLine = lines[0].split("\t").map(s => s.trim());
  const dataLines = lines.slice(1).map(l => l.split("\t").map(s => s.trim()));
  const visible = cols.filter(c => c.type !== "checkbox");
  return dataLines.map(values => {
    const row: Record<string, string> = {};
    visible.forEach((col, i) => {
      row[col.id] = values[i] ?? "";
    });
    return row;
  });
}

/* ─── Editable Cell ─── */

function EditCell({ col, value, onSave, onCancel, inputRef: externalRef }: {
  col: Column; value: any; onSave: (val: any) => void; onCancel: () => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}) {
  const localRef = useRef<HTMLInputElement>(null);
  const ref = externalRef || localRef;
  const [editVal, setEditVal] = useState(value ?? "");
  const [localSel, setLocalSel] = useState<string[]>([]);
  const [localLabels, setLocalLabels] = useState<string[]>([]);

  useEffect(() => {
    if (col.type === "assignee") setLocalSel(Array.isArray(value) ? value : []);
    else if (col.type === "labels" || col.type === "tags") setLocalLabels(Array.isArray(value) ? value : []);
  }, [col.type, value]);

  useEffect(() => { setTimeout(() => ref.current?.focus(), 0); }, [ref]);

  if (col.type === "status") {
    return (
      <div className="flex items-center gap-1 p-1">
        {["todo", "in_progress", "done", "review", "backlog", "cancelled"].map(s => (
          <button key={s} onClick={() => onSave(s)}
            className={cn("h-6 px-1.5 text-[10px] rounded border transition-all capitalize",
              value === s ? "border-primary bg-primary/10 font-medium" : "border-border hover:border-primary/30")}>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[s] || STATUS_COLORS.todo }} />
              {s.replace(/[_-]/g, " ")}
            </span>
          </button>
        ))}
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground px-1 text-xs">✕</button>
      </div>
    );
  }

  if (col.type === "priority") {
    return (
      <div className="flex items-center gap-1 p-1 flex-wrap">
        {PRIORITY_VALUES.map(p => (
          <button key={p} onClick={() => onSave(p)}
            className={cn("h-6 px-1.5 text-[10px] rounded border transition-all capitalize",
              value === p ? "border-primary bg-primary/10 font-medium" : "border-border hover:border-primary/30")}>
            {p}
          </button>
        ))}
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground px-1 text-xs">✕</button>
      </div>
    );
  }

  if (col.type === "date") {
    return (
      <div className="p-1">
        <Popover open onOpenChange={(o) => { if (!o) onCancel(); }}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs w-full justify-start">
              <CalendarDays className="h-3 w-3 mr-1" />
              {editVal ? format(new Date(editVal), "MMM d, yyyy") : "Pick date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={editVal ? new Date(editVal) : undefined}
              onSelect={(d) => { if (d) { setEditVal(d.toISOString()); onSave(d.toISOString()); } }}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  if (col.type === "assignee") {
    const allMembers = (col.options || ["Alice", "Bob", "Charlie", "Diana"]).map(m => ({ id: m, name: m }));
    const memberColors = ["bg-red-100", "bg-blue-100", "bg-green-100", "bg-amber-100", "bg-purple-100", "bg-pink-100"];
    return (
      <div className="p-1.5 min-w-[160px]" onKeyDown={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap gap-1 mb-1.5">
          {localSel.map(id => (
            <span key={id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
              {id[0]?.toUpperCase() || "?"} {id}
              <button onClick={() => setLocalSel(prev => prev.filter(x => x !== id))} className="hover:text-destructive">✕</button>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {allMembers.filter(m => !localSel.includes(m.id)).map((m, i) => (
            <button key={m.id} onClick={() => { const next = [...localSel, m.id]; setLocalSel(next); }}
              className={cn("text-[10px] px-2 py-0.5 rounded-full border hover:border-primary/50 transition-colors flex items-center gap-1",
                memberColors[i % memberColors.length])}>
              {m.name[0]?.toUpperCase() || "?"} {m.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t">
          <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => onSave(localSel)}>Apply</Button>
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    );
  }

  if (col.type === "project") {
    const projects = (col.options || ["Marketing", "Engineering", "Design", "Sales", "HR"]).map(p => ({ id: p.toLowerCase().replace(/\s+/g, "-"), name: p }));
    const allProjects = [{ id: "", name: "No Project" }, ...projects];
    return (
      <div className="p-1">
        <div className="flex flex-col gap-0.5 max-h-[180px] overflow-auto">
          {allProjects.map(p => (
            <button key={p.id} onClick={() => onSave(p.id)}
              className={cn("text-[11px] px-2 py-1 rounded text-left hover:bg-muted transition-colors flex items-center gap-2",
                (value === p.id || (!value && !p.id)) && "bg-primary/10 font-medium")}>
              {!p.id && <span className="text-muted-foreground/40">—</span>}
              {p.name}
            </button>
          ))}
        </div>
        <button onClick={onCancel} className="text-[10px] text-muted-foreground hover:text-foreground mt-1">✕ Close</button>
      </div>
    );
  }

  if (col.type === "labels" || col.type === "tags") {
    const allLabels = col.options || ["bug", "feature", "enhancement", "docs", "urgent", "design"];
    const labelColors = ["bg-red-100 text-red-700", "bg-blue-100 text-blue-700", "bg-green-100 text-green-700", "bg-amber-100 text-amber-700", "bg-purple-100 text-purple-700"];
    return (
      <div className="p-1.5 min-w-[140px]" onKeyDown={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap gap-1 mb-1">
          {localLabels.map(l => (
            <span key={l} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
              {l}
              <button onClick={() => setLocalLabels(prev => prev.filter(x => x !== l))} className="hover:text-destructive">✕</button>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {allLabels.filter(l => !localLabels.includes(l)).map((l, i) => (
            <button key={l} onClick={() => setLocalLabels(prev => [...prev, l])}
              className={cn("text-[10px] px-1.5 py-0.5 rounded-full border hover:border-primary/50 transition-colors",
                labelColors[i % labelColors.length])}>
              + {l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t">
          <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => onSave(localLabels)}>Apply</Button>
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    );
  }

  if (col.type === "sprint" || col.type === "milestone") {
    const items = col.options || ["Sprint 1", "Sprint 2", "Sprint 3", "Backlog"];
    return (
      <div className="p-1">
        <div className="flex flex-col gap-0.5 max-h-[160px] overflow-auto">
          {[{ id: "", name: `No ${col.type === "sprint" ? "Sprint" : "Milestone"}` }, ...items.map(i => ({ id: i.toLowerCase().replace(/\s+/g, "-"), name: i }))].map(item => (
            <button key={item.id} onClick={() => onSave(item.id)}
              className={cn("text-[11px] px-2 py-1 rounded text-left hover:bg-muted transition-colors",
                value === item.id && "bg-primary/10 font-medium")}>
              {item.name}
            </button>
          ))}
        </div>
        <button onClick={onCancel} className="text-[10px] text-muted-foreground hover:text-foreground mt-1">✕ Close</button>
      </div>
    );
  }

  if (col.type === "progress") {
    return (
      <div className="flex items-center gap-2 p-1">
        <input type="range" min="0" max="100" value={editVal ?? 0}
          onChange={(e) => setEditVal(parseInt(e.target.value))}
          onMouseUp={() => onSave(editVal)}
          className="flex-1 h-1 accent-primary cursor-pointer" />
        <span className="text-xs font-medium w-8 text-right tabular-nums">{editVal ?? 0}%</span>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
      </div>
    );
  }

  if (col.type === "number" || col.type === "estimate" || col.type === "storyPoints") {
    return (
      <input ref={ref} type="number" value={editVal}
        onChange={(e) => setEditVal(e.target.value)}
        onBlur={() => onSave(editVal === "" ? 0 : Number(editVal))}
        onKeyDown={(e) => { if (e.key === "Enter") onSave(editVal === "" ? 0 : Number(editVal)); if (e.key === "Escape") onCancel(); }}
        className="h-7 w-full text-xs bg-transparent border-b border-primary outline-none px-1 text-center" />
    );
  }

  if (col.type === "boolean") {
    return (
      <div className="flex items-center gap-2 p-1">
        <button onClick={() => onSave(!value)}
          className={cn("h-5 w-9 rounded-full transition-colors", value ? "bg-primary" : "bg-muted")}>
          <div className={cn("h-4 w-4 rounded-full bg-white shadow transition-transform", value ? "translate-x-4" : "translate-x-0.5")} />
        </button>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
      </div>
    );
  }

  if (col.type === "color") {
    const colors = ["", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b", "#0f172a"];
    return (
      <div className="flex items-center gap-1 p-1 flex-wrap">
        {colors.map(c => (
          <button key={c || "none"} onClick={() => onSave(c)}
            className={cn("h-5 w-5 rounded-full border transition-all", value === c ? "ring-2 ring-primary ring-offset-1 scale-110" : "hover:scale-110")}
            style={c ? { backgroundColor: c } : { background: "linear-gradient(135deg, #e2e8f0 40%, #94a3b8 60%)" }} />
        ))}
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground px-1 text-xs">✕</button>
      </div>
    );
  }

  return (
    <input ref={ref} type="text" value={editVal}
      onChange={(e) => setEditVal(e.target.value)}
      onBlur={() => { if (editVal !== value) onSave(editVal); else onCancel(); }}
      onKeyDown={(e) => {
        if (e.key === "Enter") { onSave(editVal); }
        if (e.key === "Escape") onCancel();
        if (e.key === "Tab") { e.preventDefault(); onSave(editVal); }
      }}
      className="h-7 w-full text-xs bg-transparent border-b border-primary outline-none px-1" />
  );
}

/* ─── Cell Renderer ─── */

function CellDisplay({ col, value, row, onClick }: { col: Column; value: any; row: any; onClick: () => void }) {
  if (col.type === "checkbox") {
    const isDone = row.status === "done";
    const isBulkSelected = false;
    return (
      <span className="flex items-center justify-center h-full cursor-pointer" onClick={(e) => { e.stopPropagation(); onClick(); }}>
        {isBulkSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : isDone ? <CheckSquare className="h-4 w-4 text-emerald-500" /> : <Square className="h-4 w-4 text-muted-foreground/40 hover:text-muted-foreground" />}
      </span>
    );
  }

  if (col.type === "title") {
    const isDone = row.status === "done";
    const subtaskCount = row.subtasks?.length || 0;
    const completedSubtasks = row.subtasks?.filter((s: any) => s.completed).length || 0;
    const depCount = row.dependencies?.length || row.dependsOn?.length || 0;
    const commentCount = row._count?.comments || 0;
    const attachmentCount = row._count?.attachments || 0;
    return (
      <div className="flex items-center gap-2 min-w-0">
        {subtaskCount > 0 && (
          <div className="shrink-0 flex flex-col items-center gap-0.5">
            {completedSubtasks === subtaskCount ? (
              <CheckSquare className="h-3 w-3 text-emerald-500" />
            ) : (
              <span className="text-[9px] font-medium text-muted-foreground/50">{completedSubtasks}/{subtaskCount}</span>
            )}
          </div>
        )}
        <span className={cn("text-xs font-medium truncate", isDone && "line-through text-muted-foreground/60")}>
          {row.title || "Untitled"}
        </span>
        <span className="flex items-center gap-1 ml-auto shrink-0">
          {commentCount > 0 && (
            <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground/50">
              <MessageSquare className="h-2.5 w-2.5" />
              {commentCount}
            </span>
          )}
          {attachmentCount > 0 && (
            <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground/50">
              <Paperclip className="h-2.5 w-2.5" />
              {attachmentCount}
            </span>
          )}
          {depCount > 0 && (
            <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground/50">
              <Link2 className="h-2.5 w-2.5" />
              {depCount}
            </span>
          )}
          {row.estimate > 0 && (
            <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground/50">
              <Clock className="h-2.5 w-2.5" />
              {row.estimate}h
            </span>
          )}
        </span>
      </div>
    );
  }

  if (col.type === "status") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs">
        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[value] || STATUS_COLORS.todo }} />
        <span className="capitalize">{typeof value === "string" ? value.replace(/[_-]/g, " ") : "todo"}</span>
      </span>
    );
  }

  if (col.type === "priority") {
    return (
      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium inline-block", PRIORITY_CLASSES[value] || PRIORITY_CLASSES.none)}>
        {value || "none"}
      </span>
    );
  }

  if (col.type === "assignee") {
    const assignees = (value || []).slice(0, 3);
    const overflow = (value || []).length - 3;
    if (!assignees.length) return <User className="h-3.5 w-3.5 text-muted-foreground/30" />;
    return (
      <div className="flex -space-x-1 items-center">
        {assignees.map((id: string, i: number) => (
          <div key={id || i} className="h-5 w-5 rounded-full ring-1 ring-background bg-primary/10 flex items-center justify-center text-[7px] font-medium text-primary">
            {id?.[0]?.toUpperCase() || "?"}
          </div>
        ))}
        {overflow > 0 && <div className="h-5 w-5 rounded-full ring-1 ring-background bg-muted flex items-center justify-center text-[7px] font-medium text-muted-foreground">+{overflow}</div>}
      </div>
    );
  }

  if (col.type === "date") {
    if (!value) return <span className="text-xs text-muted-foreground/40 italic">Set date</span>;
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <CalendarDays className="h-3 w-3" />
        {format(new Date(value), "MMM d")}
      </span>
    );
  }

  if (col.type === "progress") {
    const p = Math.min(100, Math.max(0, value || 0));
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${p}%` }} />
        </div>
        <span className="text-[10px] font-medium tabular-nums text-muted-foreground w-7 text-right">{p}%</span>
      </div>
    );
  }

  if (col.type === "project") {
    return (
      <Badge variant="secondary" className="text-[10px] rounded px-1.5 py-0 h-5 bg-primary/10 text-primary border-none font-normal">
        {value || "No Project"}
      </Badge>
    );
  }

  if (col.type === "sprint") {
    return <span className="text-xs text-muted-foreground">{value ? String(value).replace(/[_-]/g, " ") : "—"}</span>;
  }

  if (col.type === "milestone") {
    return (
      <Badge variant="outline" className="text-[10px] rounded px-1.5 py-0 h-5 font-normal">
        <Flag className="h-2.5 w-2.5 mr-0.5" />
        {value ? String(value).replace(/[_-]/g, " ") : "No Milestone"}
      </Badge>
    );
  }

  if (col.type === "labels" || col.type === "tags") {
    return (
      <div className="flex items-center gap-0.5 flex-wrap">
        {(value || []).slice(0, 2).map((t: string, i: number) => (
          <span key={i} className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">{t}</span>
        ))}
        {(value || []).length > 2 && <span className="text-[9px] text-muted-foreground">+{(value || []).length - 2}</span>}
      </div>
    );
  }

  if (col.type === "number" || col.type === "estimate" || col.type === "storyPoints") {
    return <span className="text-xs tabular-nums">{value ?? 0}</span>;
  }

  if (col.type === "boolean") {
    return (
      <div className={cn("h-4 w-7 rounded-full transition-colors", value ? "bg-primary" : "bg-muted")}>
        <div className={cn("h-3.5 w-3.5 rounded-full bg-white shadow transition-transform mt-0.5", value ? "translate-x-3.5" : "translate-x-0.5")} />
      </div>
    );
  }

  if (col.type === "color") {
    return (
      <div className="h-4 w-4 rounded-full border" style={value ? { backgroundColor: value } : { background: "linear-gradient(135deg, #e2e8f0, #94a3b8)" }} />
    );
  }

  if (col.type === "createdBy") {
    return <span className="text-xs text-muted-foreground">{value || "—"}</span>;
  }

  if (col.type === "updatedAt") {
    return <span className="text-xs text-muted-foreground tabular-nums">{value ? format(new Date(value), "MMM d") : "—"}</span>;
  }

  return <span className="text-xs truncate">{String(value ?? "")}</span>;
}

/* ─── Main Table View ─── */

interface TableViewProps {
  tasks: any[];
  columns?: Column[];
  workspaceId: string;
  projectId?: string;
  onSelectTask?: (task: any) => void;
  onTasksChange?: () => void;
}

export function TableView({ tasks: initialTasks, columns: customColumns, workspaceId, projectId, onSelectTask }: TableViewProps) {
  const queryClient = useQueryClient();
  const tableRef = useRef<HTMLDivElement>(null);
  const [activeCell, setActiveCell] = useState<CellPosition | null>(null);
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ col: string; dir: "asc" | "desc" }[]>([]);
  const [columns, setColumns] = useState<Column[]>(customColumns || DEFAULT_COLUMNS);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [groupBy, setGroupBy] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [lastClickedRow, setLastClickedRow] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; row?: any; col?: Column } | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [duplicatingRows, setDuplicatingRows] = useState<Set<string>>(new Set());
  const [filterRules, setFilterRules] = useState<{ id: string; column: string; operator: string; value: string; logic: "and" | "or" }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const resizingCol = useRef<string | null>(null);
  const resizeStart = useRef<{ x: number; width: number }>({ x: 0, width: 0 });
  const focusRef = useRef<HTMLInputElement>(null);
  const [tasks, setTasks] = useState(initialTasks);
  const undoHistory = useRef<{ tasks: any[]; label: string }[]>([]);
  const redoHistory = useRef<{ tasks: any[]; label: string }[]>([]);
  const MAX_HISTORY = 50;

  useEffect(() => { setTasks(initialTasks); }, [initialTasks]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setViewportHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pushUndo = useCallback((newTasks: any[], label: string) => {
    undoHistory.current = [...undoHistory.current.slice(-(MAX_HISTORY - 1)), { tasks: JSON.parse(JSON.stringify(tasks)), label }];
    redoHistory.current = [];
    setTasks(newTasks);
  }, [tasks]);

  const handleUndo = useCallback(() => {
    if (undoHistory.current.length === 0) return;
    const prev = undoHistory.current[undoHistory.current.length - 1];
    redoHistory.current = [...redoHistory.current, { tasks: JSON.parse(JSON.stringify(tasks)), label: prev.label }];
    undoHistory.current = undoHistory.current.slice(0, -1);
    setTasks(prev.tasks);
  }, [tasks]);

  const handleRedo = useCallback(() => {
    if (redoHistory.current.length === 0) return;
    const next = redoHistory.current[redoHistory.current.length - 1];
    undoHistory.current = [...undoHistory.current, { tasks: JSON.parse(JSON.stringify(tasks)), label: next.label }];
    redoHistory.current = redoHistory.current.slice(0, -1);
    setTasks(next.tasks);
  }, [tasks]);

  /* ─── Column widths ─── */
  const getColWidth = useCallback((col: Column) => columnWidths[col.id] || col.width, [columnWidths]);

  /* ─── Filtered + Sorted tasks ─── */
  const processedTasks = useMemo(() => {
    let result = [...tasks];

    // Apply search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        (t.title || "").toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        (t.status || "").toLowerCase().includes(q) ||
        (t.labels || []).some((l: string) => l.toLowerCase().includes(q)) ||
        (t.assigneeIds || []).some((id: string) => id.toLowerCase().includes(q))
      );
    }

    // Apply filters
    for (const rule of filterRules) {
      if (rule.logic === "and") {
        result = result.filter(t => {
          const cellVal = getCellValue(t, { id: rule.column, type: "text" } as Column);
          const strVal = String(cellVal ?? "").toLowerCase();
          const ruleVal = rule.value.toLowerCase();
          switch (rule.operator) {
            case "equals": return strVal === ruleVal;
            case "not_equals": return strVal !== ruleVal;
            case "contains": return strVal.includes(ruleVal);
            case "not_contains": return !strVal.includes(ruleVal);
            case "is_empty": return strVal === "" || cellVal == null;
            case "is_not_empty": return strVal !== "" && cellVal != null;
            default: return true;
          }
        });
      }
    }
    if (filterRules.some(r => r.logic === "or")) {
      const orRules = filterRules.filter(r => r.logic === "or");
      if (orRules.length > 0) {
        const orMatches = new Set<number>();
        result.forEach((t, i) => {
          for (const rule of orRules) {
            const cellVal = getCellValue(t, { id: rule.column, type: "text" } as Column);
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
            }
            if (match) { orMatches.add(i); break; }
          }
        });
        result = result.filter((_, i) => orMatches.has(i));
      }
    }

    // Apply sort
    if (sortConfig.length) {
      result.sort((a, b) => {
        for (const s of sortConfig) {
          let aVal = getCellValue(a, { id: s.col, type: "text" } as Column) ?? "";
          let bVal = getCellValue(b, { id: s.col, type: "text" } as Column) ?? "";
          if (s.col === "dueDate" || s.col === "startDate" || s.col === "updatedAt") {
            aVal = aVal ? new Date(aVal).getTime() : 0;
            bVal = bVal ? new Date(bVal).getTime() : 0;
          } else if (typeof aVal === "number") {
            aVal = aVal;
            bVal = bVal;
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
    return result;
  }, [tasks, searchQuery, sortConfig, filterRules]);

  /* ─── Grouped tasks ─── */
  const groupedTasks = useMemo(() => {
    if (!groupBy) return [{ key: "all", label: `All Tasks (${processedTasks.length})`, tasks: processedTasks }];
    const groups = new Map<string, any[]>();
    for (const t of processedTasks) {
      let key: string;
      if (groupBy === "status") key = t.status || "none";
      else if (groupBy === "priority") key = t.priority || "none";
      else if (groupBy === "assignee") { const ids = t.assigneeIds || []; key = ids.length ? ids[0] : "unassigned"; }
      else if (groupBy === "project") key = t.project?.name || t.projectId || "no-project";
      else if (groupBy === "sprint") key = t.sprint || t.sprintId || "no-sprint";
      else key = "all";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    }
    return Array.from(groups.entries()).map(([key, ts]) => ({ key, label: `${key.replace(/[_-]/g, " ")} (${ts.length})`, tasks: ts }));
  }, [processedTasks, groupBy]);

  /* ─── Visible columns ─── */
  const visibleColumns = useMemo(() => columns.filter(c => c.visible).sort((a, b) => a.order - b.order), [columns]);
  const pinnedCols = useMemo(() => visibleColumns.filter(c => c.pinned), [visibleColumns]);
  const scrollCols = useMemo(() => visibleColumns.filter(c => !c.pinned), [visibleColumns]);

  /* ─── Virtual list ─── */
  const flatItems = useMemo(() => {
    const items: Array<{ type: "group" | "row"; key: string; offset: number; height: number; data: any }> = [];
    let offset = 0;
    let globalIdx = 0;
    for (const group of groupedTasks) {
      const isCollapsed = collapsedGroups.has(group.key);
      const isGrouped = groupBy !== null && group.key !== "all";
      if (isGrouped) {
        items.push({ type: "group", key: `g:${group.key}`, offset, height: GROUP_HEADER_HEIGHT, data: { group, isCollapsed } });
        offset += GROUP_HEADER_HEIGHT;
      }
      if (!isCollapsed) {
        for (const task of group.tasks) {
          items.push({ type: "row", key: `r:${task.id}`, offset, height: ROW_HEIGHT, data: { task, globalIdx } });
          globalIdx++;
          offset += ROW_HEIGHT;
        }
      }
    }
    return items;
  }, [groupedTasks, collapsedGroups, groupBy]);

  const totalHeight = useMemo(() => flatItems.reduce((s, i) => s + i.height, 0), [flatItems]);

  const visibleItems = useMemo(() => {
    const result: typeof flatItems = [];
    for (const item of flatItems) {
      const itemBottom = item.offset + item.height;
      if (item.offset > scrollTop + viewportHeight + OVERSCAN * ROW_HEIGHT) break;
      if (itemBottom < scrollTop - OVERSCAN * ROW_HEIGHT) continue;
      result.push(item);
    }
    return result;
  }, [flatItems, scrollTop, viewportHeight]);

  const allCollapsed = useMemo(() => groupedTasks.every(g => collapsedGroups.has(g.key)), [groupedTasks, collapsedGroups]);

  const rafRef = useRef<number | null>(null);
  const handleScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (scrollRef.current) setScrollTop(scrollRef.current.scrollTop);
    });
  }, []);

  /* ─── Mutations ─── */
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => { invalidateTaskCaches({ queryClient, workspaceId, projectId }); },
    onError: () => toast.error("Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}?workspaceId=${workspaceId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => { invalidateTaskCaches({ queryClient, workspaceId, projectId }); toast.success("Deleted"); },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Create failed");
      return res.json();
    },
    onSuccess: () => { invalidateTaskCaches({ queryClient, workspaceId, projectId }); },
    onError: () => toast.error("Failed to create"),
  });

  /* ─── Cell operations ─── */
  const saveCell = useCallback((rowIdx: number, col: Column, value: any) => {
    if (!editingCell) return;
    const row = groupedTasks.flatMap(g => g.tasks)[rowIdx];
    if (!row) return;
    const payload: any = {};
    if (col.type === "title") payload.title = value;
    else if (col.type === "status") payload.status = value;
    else if (col.type === "priority") payload.priority = value;
    else if (col.type === "assignee") payload.assigneeIds = value;
    else if (col.type === "dueDate") payload.dueDate = value;
    else if (col.type === "startDate") payload.startDate = value;
    else if (col.type === "progress") payload.progress = value;
    else if (col.type === "number" || col.type === "estimate") payload[col.id] = value;
    else if (col.type === "labels") payload.tagIds = value;
    else if (col.type === "project") payload.projectId = value;
    else if (col.type === "boolean") payload[col.id] = value;
    else if (col.type === "color") payload.color = value;
    else if (col.type === "sprint") payload.sprintId = value;
    else if (col.type === "milestone") payload.milestoneId = value;
    else payload.fieldValues = { ...(row.fieldValues || {}), [col.id]: value };
    updateMutation.mutate({ id: row.id, data: payload });
    setEditingCell(null);
  }, [editingCell, groupedTasks, updateMutation]);

  const startEditing = useCallback((rowIdx: number, colIdx: number) => {
    if (visibleColumns[colIdx]?.type === "checkbox") return;
    setActiveCell({ row: rowIdx, col: colIdx });
    setEditingCell({ row: rowIdx, col: colIdx });
    setEditValue(getCellValue(
      groupedTasks.flatMap(g => g.tasks)[rowIdx],
      visibleColumns[colIdx]
    ));
  }, [visibleColumns, groupedTasks]);

  const toggleRowSelection = useCallback((id: string, e: React.MouseEvent) => {
    if (e.shiftKey && lastClickedRow) {
      const allIds = groupedTasks.flatMap(g => g.tasks).map(t => t.id);
      const start = allIds.indexOf(lastClickedRow);
      const end = allIds.indexOf(id);
      if (start !== -1 && end !== -1) {
        const [from, to] = start < end ? [start, end] : [end, start];
        const range = allIds.slice(from, to + 1);
        setSelectedRows(prev => {
          const next = new Set(prev);
          range.forEach(r => next.add(r));
          return next;
        });
      }
    } else if (e.ctrlKey || e.metaKey) {
      setSelectedRows(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    } else {
      setSelectedRows(new Set([id]));
    }
    setLastClickedRow(id);
  }, [groupedTasks, lastClickedRow]);

  /* ─── Clipboard ─── */
  const copyToClipboard = useCallback(() => {
    if (selectedRows.size === 0 && !activeCell) return;
    let rowsToCopy: any[];
    if (selectedRows.size > 0) {
      rowsToCopy = groupedTasks.flatMap(g => g.tasks).filter(t => selectedRows.has(t.id));
    } else if (activeCell) {
      rowsToCopy = [groupedTasks.flatMap(g => g.tasks)[activeCell.row]];
    } else return;
    const csv = serializeToCSV(rowsToCopy, visibleColumns, getCellValue);
    navigator.clipboard.writeText(csv).then(() => toast.success("Copied")).catch(() => toast.error("Copy failed"));
  }, [selectedRows, activeCell, groupedTasks, visibleColumns]);

  const pasteFromClipboard = useCallback(async () => {
    const text = await navigator.clipboard.readText().catch(() => "");
    if (!text) return;
    const rows = parseCSVToRows(text, visibleColumns);
    if (rows.length === 0) return;
    const allTasks = groupedTasks.flatMap(g => g.tasks);
    const targetRow = activeCell ? allTasks[activeCell.row] : allTasks[0];
    if (!targetRow) return;
    const rowData = rows[0];
    const payload: any = {};
    visibleColumns.forEach(col => {
      if (col.type === "checkbox" || col.type === "title") return;
      if (rowData[col.id] !== undefined && rowData[col.id] !== "") {
        const val = rowData[col.id];
        if (col.type === "date" || col.type === "dueDate" || col.type === "startDate") {
          const parsed = new Date(val);
          if (!isNaN(parsed.getTime())) payload[col.id] = parsed.toISOString();
        } else if (col.type === "number" || col.type === "estimate" || col.type === "progress") {
          payload[col.id] = Number(val) || 0;
        } else if (col.type === "assignee" || col.type === "labels") {
          payload[col.id] = val.split(",").map((s: string) => s.trim()).filter(Boolean);
        } else if (col.type === "boolean") {
          payload[col.id] = val === "true" || val === "yes" || val === "1";
        } else {
          payload[col.id] = val;
        }
      }
    });
    if (Object.keys(payload).length > 0) {
      updateMutation.mutate({ id: targetRow.id, data: payload });
      toast.success("Pasted");
    }
  }, [activeCell, groupedTasks, visibleColumns, updateMutation]);

  /* ─── Duplicate rows ─── */
  const duplicateSelected = useCallback(() => {
    if (selectedRows.size === 0) return;
    const toDuplicate = groupedTasks.flatMap(g => g.tasks).filter(t => selectedRows.has(t.id));
    for (const row of toDuplicate) {
      const { id, createdAt, updatedAt, _count, ...rest } = row;
      createMutation.mutate({ ...rest, title: `${rest.title || "Task"} (copy)`, workspaceId });
    }
    setSelectedRows(new Set());
    toast.success(`Duplicating ${toDuplicate.length} task(s)`);
  }, [selectedRows, groupedTasks, createMutation, workspaceId]);

  /* ─── Keyboard nav ─── */
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (contextMenu) { setContextMenu(null); return; }
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    const totalRows = groupedTasks.reduce((s, g) => s + (collapsedGroups.has(g.key) ? 0 : g.tasks.length), 0);

    // Ctrl/Cmd shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case "z": if (e.shiftKey) { e.preventDefault(); handleRedo(); } else { e.preventDefault(); handleUndo(); } return;
        case "y": e.preventDefault(); handleRedo(); return;
        case "c": e.preventDefault(); copyToClipboard(); return;
        case "v": e.preventDefault(); pasteFromClipboard(); return;
        case "x": e.preventDefault(); copyToClipboard(); if (activeCell) { const col = visibleColumns[activeCell.col]; if (col.type === "title" || col.type === "text") saveCell(activeCell.row, col, ""); } return;
        case "a": e.preventDefault(); setSelectedRows(new Set(groupedTasks.flatMap(g => g.tasks).map(t => t.id))); setBulkMode(true); return;
      }
    }

    if (!activeCell || totalRows === 0) { if (e.key === "ArrowDown" || e.key === "Tab") { e.preventDefault(); setActiveCell({ row: 0, col: 0 }); } return; }

    const maxCol = visibleColumns.length - 1;
    const maxRow = totalRows - 1;

    switch (e.key) {
      case "ArrowUp": e.preventDefault(); setActiveCell(p => p ? { ...p, row: Math.max(0, p.row - 1) } : p); break;
      case "ArrowDown": e.preventDefault(); setActiveCell(p => p ? { ...p, row: Math.min(maxRow, p.row + 1) } : p); break;
      case "ArrowLeft": e.preventDefault(); setActiveCell(p => p ? { ...p, col: Math.max(0, p.col - 1) } : p); break;
      case "ArrowRight": e.preventDefault(); setActiveCell(p => p ? { ...p, col: Math.min(maxCol, p.col + 1) } : p); break;
      case "Tab": e.preventDefault(); setActiveCell(p => p ? { ...p, col: e.shiftKey ? Math.max(0, p.col - 1) : Math.min(maxCol, p.col + 1) } : p); break;
      case "Enter": {
        e.preventDefault();
        if (editingCell) {
          const col = visibleColumns[editingCell.col];
          saveCell(editingCell.row, col, editValue);
        } else if (activeCell) {
          const col = visibleColumns[activeCell.col];
          if (col.type === "title") { onSelectTask?.(groupedTasks.flatMap(g => g.tasks)[activeCell.row]); }
          else if (col.type !== "checkbox") { startEditing(activeCell.row, activeCell.col); }
        }
        break;
      }
      case "Escape": setEditingCell(null); break;
      case " ": {
        if (!editingCell && activeCell && visibleColumns[activeCell.col]?.type === "checkbox") {
          const row = groupedTasks.flatMap(g => g.tasks)[activeCell.row];
          if (row) updateMutation.mutate({ id: row.id, data: { status: row.status === "done" ? "todo" : "done" } });
        }
        e.preventDefault();
        break;
      }
      case "o": case "O": {
        e.preventDefault();
        if (activeCell) {
          const row = groupedTasks.flatMap(g => g.tasks)[activeCell.row];
          if (row) onSelectTask?.(row);
        }
        break;
      }
      case "Delete": case "Backspace": {
        if (!editingCell && activeCell) {
          const col = visibleColumns[activeCell.col];
          if (col.type === "title" || col.type === "text" || col.type === "number" || col.type === "estimate") {
            saveCell(activeCell.row, col, col.type === "number" ? 0 : "");
          }
        }
        break;
      }
    }
  }, [activeCell, editingCell, visibleColumns, groupedTasks, collapsedGroups, contextMenu, onSelectTask, saveCell, editValue, startEditing, updateMutation, copyToClipboard, pasteFromClipboard, handleUndo, handleRedo]);

  /* ─── Resize columns ─── */
  const handleResizeStart = useCallback((e: React.MouseEvent, colId: string) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX;
    resizingCol.current = colId;
    resizeStart.current = { x: startX, width: getColWidth(columns.find(c => c.id === colId)!) };
    const handleMouseMove = (ev: globalThis.MouseEvent) => {
      if (!resizingCol.current) return;
      const diff = ev.clientX - resizeStart.current.x;
      const newWidth = Math.max(40, resizeStart.current.width + diff);
      setColumnWidths(prev => ({ ...prev, [resizingCol.current!]: newWidth }));
    };
    const handleMouseUp = () => { resizingCol.current = null; document.removeEventListener("mousemove", handleMouseMove); document.removeEventListener("mouseup", handleMouseUp); };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [columns, getColWidth]);

  /* ─── Toggle sort ─── */
  const toggleSort = useCallback((colId: string) => {
    setSortConfig(prev => {
      if (prev.length && prev[0].col === colId) {
        return prev[0].dir === "asc" ? [{ col: colId, dir: "desc" }] : [];
      }
      return [{ col: colId, dir: "asc" }];
    });
  }, []);

  /* ─── Multi-column sort ─── */
  const addSortLevel = useCallback(() => {
    setSortConfig(prev => {
      const availableCols = visibleColumns.filter(c => c.type !== "checkbox").map(c => c.id);
      const used = new Set(prev.map(s => s.col));
      const next = availableCols.find(c => !used.has(c));
      if (next) return [...prev, { col: next, dir: "asc" as const }];
      return prev;
    });
  }, [visibleColumns]);

  /* ─── Column visibility toggle ─── */
  const toggleColumnVisibility = useCallback((colId: string) => {
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, visible: !c.visible } : c));
  }, []);

  /* ─── Column pin toggle ─── */
  const toggleColumnPin = useCallback((colId: string) => {
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, pinned: !c.pinned } : c));
  }, []);

  /* ─── Add filter rule ─── */
  const addFilterRule = useCallback((logic: "and" | "or") => {
    const firstCol = visibleColumns.find(c => c.type !== "checkbox");
    setFilterRules(prev => [...prev, { id: Math.random().toString(36).slice(2), column: firstCol?.id || "status", operator: "equals", value: "", logic }]);
  }, [visibleColumns]);

  /* ─── Update filter rule ─── */
  const updateFilterRule = useCallback((id: string, updates: Partial<{ column: string; operator: string; value: string; logic: "and" | "or" }>) => {
    setFilterRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  /* ─── Remove filter rule ─── */
  const removeFilterRule = useCallback((id: string) => {
    setFilterRules(prev => prev.filter(r => r.id !== id));
  }, []);

  return (
    <div className="flex flex-col h-full" ref={tableRef} tabIndex={-1} onKeyDown={handleKeyDown}>
      {/* ─── Toolbar ─── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/20 shrink-0">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {bulkMode && selectedRows.size > 0 ? (
            <span className="font-medium text-foreground">{selectedRows.size} selected</span>
          ) : (
            <span>{tasks.length} items</span>
          )}
          {sortConfig.length > 0 && (
            <span className="flex items-center gap-1 ml-2">
              <ArrowUpDown className="h-3 w-3" />
              {sortConfig.map((s, i) => (
                <span key={s.col} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                  {columns.find(c => c.id === s.col)?.name || s.col} {s.dir === "asc" ? "↑" : "↓"}
                  {i < sortConfig.length - 1 && ","}
                </span>
              ))}
            </span>
          )}
          {/* Undo/Redo buttons */}
          <button onClick={handleUndo} disabled={undoHistory.current.length === 0}
            className={cn("h-5 w-5 rounded flex items-center justify-center", undoHistory.current.length > 0 ? "text-muted-foreground hover:text-foreground hover:bg-muted" : "text-muted-foreground/20")}>
            <Undo2 className="h-3 w-3" />
          </button>
          <button onClick={handleRedo} disabled={redoHistory.current.length === 0}
            className={cn("h-5 w-5 rounded flex items-center justify-center", redoHistory.current.length > 0 ? "text-muted-foreground hover:text-foreground hover:bg-muted" : "text-muted-foreground/20")}>
            <Redo2 className="h-3 w-3" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          {/* Bulk actions toolbar */}
          {selectedRows.size > 0 && (
            <>
              <div className="flex items-center gap-1.5 mr-2">
                <Select onValueChange={(v) => { selectedRows.forEach(id => updateMutation.mutate({ id, data: { status: v } })); }}>
                  <SelectTrigger className="h-6 text-[10px] rounded px-1.5 w-20"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    {["todo", "in_progress", "done", "review", "backlog"].map(s => (
                      <SelectItem key={s} value={s} className="text-[11px] capitalize">{s.replace(/[_-]/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select onValueChange={(v) => { selectedRows.forEach(id => updateMutation.mutate({ id, data: { priority: v } })); }}>
                  <SelectTrigger className="h-6 text-[10px] rounded px-1.5 w-20"><SelectValue placeholder="Priority" /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_VALUES.map(p => (<SelectItem key={p} value={p} className="text-[11px] capitalize">{p}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5"
                  onClick={duplicateSelected}>
                  <Copy className="h-3 w-3 mr-0.5" /> Duplicate
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5 text-destructive"
                  onClick={() => { selectedRows.forEach(id => deleteMutation.mutate(id)); setSelectedRows(new Set()); }}>
                  <Trash2 className="h-3 w-3 mr-0.5" /> Delete
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5"
                  onClick={() => { setSelectedRows(new Set()); setBulkMode(false); }}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="h-4 w-px bg-border" />
            </>
          )}
          <div className="relative w-32">
            <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="h-6 pl-6 text-[10px] rounded" />
          </div>
          <Select value={groupBy || "none"} onValueChange={(v) => setGroupBy(v === "none" ? null : v)}>
            <SelectTrigger className="h-6 text-[10px] rounded px-1.5 w-20">
              <LayoutList className="h-3 w-3 mr-0.5" />
              <SelectValue placeholder="Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-[11px]">No Grouping</SelectItem>
              <SelectItem value="status" className="text-[11px]">Status</SelectItem>
              <SelectItem value="priority" className="text-[11px]">Priority</SelectItem>
              <SelectItem value="assignee" className="text-[11px]">Assignee</SelectItem>
              <SelectItem value="project" className="text-[11px]">Project</SelectItem>
              <SelectItem value="sprint" className="text-[11px]">Sprint</SelectItem>
            </SelectContent>
          </Select>
          {sortConfig.length > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5" onClick={addSortLevel}>
              + Sort
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5"
            onClick={() => setShowFilter(!showFilter)}>
            <Filter className={cn("h-3 w-3 mr-0.5", filterRules.length > 0 && "text-primary")} /> Filter{filterRules.length > 0 && ` (${filterRules.length})`}
          </Button>
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-1.5"
            onClick={() => setShowColumnManager(!showColumnManager)}>
            <Columns3 className="h-3 w-3 mr-0.5" /> Columns
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 rounded-md p-0"
            onClick={() => {
              fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: "New task", workspaceId, status: "todo", priority: "medium" }),
              }).then(() => { invalidateTaskCaches({ queryClient, workspaceId, projectId }); });
            }}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ─── Column manager ─── */}
      {showColumnManager && (
        <div className="border-b bg-muted/10 px-3 py-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-medium text-muted-foreground">Columns:</span>
            {columns.sort((a, b) => a.order - b.order).map(col => (
              <label key={col.id} className="flex items-center gap-1 text-[10px] cursor-pointer hover:text-foreground">
                <input type="checkbox" checked={col.visible}
                  onChange={() => toggleColumnVisibility(col.id)}
                  className="h-3 w-3 rounded border-muted" />
                {col.name || (col.type === "title" ? "Task" : col.type)}
                <button onClick={() => toggleColumnPin(col.id)}
                  className={cn("text-[9px] px-1 rounded", col.pinned ? "text-primary bg-primary/10" : "text-muted-foreground/40 hover:text-muted-foreground")}
                  title={col.pinned ? "Unpin" : "Pin"}>
                  📌
                </button>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ─── Filter bar ─── */}
      {showFilter && (
        <div className="flex flex-col gap-1 px-3 py-1.5 border-b bg-muted/10 text-[10px]">
          {filterRules.length === 0 && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">No filters</span>
              <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => addFilterRule("and")}>+ Add Filter</Button>
            </div>
          )}
          {filterRules.map((rule, i) => (
            <div key={rule.id} className="flex items-center gap-1.5">
              {i > 0 && (
                <Select value={rule.logic} onValueChange={(v) => updateFilterRule(rule.id, { logic: v as "and" | "or" })}>
                  <SelectTrigger className="h-5 text-[9px] rounded w-12"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="and" className="text-[10px]">AND</SelectItem>
                    <SelectItem value="or" className="text-[10px]">OR</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Select value={rule.column} onValueChange={(v) => updateFilterRule(rule.id, { column: v })}>
                <SelectTrigger className="h-5 text-[9px] rounded w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {visibleColumns.filter(c => c.type !== "checkbox").map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-[10px]">{c.name || c.type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={rule.operator} onValueChange={(v) => updateFilterRule(rule.id, { operator: v })}>
                <SelectTrigger className="h-5 text-[9px] rounded w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals" className="text-[10px]">Equals</SelectItem>
                  <SelectItem value="not_equals" className="text-[10px]">Not equals</SelectItem>
                  <SelectItem value="contains" className="text-[10px]">Contains</SelectItem>
                  <SelectItem value="not_contains" className="text-[10px]">Not contains</SelectItem>
                  <SelectItem value="is_empty" className="text-[10px]">Is empty</SelectItem>
                  <SelectItem value="is_not_empty" className="text-[10px]">Not empty</SelectItem>
                </SelectContent>
              </Select>
              <Input value={rule.value} onChange={(e) => updateFilterRule(rule.id, { value: e.target.value })}
                placeholder="Value" className="h-5 text-[9px] rounded w-28" />
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeFilterRule(rule.id)}>
                <X className="h-2.5 w-2.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => addFilterRule("and")}>+</Button>
            </div>
          ))}
          {filterRules.length > 0 && (
            <div className="flex items-center gap-2 mt-0.5">
              <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5 text-muted-foreground"
                onClick={() => setFilterRules([])}>Clear all</Button>
            </div>
          )}
        </div>
      )}

      {/* ─── Table header ─── */}
      <div className="flex border-b bg-muted/30 sticky top-0 z-10 shrink-0">
        {pinnedCols.map(col => (
          <div key={col.id} className="flex items-center gap-0.5 px-2 py-1.5 border-r shrink-0 bg-muted/30 sticky left-0 z-10"
            style={{ width: getColWidth(col), minWidth: getColWidth(col) }}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, col }); }}>
            {col.type === "checkbox" ? (
              <span className="text-[10px] font-semibold text-muted-foreground">{col.name || ""}</span>
            ) : col.type === "title" ? (
              <button onClick={() => toggleSort(col.id)}
                className={cn("text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:text-foreground",
                  sortConfig.some(s => s.col === col.id) && "text-foreground")}>
                Task
                {sortConfig.some(s => s.col === col.id) && (
                  <ArrowUpDown className={cn("h-2.5 w-2.5", sortConfig.find(s => s.col === col.id)?.dir === "desc" && "rotate-180")} />
                )}
              </button>
            ) : (
              <button onClick={() => toggleSort(col.id)}
                className={cn("text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:text-foreground",
                  sortConfig.some(s => s.col === col.id) && "text-foreground")}>
                {col.name}
                {sortConfig.some(s => s.col === col.id) && (
                  <ArrowUpDown className={cn("h-2.5 w-2.5", sortConfig.find(s => s.col === col.id)?.dir === "desc" && "rotate-180")} />
                )}
              </button>
            )}
            <div className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/30 group z-20"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleResizeStart(e as any, col.id); }}>
              <div className="h-full w-0.5 mx-auto transition-colors group-hover:bg-primary/50" />
            </div>
          </div>
        ))}
        {scrollCols.map(col => (
          <div key={col.id} className="flex items-center gap-0.5 px-2 py-1.5 border-r shrink-0"
            style={{ width: getColWidth(col), minWidth: getColWidth(col) }}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, col }); }}>
            <button onClick={() => toggleSort(col.id)}
              className={cn("text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:text-foreground",
                sortConfig.some(s => s.col === col.id) && "text-foreground")}>
              {col.name}
              {sortConfig.some(s => s.col === col.id) && (
                <ArrowUpDown className={cn("h-2.5 w-2.5", sortConfig.find(s => s.col === col.id)?.dir === "desc" && "rotate-180")} />
              )}
            </button>
            <div className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/30 group z-20"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleResizeStart(e as any, col.id); }}>
              <div className="h-full w-0.5 mx-auto transition-colors group-hover:bg-primary/50" />
            </div>
          </div>
        ))}
        <div className="flex-1 min-w-[30px]" />
      </div>

      {/* ─── Body (virtualized) ─── */}
      <div ref={scrollRef} className="flex-1 overflow-auto" onScroll={handleScroll}>
        <div style={{ height: totalHeight, position: "relative" }}>
          {visibleItems.map(item => {
            if (item.type === "group") {
              const { group, isCollapsed } = item.data;
              const isGrouped = groupBy !== null && group.key !== "all";
              if (!isGrouped) return null;
              return (
                <div key={item.key}
                  className="flex items-center gap-2 px-3 py-1 border-b bg-muted/10 cursor-pointer"
                  style={{ position: "absolute", top: item.offset, left: 0, right: 0, height: item.height }}
                  onClick={() => setCollapsedGroups(prev => { const next = new Set(prev); if (next.has(group.key)) next.delete(group.key); else next.add(group.key); return next; })}>
                  {isCollapsed ? <ChevronRight className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                  <span className="text-[11px] font-semibold capitalize">{group.key.replace(/[_-]/g, " ")}</span>
                  <span className="text-[10px] text-muted-foreground">{group.tasks.length}</span>
                </div>
              );
            }

            const { task, globalIdx } = item.data;
            const isSelected = selectedRows.has(task.id);
            const isActive = activeCell?.row === globalIdx;

            return (
              <div key={item.key}
                className={cn("flex border-b hover:bg-muted/10 transition-colors group/row relative",
                  isSelected && "bg-primary/5 hover:bg-primary/8",
                  isActive && editingCell ? null : isActive && "bg-muted/20",
                )}
                style={{ position: "absolute", top: item.offset, left: 0, right: 0, height: item.height }}
                onClick={(e) => {
                  toggleRowSelection(task.id, e as any);
                  const target = e.target as HTMLElement;
                  const cellEl = target.closest("[data-col-idx]");
                  if (cellEl) {
                    const colIdx = parseInt(cellEl.getAttribute("data-col-idx") || "0");
                    setActiveCell({ row: globalIdx, col: colIdx });
                    const col = visibleColumns[colIdx];
                    if (col && (col.type === "status" || col.type === "priority" || col.type === "progress" || col.type === "boolean")) {
                      startEditing(globalIdx, colIdx);
                    }
                  }
                }}
                onDoubleClick={(e) => {
                  const target = e.target as HTMLElement;
                  const cellEl = target.closest("[data-col-idx]");
                  if (cellEl) {
                    const colIdx = parseInt(cellEl.getAttribute("data-col-idx") || "0");
                    startEditing(globalIdx, colIdx);
                  }
                }}
                onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, row: task }); }}>
                {/* Drag handle */}
                <div className="flex items-center justify-center w-5 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/20 hover:text-muted-foreground/50 transition-colors">
                  <GripVertical className="h-3.5 w-3.5" />
                </div>

                {/* Progress bar under row */}
                {task.progress > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-secondary/40 pointer-events-none z-[1]">
                    <div className="h-full bg-primary/50 transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, task.progress))}%` }} />
                  </div>
                )}

                {task.status === "done" && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-emerald-500/3 pointer-events-none" />
                )}

                {/* Pinned cells */}
                {pinnedCols.map((col, colIdx) => {
                  const value = getCellValue(task, col);
                  const isEditing = editingCell?.row === globalIdx && editingCell?.col === colIdx;
                  return (
                    <div key={col.id} data-col-idx={colIdx}
                      className={cn("px-2 py-1.5 text-xs border-r shrink-0 bg-card sticky left-0 z-[1] group/cell transition-colors",
                        isActive && !isEditing && "bg-muted/30",
                        isEditing && "bg-muted/40")}
                      style={{ width: getColWidth(col), minWidth: getColWidth(col) }}>
                      {isEditing ? (
                        <EditCell col={col} value={value} onSave={(v) => saveCell(globalIdx, col, v)} onCancel={() => setEditingCell(null)} inputRef={focusRef} />
                      ) : (
                        <CellDisplay col={col} value={value} row={task}
                          onClick={() => {
                            if (col.type === "checkbox") {
                              updateMutation.mutate({ id: task.id, data: { status: task.status === "done" ? "todo" : "done" } });
                            } else if (col.type === "title") {
                              onSelectTask?.(task);
                            } else { startEditing(globalIdx, colIdx); }
                          }} />
                      )}
                    </div>
                  );
                })}

                {/* Scrollable cells */}
                {scrollCols.map((col, scrollIdx) => {
                  const colIdx = pinnedCols.length + scrollIdx;
                  const value = getCellValue(task, col);
                  const isEditing = editingCell?.row === globalIdx && editingCell?.col === colIdx;
                  return (
                    <div key={col.id} data-col-idx={colIdx}
                      className={cn("px-2 py-1.5 text-xs border-r shrink-0 group/cell transition-colors",
                        isActive && !isEditing && "bg-muted/30",
                        isEditing && "bg-muted/40")}
                      style={{ width: getColWidth(col), minWidth: getColWidth(col) }}>
                      {isEditing ? (
                        <EditCell col={col} value={value} onSave={(v) => saveCell(globalIdx, col, v)} onCancel={() => setEditingCell(null)} inputRef={focusRef} />
                      ) : (
                        <CellDisplay col={col} value={value} row={task}
                          onClick={() => {
                            if (col.type === "checkbox") {
                              updateMutation.mutate({ id: task.id, data: { status: task.status === "done" ? "todo" : "done" } });
                            } else { startEditing(globalIdx, colIdx); }
                          }} />
                      )}
                    </div>
                  );
                })}

                {/* Action buttons on hover */}
                <div className="flex items-center gap-1 px-2 shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); onSelectTask?.(task); }}
                    className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted">
                    <ExternalLink className="h-3 w-3" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(task.id); }}
                    className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {allCollapsed && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            All groups are collapsed
          </div>
        )}
      </div>

      {/* ─── Context menu ─── */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
          <div className="fixed z-50 w-44 rounded-lg border bg-popover shadow-xl p-1" style={{ left: contextMenu.x, top: contextMenu.y }}>
            {contextMenu.col ? (
              <>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-muted text-left"
                  onClick={() => { toggleSort(contextMenu.col!.id); setContextMenu(null); }}>
                  <ArrowUp className="h-3 w-3" /> Sort Asc
                </button>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-muted text-left"
                  onClick={() => { toggleSort(contextMenu.col!.id); setContextMenu(null); }}>
                  <ArrowDown className="h-3 w-3" /> Sort Desc
                </button>
                <div className="h-px bg-border my-1" />
                <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-muted text-left"
                  onClick={() => { toggleColumnPin(contextMenu.col!.id); setContextMenu(null); }}>
                  <ChevronsUpDown className="h-3 w-3" /> {contextMenu.col.pinned ? "Unpin" : "Pin Left"}
                </button>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-muted text-left"
                  onClick={() => { toggleColumnVisibility(contextMenu.col!.id); setContextMenu(null); }}>
                  <X className="h-3 w-3" /> Hide
                </button>
                <div className="h-px bg-border my-1" />
                <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-muted text-left"
                  onClick={() => { setFilterRules(prev => [...prev, { id: Math.random().toString(36).slice(2), column: contextMenu.col!.id, operator: "equals", value: "", logic: "and" }]); setShowFilter(true); setContextMenu(null); }}>
                  <Filter className="h-3 w-3" /> Filter by {contextMenu.col.name}
                </button>
              </>
            ) : contextMenu.row ? (
              <>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-muted text-left"
                  onClick={() => { onSelectTask?.(contextMenu.row); setContextMenu(null); }}>
                  <ExternalLink className="h-3 w-3" /> Open Task
                </button>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-muted text-left"
                  onClick={() => { updateMutation.mutate({ id: contextMenu.row.id, data: { status: contextMenu.row.status === "done" ? "todo" : "done" } }); setContextMenu(null); }}>
                  {contextMenu.row?.status === "done" ? "Mark Incomplete" : "Mark Complete"}
                </button>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-muted text-left"
                  onClick={() => { duplicateSelected(); setContextMenu(null); }}>
                  <Copy className="h-3 w-3" /> Duplicate
                </button>
                <div className="h-px bg-border my-1" />
                <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-muted text-left"
                  onClick={() => { setSelectedRows(new Set([contextMenu.row.id])); copyToClipboard(); setContextMenu(null); }}>
                  <Copy className="h-3 w-3" /> Copy Row
                </button>
                <div className="h-px bg-border my-1" />
                <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-muted text-left text-destructive"
                  onClick={() => { deleteMutation.mutate(contextMenu.row.id); setContextMenu(null); }}>
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
