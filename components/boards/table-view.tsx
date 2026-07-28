"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { invalidateTaskCaches } from "@/lib/invalidate-task-caches";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GripVertical, ChevronDown, ChevronRight, Plus, Trash2,
  Settings, ArrowUpDown, Pin, EyeOff, Copy, Archive,
  MessageSquare, Paperclip, Clock, Link2, ListChecks,
  User, CalendarDays, Flag, Tag, Star, ExternalLink,
} from "lucide-react";
import type { Column } from "@/components/table/types";
import { DEFAULT_COLUMNS } from "@/components/table/constants";
import { getCellValue, buildCellPayload, getStatusColor, getPriorityMeta } from "@/components/table/cell-utils";
import { getEditorForColumn } from "@/components/table/cell-editors";
import { CellDisplay } from "@/components/table/cell-display";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface TableViewProps {
  boardId: string;
  tasks: any[];
  columns: any[];
  groups: any[];
  onSelectTask?: (task: any) => void;
  workspaceId: string;
  projectId?: string | null;
}

function mapBoardColumnToTableColumn(col: any): Column {
  const typeMap: Record<string, Column["type"]> = {
    text: "text",
    number: "number",
    date: "date",
    status: "status",
    priority: "priority",
    people: "assignee",
    tags: "tags",
    checkbox: "checkbox",
    progress: "progress",
    colorPicker: "color",
    dropdown: "text",
    timeline: "date",
    email: "text",
    phone: "text",
    link: "text",
    location: "text",
    country: "text",
    rating: "number",
    vote: "number",
    timeTracking: "number",
    autoNumber: "number",
    formula: "number",
    button: "text",
    week: "date",
    aiSummary: "text",
    aiText: "text",
    aiSentiment: "text",
    aiLabel: "labels",
    aiExtraction: "text",
    aiPrioritization: "priority",
    aiWriting: "text",
    aiTranslation: "text",
    combo: "text",
    connectBoard: "text",
    mirror: "text",
    dependencies: "text",
    files: "text",
    worldClock: "text",
    milestone: "milestone",
    sprint: "sprint",
  };
  return {
    id: col.id,
    name: col.name,
    type: typeMap[col.columnType] || "text",
    width: col.width || 200,
    visible: col.visible !== false,
    pinned: col.pinned || false,
    order: col.order || 0,
    options: col.settings?.options,
    color: col.color,
  };
}

