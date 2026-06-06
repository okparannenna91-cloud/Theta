"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  GripVertical, ChevronDown, ChevronRight, Plus, Trash2,
  Settings, ArrowUpDown, Pin, EyeOff, Copy, Archive,
  MessageSquare, Paperclip, Clock, Link2, ListChecks,
  AlertTriangle, User, CalendarDays, Hash, FileText,
  CheckCircle2, Flag, Tag, Star, Edit3
} from "lucide-react";
import { ColumnValue, type ColumnDef, type ColumnType } from "./column-types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface TableViewProps {
  boardId: string;
  tasks: any[];
  columns: any[];
  groups: any[];
  onSelectTask: (task: any) => void;
  workspaceId: string;
}

export default function TableView({
  boardId,
  tasks,
  columns,
  groups,
  onSelectTask,
  workspaceId
}: TableViewProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ taskId: string; columnId: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [columnSettings, setColumnSettings] = useState<any>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  const sortedTasks = [...tasks].sort((a, b) => {
    if (!sortColumn) return 0;
    const aVal = a[sortColumn] ?? a.fieldValues?.[sortColumn] ?? "";
    const bVal = b[sortColumn] ?? b.fieldValues?.[sortColumn] ?? "";
    const cmp = String(aVal).localeCompare(String(bVal));
    return sortDirection === "asc" ? cmp : -cmp;
  });

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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateFieldMutation = useMutation({
    mutationFn: async ({ taskId, field, value }: { taskId: string; field: string; value: any }) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [field]: value,
          fieldValues: { [field]: value }
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Cell updated");
    },
    onError: () => toast.error("Failed to update cell"),
  });

  const handleCellEdit = (taskId: string, column: any, value: string) => {
    const field = column.columnType === "text" ? "title" :
      column.columnType === "number" ? "estimatedHours" :
      column.columnType === "date" ? "dueDate" :
      column.columnType === "status" ? "status" :
      column.columnType === "priority" ? "priority" : null;

    if (field) {
      updateFieldMutation.mutate({ taskId, field, value });
    }
    setEditingCell(null);
  };

  const columnDefs: ColumnDef[] = columns.map((c: any) => ({
    id: c.id,
    name: c.name,
    columnType: (c.columnType || "text") as ColumnType,
    order: c.order,
    width: c.width || 200,
    visible: c.visible !== false,
    pinned: c.pinned || false,
    color: c.color,
    settings: c.settings,
  }));

  const visibleColumns = columnDefs.filter(c => c.visible);
  const pinnedColumns = visibleColumns.filter(c => c.pinned);
  const scrollColumns = visibleColumns.filter(c => !c.pinned);

  const subtasksMap = new Map<string, any[]>();
  sortedTasks.forEach(t => {
    if (t.parentId) {
      if (!subtasksMap.has(t.parentId)) subtasksMap.set(t.parentId, []);
      subtasksMap.get(t.parentId)!.push(t);
    }
  });
  const rootTasks = sortedTasks.filter(t => !t.parentId);

  const renderCell = (task: any, col: ColumnDef) => {
    const field = col.columnType === "text" ? "title" :
      col.columnType === "number" ? "estimatedHours" :
      col.columnType === "date" ? "dueDate" :
      col.columnType === "status" ? "status" :
      col.columnType === "priority" ? "priority" : "";
    const value = task[field] ?? task.fieldValues?.[col.id];

    const isEditing = editingCell?.taskId === task.id && editingCell?.columnId === col.id;

    if (isEditing) {
      return (
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => handleCellEdit(task.id, col, editValue)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCellEdit(task.id, col, editValue);
            if (e.key === "Escape") setEditingCell(null);
          }}
          className="h-7 text-xs border-primary focus-visible:ring-0 rounded"
        />
      );
    }

    if (col.columnType === "text" && col.order === 0) {
      return (
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => toggleRow(task.id)} className="flex-shrink-0 text-slate-400 hover:text-slate-600">
            {subtasksMap.has(task.id) ? (
              expandedRows.has(task.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
            ) : <div className="w-3" />}
          </button>
          <GripVertical className="h-3 w-3 text-slate-300 flex-shrink-0 cursor-grab" />
          {task.coverImage && (
            <div className="h-6 w-6 rounded flex-shrink-0 overflow-hidden">
              <img src={task.coverImage} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <span
            className="text-xs font-medium truncate cursor-pointer hover:text-primary transition-colors"
            onDoubleClick={() => {
              setEditingCell({ taskId: task.id, columnId: col.id });
              setEditValue(task.title);
            }}
            onClick={() => onSelectTask(task)}
          >
            {task.title}
          </span>
          {task.isMilestone && <Flag className="h-3 w-3 text-amber-500 flex-shrink-0" />}
        </div>
      );
    }

    return (
      <div
        className="min-h-[28px] flex items-center cursor-default"
        onDoubleClick={() => {
          if (col.columnType === "text" || col.columnType === "number") {
            setEditingCell({ taskId: task.id, columnId: col.id });
            setEditValue(value ?? "");
          }
        }}
      >
        <ColumnValue column={col} value={value} task={task} />
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
            "flex border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group",
            isSelected && "bg-muted/50 dark:bg-primary/10",
            task.priority === "high" && "border-l-2 border-l-red-400",
            task.priority === "medium" && "border-l-2 border-l-amber-400",
            depth > 0 && "bg-slate-50/30 dark:bg-slate-900/20"
          )}
          style={{ paddingLeft: `${depth * 24}px` }}
        >
          <div className="flex items-center gap-1 px-2 w-10 flex-shrink-0">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleSelect(task.id)}
              className="h-3 w-3 rounded border-slate-300"
            />
            {task.subtasks?.length > 0 && (
              <button onClick={() => toggleRow(task.id)} className="text-slate-400">
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            )}
          </div>

          {pinnedColumns.map(col => (
            <div
              key={col.id}
              className="px-3 py-2 text-xs truncate flex-shrink-0 border-r border-slate-100 dark:border-slate-800/50 bg-white dark:bg-slate-950 sticky left-0 z-10"
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
              <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                <MessageSquare className="h-3 w-3" />{task._count.comments}
              </span>
            )}
            {task.attachments && <Paperclip className="h-3 w-3 text-slate-400" />}
            {task.subtasks?.length > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
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
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Hash className="h-3 w-3" />
          <span className="font-medium">{tasks.length} items</span>
          {selectedRows.size > 0 && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0">
              {selectedRows.size} selected
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold gap-1">
            <Plus className="h-3 w-3" /> Add Item
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold gap-1">
            <Settings className="h-3 w-3" /> Columns
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-full inline-block">
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 sticky top-0 z-20">
            <div className="w-10 flex-shrink-0" />

            {pinnedColumns.map(col => (
              <div
                key={col.id}
                className="px-3 py-2 text-[10px] font-bold text-slate-500 flex items-center gap-1 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 border-r border-slate-100 dark:border-slate-800/50 bg-slate-50/80 dark:bg-slate-900/80 sticky left-0 z-20"
                style={{ width: col.width || 200, minWidth: col.width || 200 }}
                onClick={() => toggleSort(col.id)}
              >
                <Pin className="h-2.5 w-2.5" />
                {col.name}
                {sortColumn === col.id && (
                  <ArrowUpDown className={cn("h-3 w-3", sortDirection === "desc" && "rotate-180")} />
                )}
              </div>
            ))}

            {scrollColumns.map(col => (
              <div
                key={col.id}
                className="px-3 py-2 text-[10px] font-bold text-slate-500 flex items-center gap-1 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200"
                style={{ width: col.width || 200, minWidth: col.width || 200 }}
                onClick={() => toggleSort(col.id)}
              >
                {col.name}
                {sortColumn === col.id && (
                  <ArrowUpDown className={cn("h-3 w-3", sortDirection === "desc" && "rotate-180")} />
                )}
              </div>
            ))}

            <div className="flex-1 min-w-[60px]" />
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/30">
            {rootTasks.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <ListChecks className="h-12 w-12 mb-4 opacity-30" />
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
            <DialogTitle>Column Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500">Width</label>
              <Input type="number" defaultValue={columnSettings?.width || 200} className="h-9 mt-1" />
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" className="text-xs gap-2"><EyeOff className="h-3 w-3" /> Hide</Button>
              <Button variant="outline" size="sm" className="text-xs gap-2"><Pin className="h-3 w-3" /> Pin</Button>
              <Button variant="outline" size="sm" className="text-xs gap-2 text-red-500"><Trash2 className="h-3 w-3" /> Delete</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