export default function TableView({
  boardId, tasks, columns: boardColumns, groups,
  onSelectTask, workspaceId, projectId,
}: TableViewProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ taskId: string; columnId: string } | null>(null);
  const [columnSettings, setColumnSettings] = useState<any>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const columns: Column[] = useMemo(() => boardColumns.map(mapBoardColumnToTableColumn), [boardColumns]);
  const tableColumns = useMemo(() => {
    const hasCheckbox = columns.some(c => c.id === "__checkbox");
    const titleCol = columns.find(c => c.type === "text" && c.order === 0);
    const base = hasCheckbox ? columns : [
      { id: "__checkbox", name: "", type: "checkbox" as const, width: 36, visible: true, pinned: true, order: -1 },
      ...columns,
    ];
    return base.map(c => ({
      ...c,
      pinned: c.pinned || c.id === "__checkbox" || (titleCol ? c.id === titleCol.id : false),
    }));
  }, [columns]);

  const visibleColumns = tableColumns.filter(c => c.visible);
  const pinnedColumns = visibleColumns.filter(c => c.pinned);
  const scrollColumns = visibleColumns.filter(c => !c.pinned);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (!sortColumn) return 0;
      const col = columns.find(c => c.id === sortColumn);
      const aVal = col ? getCellValue(a, col) : (a[sortColumn] ?? a.fieldValues?.[sortColumn] ?? "");
      const bVal = col ? getCellValue(b, col) : (b[sortColumn] ?? b.fieldValues?.[sortColumn] ?? "");
      if (sortColumn === "dueDate" || sortColumn === "createdAt" || sortColumn === "startDate") {
        const aNum = aVal ? new Date(aVal).getTime() : 0;
        const bNum = bVal ? new Date(bVal).getTime() : 0;
        return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [tasks, sortColumn, sortDirection, columns]);

  const toggleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const updateFieldMutation = useMutation({
    mutationFn: async ({ taskId, field, value, existingFieldValues, columnId }: {
      taskId: string; field: string | null; value: any;
      existingFieldValues?: Record<string, any>; columnId?: string;
    }) => {
      const merged = { ...(existingFieldValues || {}) };
      const body: any = { fieldValues: merged };
      if (field && columnId) {
        body[field] = value;
        merged[columnId] = value;
      } else if (field) {
        body[field] = value;
        merged[field] = value;
      } else if (columnId) {
        merged[columnId] = value;
      }
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      invalidateTaskCaches({ queryClient, workspaceId, projectId });
      toast.success("Cell updated");
    },
    onError: () => toast.error("Failed to update cell"),
  });

  const handleCellEdit = (taskId: string, col: Column, value: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !col) return;
    const payload = buildCellPayload(task, col, value);
    const existingFieldValues = task.fieldValues || {};
    const body: any = { ...payload };
    if (!payload.title && !payload.status && !payload.priority && !payload.assigneeIds && !payload.projectId) {
      body.fieldValues = { ...existingFieldValues, [col.id]: value };
    } else if (col.type === "project" || col.type === "labels" || col.type === "sprint" || col.type === "milestone" || col.type === "tags") {
      body.fieldValues = { ...existingFieldValues, [col.id]: value };
    }
    updateFieldMutation.mutate({ taskId, field: null, value, existingFieldValues, columnId: col.id });
    setEditingCell(null);
  };

  const subtasksMap = useMemo(() => {
    const map = new Map<string, any[]>();
    sortedTasks.forEach(t => {
      if (t.parentId) {
        if (!map.has(t.parentId)) map.set(t.parentId, []);
        map.get(t.parentId)!.push(t);
      }
    });
    return map;
  }, [sortedTasks]);
  const rootTasks = sortedTasks.filter(t => !t.parentId);

  const getColumnValue = (task: any, col: Column): any => {
    return getCellValue(task, col);
  };

  const renderCell = (task: any, col: Column) => {
    const value = getColumnValue(task, col);
    const isEditing = editingCell?.taskId === task.id && editingCell?.columnId === col.id;
    const editableTypes = new Set<Column["type"]>(["text", "number", "date", "status", "priority", "labels", "assignee", "color", "progress", "boolean", "sprint", "milestone", "tags"]);

    if (isEditing) {
      return getEditorForColumn(
        col,
        value,
        (v) => handleCellEdit(task.id, col, v),
        () => setEditingCell(null),
        inputRef
      );
    }

    return (
      <div
        className="min-h-[28px] flex items-center cursor-default"
        onDoubleClick={() => {
          if (editableTypes.has(col.type)) {
            setEditingCell({ taskId: task.id, columnId: col.id });
          }
        }}
      >
        <CellDisplay
          col={col}
          value={value}
          row={task}
          onClick={() => {
            if (col.type === "checkbox") {
              handleCellEdit(task.id, col, value ? "" : "true");
            }
          }}
        />
      </div>
    );
  };

  const renderRow = (task: any, depth: number = 0) => {
    const subtasks = subtasksMap.get(task.id) || [];
    const isExpanded = expandedRows.has(task.id);
    const isSelected = selectedRows.has(task.id);

    return (
      <div key={task.id}>
        <div
          className={cn(
            "flex border-b border-border/50 hover:bg-muted/20 transition-colors group relative",
            isSelected && "bg-primary/[0.03]",
            task.priority === "high" && "border-l-2 border-l-red-400",
            task.priority === "medium" && "border-l-2 border-l-amber-400",
            depth > 0 && "bg-muted/10"
          )}
          style={{ paddingLeft: `${depth * 24}px` }}
        >
          {task.progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-secondary/40 pointer-events-none">
              <div className="h-full bg-primary/50 transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, task.progress))}%` }} />
            </div>
          )}
          <div className="flex items-center gap-1 px-2 w-10 flex-shrink-0">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleSelect(task.id)}
              className="h-3 w-3 rounded border-muted"
            />
            {subtasks.length > 0 && (
              <button onClick={() => toggleRow(task.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            )}
          </div>

          {pinnedColumns.map(col => (
            <div
              key={col.id}
              className="px-3 py-2 text-xs truncate flex-shrink-0 border-r border-border/50 bg-card sticky left-0 z-10"
              style={{ width: col.width || 200, minWidth: col.width || 200 }}
            >
              {renderCell(task, col)}
            </div>
          ))}

          {scrollColumns.map(col => (
            <div
              key={col.id}
              className="px-3 py-2 text-xs truncate"
              style={{ width: col.width || 200, minWidth: col.width || 200 }}
            >
              {renderCell(task, col)}
            </div>
          ))}

          <div className="flex items-center gap-1 px-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {task._count?.comments > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <MessageSquare className="h-3 w-3" />{task._count.comments}
              </span>
            )}
            {task.attachments && <Paperclip className="h-3 w-3 text-muted-foreground" />}
            {task.subtasks?.length > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <ListChecks className="h-3 w-3" />
                {task.subtasks.filter((s: any) => s.completed).length}/{task.subtasks.length}
              </span>
            )}
          </div>
        </div>

        {isExpanded && subtasks.map((st: any) => renderRow(st, depth + 1))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ListChecks className="h-3 w-3" />
          <span className="font-medium">{tasks.length} items</span>
          {selectedRows.size > 0 && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0 rounded-md">
              {selectedRows.size} selected
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost" size="sm" className="h-7 text-[10px] gap-1 rounded-md"
            onClick={() => {
              fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: "New item",
                  workspaceId,
                  boardId,
                  columnId: boardColumns[0]?.id,
                  priority: "medium",
                  status: "todo",
                }),
              }).then(() => invalidateTaskCaches({ queryClient, workspaceId, projectId }));
            }}
          >
            <Plus className="h-3 w-3" /> Add Item
          </Button>
          <Button
            variant="ghost" size="sm" className="h-7 text-[10px] gap-1 rounded-md"
            onClick={() => setColumnSettings(boardColumns[0])}
          >
            <Settings className="h-3 w-3" /> Columns
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-full inline-block">
          <div className="flex border-b border-border bg-muted/20 sticky top-0 z-20">
            <div className="w-10 flex-shrink-0" />

            {pinnedColumns.map(col => (
              <div
                key={col.id}
                className="px-3 py-2 text-[10px] font-semibold text-muted-foreground flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors border-r border-border/50 bg-muted/20 sticky left-0 z-20"
                style={{ width: col.width || 200, minWidth: col.width || 200 }}
                onClick={() => toggleSort(col.id)}
              >
                {col.pinned && <Pin className="h-2.5 w-2.5" />}
                {col.name || (col.type === "checkbox" ? "" : col.type)}
                {sortColumn === col.id && (
                  <ArrowUpDown className={cn("h-3 w-3 transition-transform", sortDirection === "desc" && "rotate-180")} />
                )}
              </div>
            ))}

            {scrollColumns.map(col => (
              <div
                key={col.id}
                className="px-3 py-2 text-[10px] font-semibold text-muted-foreground flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                style={{ width: col.width || 200, minWidth: col.width || 200 }}
                onClick={() => toggleSort(col.id)}
              >
                {col.name || col.type}
                {sortColumn === col.id && (
                  <ArrowUpDown className={cn("h-3 w-3 transition-transform", sortDirection === "desc" && "rotate-180")} />
                )}
              </div>
            ))}

            <div className="flex-1 min-w-[60px]" />
          </div>

          <div className="divide-y divide-border/30">
            {rootTasks.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
                <ListChecks className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-sm font-medium">This table is empty</p>
                <p className="text-xs mt-1">Click &ldquo;Add Item&rdquo; to create your first row</p>
              </div>
            ) : (
              rootTasks.map(task => renderRow(task))
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!columnSettings} onOpenChange={() => setColumnSettings(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Column Settings — {columnSettings?.name || ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Width</label>
              <Input
                type="number"
                defaultValue={columnSettings?.width || 200}
                className="h-9 mt-1"
                onBlur={(e) => {
                  const col = columnSettings;
                  if (!col) return;
                  fetch(`/api/columns/${col.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ width: parseInt(e.target.value) || 200 }),
                  }).then(() => invalidateTaskCaches({ queryClient, workspaceId, projectId }));
                }}
              />
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline" size="sm" className="text-xs gap-2 rounded-md"
                onClick={() => {
                  const col = columnSettings;
                  if (!col) return;
                  fetch(`/api/columns/${col.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ visible: false }),
                  }).then(() => invalidateTaskCaches({ queryClient, workspaceId, projectId }));
                }}
              >
                <EyeOff className="h-3 w-3" /> Hide
              </Button>
              <Button
                variant="outline" size="sm" className="text-xs gap-2 rounded-md"
                onClick={() => {
                  const col = columnSettings;
                  if (!col) return;
                  fetch(`/api/columns/${col.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ pinned: !col.pinned }),
                  }).then(() => invalidateTaskCaches({ queryClient, workspaceId, projectId }));
                }}
              >
                <Pin className="h-3 w-3" /> Pin
              </Button>
              <Button
                variant="outline" size="sm" className="text-xs gap-2 rounded-md text-destructive"
                onClick={() => {
                  const col = columnSettings;
                  if (!col) return;
                  fetch(`/api/columns/${col.id}`, { method: "DELETE" })
                    .then(() => { invalidateTaskCaches({ queryClient, workspaceId, projectId }); setColumnSettings(null); });
                }}
              >
                <Trash2 className="h-3 w-3" /> Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}