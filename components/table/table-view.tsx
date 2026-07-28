"use client";

import React, {
  useState, useCallback, useRef, useEffect, useMemo,
} from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { invalidateTaskCaches } from "@/lib/invalidate-task-caches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  GripVertical, Plus, Trash2, ExternalLink, Search, X, MoreHorizontal,
  Undo2, Redo2, ArrowUpDown, Filter, Columns3, LayoutList, Copy,
  Download, Archive, CheckSquare, Square, ChevronDown, ChevronRight,
  Upload,
} from "lucide-react";
import type { Column, CellPosition, SortConfig, FilterRule, FlatItem } from "./types";
import {
  DEFAULT_COLUMNS, ROW_HEIGHT, GROUP_HEADER_HEIGHT, OVERSCAN, MAX_HISTORY,
} from "./constants";
import {
  getCellValue, buildCellPayload, serializeToCSV, parseCSVToRows,
  parsePastedValue, filterTasks, sortTasks, searchTasks, groupTasks,
  generateId,
} from "./cell-utils";
import { getEditorForColumn } from "./cell-editors";
import { CellDisplay } from "./cell-display";

interface TableViewProps {
  tasks: any[];
  columns?: Column[];
  workspaceId: string;
  projectId?: string;
  onSelectTask?: (task: any) => void;
  onTasksChange?: () => void;
  availableMembers?: { id: string; name: string; image?: string }[];
  availableProjects?: { id: string; name: string }[];
  availableLabels?: string[];
}

export function TableView({
  tasks: initialTasks,
  columns: customColumns,
  workspaceId,
  projectId,
  onSelectTask,
  availableMembers,
  availableProjects,
  availableLabels,
}: TableViewProps) {
  const queryClient = useQueryClient();
  const tableRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const rafRef = useRef<number | null>(null);

  /* ─── State ─── */
  const [tasks, setTasks] = useState(initialTasks);
  const [columns, setColumns] = useState<Column[]>(customColumns || DEFAULT_COLUMNS);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [activeCell, setActiveCell] = useState<CellPosition | null>(null);
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupBy, setGroupBy] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
  const [showFilter, setShowFilter] = useState(false);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; row?: any; col?: Column } | null>(null);
  const [lastClickedRow, setLastClickedRow] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<{ tasks: any[]; label: string }[]>([]);
  const [redoStack, setRedoStack] = useState<{ tasks: any[]; label: string }[]>([]);

  useEffect(() => { setTasks(initialTasks); }, [initialTasks]);

  /* ─── Viewport tracking ─── */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setViewportHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ─── Scroll handler ─── */
  const handleScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (scrollRef.current) setScrollTop(scrollRef.current.scrollTop);
    });
  }, []);

  /* ─── Undo/Redo ─── */
  const pushUndo = useCallback((newTasks: any[], label: string) => {
    setUndoStack(prev => [...prev.slice(-(MAX_HISTORY - 1)), { tasks: JSON.parse(JSON.stringify(tasks)), label }]);
    setRedoStack([]);
    setTasks(newTasks);
  }, [tasks]);

  const handleUndo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      const entry = prev[prev.length - 1];
      setRedoStack(r => [...r, { tasks: JSON.parse(JSON.stringify(tasks)), label: entry.label }]);
      setTasks(entry.tasks);
      return prev.slice(0, -1);
    });
  }, [tasks]);

  const handleRedo = useCallback(() => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev;
      const entry = prev[prev.length - 1];
      setUndoStack(u => [...u, { tasks: JSON.parse(JSON.stringify(tasks)), label: entry.label }]);
      setTasks(entry.tasks);
      return prev.slice(0, -1);
    });
  }, [tasks]);

  /* ─── Optimistic update mutation ─── */
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      invalidateTaskCaches({ queryClient, workspaceId, projectId });
    },
    onError: (_err, variables) => {
      setTasks(prev => prev.map(t => t.id === variables.id ? { ...t } : t));
      toast.error("Failed to update");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}?workspaceId=${workspaceId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      invalidateTaskCaches({ queryClient, workspaceId, projectId });
      toast.success("Deleted");
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Create failed");
      return res.json();
    },
    onSuccess: () => {
      invalidateTaskCaches({ queryClient, workspaceId, projectId });
    },
    onError: () => toast.error("Failed to create"),
  });

  /* ─── Column widths ─── */
  const getColWidth = useCallback((col: Column) => columnWidths[col.id] || col.width, [columnWidths]);

  /* ─── Processed tasks ─── */
  const processedTasks = useMemo(() => {
    let result = searchTasks(tasks, searchQuery);
    result = filterTasks(result, filterRules, columns);
    result = sortTasks(result, sortConfig, columns);
    return result;
  }, [tasks, searchQuery, filterRules, sortConfig, columns]);

  /* ─── Grouped tasks ─── */
  const groupedTasks = useMemo(() => groupTasks(processedTasks, groupBy), [processedTasks, groupBy]);

  /* ─── Visible columns ─── */
  const visibleColumns = useMemo(() => columns.filter(c => c.visible).sort((a, b) => a.order - b.order), [columns]);
  const pinnedCols = useMemo(() => visibleColumns.filter(c => c.pinned), [visibleColumns]);
  const scrollCols = useMemo(() => visibleColumns.filter(c => !c.pinned), [visibleColumns]);

  /* ─── Virtual list ─── */
  const flatItems: FlatItem[] = useMemo(() => {
    const items: FlatItem[] = [];
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
    const result: FlatItem[] = [];
    for (const item of flatItems) {
      const itemBottom = item.offset + item.height;
      if (item.offset > scrollTop + viewportHeight + OVERSCAN * ROW_HEIGHT) break;
      if (itemBottom < scrollTop - OVERSCAN * ROW_HEIGHT) continue;
      result.push(item);
    }
    return result;
  }, [flatItems, scrollTop, viewportHeight]);

  const allCollapsed = useMemo(() => groupedTasks.every(g => collapsedGroups.has(g.key)), [groupedTasks, collapsedGroups]);

  /* ─── Optimistic save ─── */
  const saveCell = useCallback((rowIdx: number, col: Column, value: any) => {
    if (!editingCell) return;
    const task = groupedTasks.flatMap(g => g.tasks)[rowIdx];
    if (!task) return;

    const payload = buildCellPayload(task, col, value);

    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, ...payload } : t
    ));
    pushUndo(tasks, `Edit ${col.name}`);

    updateMutation.mutate({ id: task.id, data: payload });
    setEditingCell(null);
  }, [editingCell, groupedTasks, tasks, updateMutation, pushUndo]);

  /* ─── Start editing ─── */
  const startEditing = useCallback((rowIdx: number, colIdx: number) => {
    const col = visibleColumns[colIdx];
    if (!col || col.type === "checkbox") return;
    const row = groupedTasks.flatMap(g => g.tasks)[rowIdx];
    if (!row) return;
    setActiveCell({ row: rowIdx, col: colIdx });
    setEditingCell({ row: rowIdx, col: colIdx });
    setEditValue(getCellValue(row, col));
  }, [visibleColumns, groupedTasks]);

  /* ─── Select cell (single click) ─── */
  const selectCell = useCallback((rowIdx: number, colIdx: number) => {
    setActiveCell({ row: rowIdx, col: colIdx });
    setEditingCell(null);
  }, []);

  /* ─── Row selection ─── */
  const toggleRowSelection = useCallback((id: string, e: React.MouseEvent) => {
    if (e.shiftKey && lastClickedRow) {
      const allIds = groupedTasks.flatMap(g => g.tasks).map(t => t.id);
      const start = allIds.indexOf(lastClickedRow);
      const end = allIds.indexOf(id);
      if (start !== -1 && end !== -1) {
        const [from, to] = start < end ? [start, end] : [end, start];
        setSelectedRows(prev => {
          const next = new Set(prev);
          allIds.slice(from, to + 1).forEach(r => next.add(r));
          return next;
        });
      }
    } else if (e.ctrlKey || e.metaKey) {
      setSelectedRows(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
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
    const csv = serializeToCSV(rowsToCopy, visibleColumns);
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
        const val = parsePastedValue(col, rowData[col.id]);
        if (val !== undefined) Object.assign(payload, buildCellPayload(targetRow, col, val));
      }
    });
    if (Object.keys(payload).length > 0) {
      setTasks(prev => prev.map(t => t.id === targetRow.id ? { ...t, ...payload } : t));
      updateMutation.mutate({ id: targetRow.id, data: payload });
      toast.success("Pasted");
    }
  }, [activeCell, groupedTasks, visibleColumns, updateMutation]);

  /* ─── Duplicate ─── */
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

  /* ─── Export ─── */
  const exportCSV = useCallback(() => {
    const data = selectedRows.size > 0
      ? groupedTasks.flatMap(g => g.tasks).filter(t => selectedRows.has(t.id))
      : processedTasks;
    const csv = serializeToCSV(data, visibleColumns);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `theta-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported");
  }, [selectedRows, groupedTasks, processedTasks, visibleColumns]);

  /* ─── Keyboard navigation ─── */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (contextMenu) { setContextMenu(null); return; }
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    const totalRows = groupedTasks.reduce((s, g) => s + (collapsedGroups.has(g.key) ? 0 : g.tasks.length), 0);

    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case "z": e.preventDefault(); if (e.shiftKey) handleRedo(); else handleUndo(); return;
        case "y": e.preventDefault(); handleRedo(); return;
        case "c": e.preventDefault(); copyToClipboard(); return;
        case "v": e.preventDefault(); pasteFromClipboard(); return;
        case "x": e.preventDefault(); copyToClipboard(); setTasks(prev => prev.map(t => selectedRows.has(t.id) ? { ...t, title: "" } : t)); return;
        case "a": e.preventDefault(); setSelectedRows(new Set(groupedTasks.flatMap(g => g.tasks).map(t => t.id))); return;
        case "s": e.preventDefault(); exportCSV(); return;
      }
    }

    if (!activeCell || totalRows === 0) {
      if (e.key === "ArrowDown" || e.key === "Tab") { e.preventDefault(); setActiveCell({ row: 0, col: 0 }); }
      return;
    }

    const maxCol = visibleColumns.length - 1;
    const maxRow = totalRows - 1;

    switch (e.key) {
      case "ArrowUp": e.preventDefault(); setActiveCell(p => p ? { ...p, row: Math.max(0, p.row - 1) } : p); setEditingCell(null); break;
      case "ArrowDown": e.preventDefault(); setActiveCell(p => p ? { ...p, row: Math.min(maxRow, p.row + 1) } : p); setEditingCell(null); break;
      case "ArrowLeft": e.preventDefault(); setActiveCell(p => p ? { ...p, col: Math.max(0, p.col - 1) } : p); setEditingCell(null); break;
      case "ArrowRight": e.preventDefault(); setActiveCell(p => p ? { ...p, col: Math.min(maxCol, p.col + 1) } : p); setEditingCell(null); break;
      case "Tab": e.preventDefault(); setActiveCell(p => p ? { ...p, col: e.shiftKey ? Math.max(0, p.col - 1) : Math.min(maxCol, p.col + 1) } : p); setEditingCell(null); break;
      case "Enter": {
        e.preventDefault();
        if (editingCell) {
          const col = visibleColumns[editingCell.col];
          saveCell(editingCell.row, col, editValue);
        } else if (activeCell) {
          startEditing(activeCell.row, activeCell.col);
        }
        break;
      }
      case "Escape": setEditingCell(null); break;
      case " ": {
        if (!editingCell && activeCell && visibleColumns[activeCell.col]?.type === "checkbox") {
          const row = groupedTasks.flatMap(g => g.tasks)[activeCell.row];
          if (row) {
            const newStatus = row.status === "done" ? "todo" : "done";
            setTasks(prev => prev.map(t => t.id === row.id ? { ...t, status: newStatus } : t));
            updateMutation.mutate({ id: row.id, data: { status: newStatus } });
          }
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
          const row = groupedTasks.flatMap(g => g.tasks)[activeCell.row];
          if (row && (col.type === "title" || col.type === "text" || col.type === "number" || col.type === "estimate")) {
            const val = col.type === "number" || col.type === "estimate" ? 0 : "";
            setTasks(prev => prev.map(t => t.id === row.id ? { ...t, [col.id === "title" ? "title" : col.id]: val } : t));
            updateMutation.mutate({ id: row.id, data: { [col.id === "title" ? "title" : col.id]: val } });
          }
        }
        break;
      }
    }
  }, [activeCell, editingCell, visibleColumns, groupedTasks, collapsedGroups, contextMenu, onSelectTask, saveCell, editValue, startEditing, updateMutation, copyToClipboard, pasteFromClipboard, handleUndo, handleRedo, exportCSV, selectedRows, tasks]);

  /* ─── Column resize ─── */
  const resizingCol = useRef<string | null>(null);
  const resizeStart = useRef<{ x: number; width: number }>({ x: 0, width: 0 });

  const handleResizeStart = useCallback((e: React.MouseEvent, col: Column) => {
    e.preventDefault(); e.stopPropagation();
    resizingCol.current = col.id;
    resizeStart.current = { x: e.clientX, width: getColWidth(col) };
    const handleMouseMove = (ev: globalThis.MouseEvent) => {
      if (!resizingCol.current) return;
      const diff = ev.clientX - resizeStart.current.x;
      setColumnWidths(prev => ({ ...prev, [resizingCol.current!]: Math.max(40, resizeStart.current.width + diff) }));
    };
    const handleMouseUp = () => {
      resizingCol.current = null;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [getColWidth]);

  /* ─── Sorting ─── */
  const toggleSort = useCallback((colId: string) => {
    setSortConfig(prev => {
      if (prev.length && prev[0].col === colId) {
        return prev[0].dir === "asc" ? [{ col: colId, dir: "desc" }] : [];
      }
      return [{ col: colId, dir: "asc" }];
    });
  }, []);

  const addSortLevel = useCallback(() => {
    setSortConfig(prev => {
      const availableCols = visibleColumns.filter(c => c.type !== "checkbox").map(c => c.id);
      const used = new Set(prev.map(s => s.col));
      const next = availableCols.find(c => !used.has(c));
      if (next) return [...prev, { col: next, dir: "asc" as const }];
      return prev;
    });
  }, [visibleColumns]);

  const removeSortLevel = useCallback((colId: string) => {
    setSortConfig(prev => prev.filter(s => s.col !== colId));
  }, []);

  /* ─── Column management ─── */
  const toggleColumnVisibility = useCallback((colId: string) => {
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, visible: !c.visible } : c));
  }, []);

  const toggleColumnPin = useCallback((colId: string) => {
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, pinned: !c.pinned } : c));
  }, []);

  /* ─── Filter rules ─── */
  const addFilterRule = useCallback((logic: "and" | "or") => {
    const firstCol = visibleColumns.find(c => c.type !== "checkbox");
    setFilterRules(prev => [...prev, { id: generateId(), column: firstCol?.id || "status", operator: "equals", value: "", logic }]);
  }, [visibleColumns]);

  const updateFilterRule = useCallback((id: string, updates: Partial<FilterRule>) => {
    setFilterRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const removeFilterRule = useCallback((id: string) => {
    setFilterRules(prev => prev.filter(r => r.id !== id));
  }, []);

  /* ─── Create task ─── */
  const createTask = useCallback(() => {
    createMutation.mutate({ title: "New task", workspaceId, projectId, status: "todo", priority: "medium" });
  }, [createMutation, workspaceId, projectId]);

  return (
    <div className="flex flex-col h-full select-none" ref={tableRef} tabIndex={-1} onKeyDown={handleKeyDown}>
      {/* ─── Toolbar ─── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-background shrink-0 z-20">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">{processedTasks.length}</span> items
          {selectedRows.size > 0 && (
            <span className="font-medium text-primary ml-1">({selectedRows.size} selected)</span>
          )}
          {sortConfig.length > 0 && (
            <span className="flex items-center gap-1 ml-2">
              <ArrowUpDown className="h-3 w-3" />
              {sortConfig.map((s, i) => (
                <span key={s.col} className="inline-flex items-center gap-0.5 text-[10px] bg-muted px-1.5 py-0.5 rounded-md">
                  {columns.find(c => c.id === s.col)?.name || s.col}
                  <span className="text-[9px]">{s.dir === "asc" ? "↑" : "↓"}</span>
                  <button onClick={() => removeSortLevel(s.col)} className="hover:text-destructive ml-0.5">✕</button>
                </span>
              ))}
            </span>
          )}
          <div className="flex items-center gap-0.5 ml-1">
            <button onClick={handleUndo} disabled={undoStack.length === 0}
              className={cn("h-5 w-5 rounded flex items-center justify-center transition-colors",
                undoStack.length > 0 ? "text-muted-foreground hover:text-foreground hover:bg-muted" : "text-muted-foreground/20 cursor-default")}>
              <Undo2 className="h-3 w-3" />
            </button>
            <button onClick={handleRedo} disabled={redoStack.length === 0}
              className={cn("h-5 w-5 rounded flex items-center justify-center transition-colors",
                redoStack.length > 0 ? "text-muted-foreground hover:text-foreground hover:bg-muted" : "text-muted-foreground/20 cursor-default")}>
              <Redo2 className="h-3 w-3" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Bulk action toolbar (floating) */}
          {selectedRows.size > 0 && (
            <div className="flex items-center gap-1.5 mr-2 px-2 py-0.5 bg-primary/5 rounded-lg border">
              <span className="text-[10px] font-medium text-primary mr-1">{selectedRows.size} selected</span>
              <Select onValueChange={(v) => { selectedRows.forEach(id => updateMutation.mutate({ id, data: { status: v } })); }}>
                <SelectTrigger className="h-5 text-[9px] rounded px-1.5 w-16 border-0 bg-background/80"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  {["todo", "in_progress", "done", "review", "backlog"].map(s => (
                    <SelectItem key={s} value={s} className="text-[10px] capitalize">{s.replace(/[_-]/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select onValueChange={(v) => { selectedRows.forEach(id => updateMutation.mutate({ id, data: { priority: v } })); }}>
                <SelectTrigger className="h-5 text-[9px] rounded px-1.5 w-16 border-0 bg-background/80"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  {["urgent", "high", "medium", "low", "none"].map(p => (
                    <SelectItem key={p} value={p} className="text-[10px] capitalize">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={duplicateSelected}>
                <Copy className="h-2.5 w-2.5 mr-0.5" /> Duplicate
              </Button>
              <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={exportCSV}>
                <Download className="h-2.5 w-2.5 mr-0.5" /> Export
              </Button>
              <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5 text-destructive"
                onClick={() => { selectedRows.forEach(id => deleteMutation.mutate(id)); setSelectedRows(new Set()); }}>
                <Trash2 className="h-2.5 w-2.5 mr-0.5" /> Delete
              </Button>
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0"
                onClick={() => setSelectedRows(new Set())}>
                <X className="h-2.5 w-2.5" />
              </Button>
            </div>
          )}
          {/* Search */}
          <div className="relative w-28">
            <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="h-6 pl-6 text-[10px] rounded-md" />
          </div>
          {/* Group */}
          <Select value={groupBy || "none"} onValueChange={(v) => setGroupBy(v === "none" ? null : v)}>
            <SelectTrigger className="h-6 text-[10px] rounded-md px-1.5 w-16">
              <LayoutList className="h-3 w-3 mr-0.5" />
              <SelectValue placeholder="Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-[10px]">No Group</SelectItem>
              <SelectItem value="status" className="text-[10px]">Status</SelectItem>
              <SelectItem value="priority" className="text-[10px]">Priority</SelectItem>
              <SelectItem value="assignee" className="text-[10px]">Assignee</SelectItem>
              <SelectItem value="project" className="text-[10px]">Project</SelectItem>
              <SelectItem value="sprint" className="text-[10px]">Sprint</SelectItem>
            </SelectContent>
          </Select>
          {/* Multi-sort button */}
          {sortConfig.length > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-[9px] px-1.5" onClick={addSortLevel}>
              +Sort
            </Button>
          )}
          {/* Filter */}
          <Button variant="ghost" size="sm" className={cn("h-6 text-[9px] px-1.5", filterRules.length > 0 && "text-primary")}
            onClick={() => setShowFilter(!showFilter)}>
            <Filter className={cn("h-2.5 w-2.5 mr-0.5", filterRules.length > 0 && "text-primary")} />
            Filter{filterRules.length > 0 && ` (${filterRules.length})`}
          </Button>
          {/* Columns */}
          <Button variant="ghost" size="sm" className="h-6 text-[9px] px-1.5"
            onClick={() => setShowColumnManager(!showColumnManager)}>
            <Columns3 className="h-2.5 w-2.5 mr-0.5" /> Columns
          </Button>
          {/* Export */}
          <Button variant="ghost" size="sm" className="h-6 text-[9px] px-1.5" onClick={exportCSV}>
            <Download className="h-2.5 w-2.5 mr-0.5" /> Export
          </Button>
          {/* Add task */}
          <Button size="sm" className="h-6 text-[10px] px-2 gap-1" onClick={createTask}>
            <Plus className="h-3 w-3" /> New
          </Button>
        </div>
      </div>

      {/* ─── Column manager ─── */}
      {showColumnManager && (
        <div className="border-b bg-muted/5 px-3 py-2 animate-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-medium text-muted-foreground">Columns:</span>
            {columns.sort((a, b) => a.order - b.order).map(col => (
              <label key={col.id} className="flex items-center gap-1.5 text-[10px] cursor-pointer hover:text-foreground px-1.5 py-0.5 rounded-md hover:bg-muted transition-colors">
                <input type="checkbox" checked={col.visible}
                  onChange={() => toggleColumnVisibility(col.id)}
                  className="h-3 w-3 rounded border-muted" />
                {col.name || (col.type === "title" ? "Task" : col.type === "checkbox" ? "" : col.type)}
                <button onClick={() => toggleColumnPin(col.id)}
                  className={cn("text-[9px] px-1 rounded", col.pinned ? "text-primary bg-primary/10" : "text-muted-foreground/40 hover:text-muted-foreground")}>
                  📌
                </button>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ─── Filter bar ─── */}
      {showFilter && (
        <div className="flex flex-col gap-1 px-3 py-2 border-b bg-muted/5 text-[10px] animate-in slide-in-from-top-1 duration-150">
          {filterRules.length === 0 && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">No filters</span>
              <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => addFilterRule("and")}>+ Add Filter</Button>
            </div>
          )}
          {filterRules.map((rule, i) => (
            <div key={rule.id} className="flex items-center gap-1.5">
              {i > 0 && (
                <Select value={rule.logic} onValueChange={(v) => updateFilterRule(rule.id, { logic: v as "and" | "or" })}>
                  <SelectTrigger className="h-5 text-[9px] rounded w-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="and" className="text-[9px]">AND</SelectItem>
                    <SelectItem value="or" className="text-[9px]">OR</SelectItem>
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
                  <SelectItem value="equals" className="text-[9px]">Equals</SelectItem>
                  <SelectItem value="not_equals" className="text-[9px]">Not equals</SelectItem>
                  <SelectItem value="contains" className="text-[9px]">Contains</SelectItem>
                  <SelectItem value="not_contains" className="text-[9px]">Not contains</SelectItem>
                  <SelectItem value="is_empty" className="text-[9px]">Is empty</SelectItem>
                  <SelectItem value="is_not_empty" className="text-[9px]">Not empty</SelectItem>
                  <SelectItem value="is_before" className="text-[9px]">Is before</SelectItem>
                  <SelectItem value="is_after" className="text-[9px]">Is after</SelectItem>
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
            <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5 text-muted-foreground w-fit"
              onClick={() => setFilterRules([])}>Clear all</Button>
          )}
        </div>
      )}

      {/* ─── Column resizing indicator ─── */}
      {resizingCol.current && (
        <style>{`
          .col-resize-active { cursor: col-resize !important; user-select: none !important; }
        `}</style>
      )}

      {/* ─── Table header ─── */}
      <div className={cn("flex border-b bg-muted/20 sticky top-0 z-10 shrink-0", resizingCol.current && "col-resize-active")}>
        {pinnedCols.map(col => (
          <div key={col.id}
            className="relative flex items-center gap-1 px-2 py-1.5 border-r shrink-0 bg-muted/20 sticky left-0 z-10"
            style={{ width: getColWidth(col), minWidth: getColWidth(col) }}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, col }); }}>
            {col.type === "checkbox" ? (
              <span className="text-[10px] font-semibold text-muted-foreground">{col.name || ""}</span>
            ) : col.type === "title" ? (
              <button onClick={() => toggleSort(col.id)}
                className={cn("text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors",
                  sortConfig.some(s => s.col === col.id) && "text-foreground")}>
                Task
                {sortConfig.some(s => s.col === col.id) && (
                  <ArrowUpDown className={cn("h-2.5 w-2.5 transition-transform", sortConfig.find(s => s.col === col.id)?.dir === "desc" && "rotate-180")} />
                )}
              </button>
            ) : (
              <button onClick={() => toggleSort(col.id)}
                className={cn("text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors truncate",
                  sortConfig.some(s => s.col === col.id) && "text-foreground")}>
                {col.name}
                {sortConfig.some(s => s.col === col.id) && (
                  <ArrowUpDown className={cn("h-2.5 w-2.5 shrink-0 transition-transform", sortConfig.find(s => s.col === col.id)?.dir === "desc" && "rotate-180")} />
                )}
              </button>
            )}
            <button className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resive hover:bg-primary/30 group z-20 opacity-0 hover:opacity-100 transition-opacity"
              onMouseDown={(e) => handleResizeStart(e, col)}>
              <div className="h-full w-0.5 mx-auto transition-colors group-hover:bg-primary/50" />
            </button>
          </div>
        ))}
        {scrollCols.map(col => (
          <div key={col.id}
            className="relative flex items-center gap-1 px-2 py-1.5 border-r shrink-0 group/header"
            style={{ width: getColWidth(col), minWidth: getColWidth(col) }}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, col }); }}>
            <button onClick={() => toggleSort(col.id)}
              className={cn("text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors truncate",
                sortConfig.some(s => s.col === col.id) && "text-foreground")}>
              {col.name}
              {sortConfig.some(s => s.col === col.id) && (
                <ArrowUpDown className={cn("h-2.5 w-2.5 shrink-0 transition-transform", sortConfig.find(s => s.col === col.id)?.dir === "desc" && "rotate-180")} />
              )}
            </button>
            <button className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/30 group z-20 opacity-0 group-hover/header:opacity-100 transition-opacity"
              onMouseDown={(e) => handleResizeStart(e, col)}>
              <div className="h-full w-0.5 mx-auto transition-colors group-hover:bg-primary/50" />
            </button>
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
                  className="flex items-center gap-2 px-3 border-b bg-muted/5 cursor-pointer hover:bg-muted/10 transition-colors"
                  style={{ position: "absolute", top: item.offset, left: 0, right: 0, height: item.height }}
                  onClick={() => setCollapsedGroups(prev => {
                    const next = new Set(prev);
                    if (next.has(group!.key)) next.delete(group!.key); else next.add(group!.key);
                    return next;
                  })}>
                  {isCollapsed
                    ? <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                  <span className="text-[11px] font-semibold capitalize">{group!.key.replace(/[_-]/g, " ")}</span>
                  <span className="text-[10px] text-muted-foreground">{group!.tasks.length}</span>
                </div>
              );
            }

            const { task, globalIdx } = item.data;
            if (!task) return null;
            const isSelected = selectedRows.has(task.id);
            const isActive = activeCell?.row === globalIdx;
            const isRowActive = isActive && !editingCell;

            return (
              <div key={item.key}
                className={cn(
                  "flex border-b transition-colors group/row relative",
                  isSelected && "bg-primary/[0.03]",
                  isRowActive && "bg-primary/[0.02]",
                  !isSelected && !isRowActive && "hover:bg-muted/20",
                )}
                style={{ position: "absolute", top: item.offset, left: 0, right: 0, height: item.height }}
                onClick={(e) => {
                  toggleRowSelection(task.id, e as any);
                  const target = e.target as HTMLElement;
                  const cellEl = target.closest("[data-col-idx]");
                  if (cellEl) {
                    const colIdx = parseInt(cellEl.getAttribute("data-col-idx") || "0");
                    selectCell(globalIdx!, colIdx);
                  }
                }}
                onDoubleClick={(e) => {
                  const target = e.target as HTMLElement;
                  const cellEl = target.closest("[data-col-idx]");
                  if (cellEl) {
                    const colIdx = parseInt(cellEl.getAttribute("data-col-idx") || "0");
                    startEditing(globalIdx!, colIdx);
                  }
                }}
                onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, row: task }); }}>
                {/* Drag handle */}
                <div className="flex items-center justify-center w-5 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/10 group-hover/row:text-muted-foreground/40 transition-colors">
                  <GripVertical className="h-3.5 w-3.5" />
                </div>

                {/* Progress bar under row */}
                {task.progress > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-secondary/30 pointer-events-none z-[1]">
                    <div className="h-full bg-primary/40 transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, task.progress))}%` }} />
                  </div>
                )}

                {/* Pinned cells */}
                {pinnedCols.map((col, colIdx) => {
                  const value = getCellValue(task, col);
                  const isEditing = editingCell?.row === globalIdx && editingCell?.col === colIdx;
                  const isCellActive = isActive && activeCell?.col === colIdx && !editingCell;
                  return (
                    <div key={col.id} data-col-idx={colIdx}
                      className={cn(
                        "px-2 py-1 text-xs border-r shrink-0 bg-card sticky left-0 z-[1] group/cell transition-colors relative",
                        isEditing && "z-[5]",
                        isCellActive && "ring-1 ring-primary/40 ring-inset bg-primary/[0.02]",
                      )}
                      style={{ width: getColWidth(col), minWidth: getColWidth(col) }}>
                      {isEditing ? (
                        getEditorForColumn(col, value,
                          (v) => saveCell(globalIdx!, col, v),
                          () => setEditingCell(null),
                          focusRef
                        )
                      ) : (
                        <div className="cursor-default" onClick={() => {
                          if (col.type === "checkbox") {
                            const newStatus = task.status === "done" ? "todo" : "done";
                            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
                            updateMutation.mutate({ id: task.id, data: { status: newStatus } });
                          } else if (col.type === "title") {
                            onSelectTask?.(task);
                          }
                        }}>
                          <CellDisplay col={col} value={value} row={task} isActive={isCellActive}
                            onClick={() => {
                              if (col.type === "title") onSelectTask?.(task);
                            }} />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Scrollable cells */}
                {scrollCols.map((col, scrollIdx) => {
                  const colIdx = pinnedCols.length + scrollIdx;
                  const value = getCellValue(task, col);
                  const isEditing = editingCell?.row === globalIdx && editingCell?.col === colIdx;
                  const isCellActive = isActive && activeCell?.col === colIdx && !editingCell;
                  return (
                    <div key={col.id} data-col-idx={colIdx}
                      className={cn(
                        "px-2 py-1 text-xs border-r shrink-0 group/cell transition-colors relative",
                        isEditing && "z-[5]",
                        isCellActive && "ring-1 ring-primary/40 ring-inset bg-primary/[0.02]",
                      )}
                      style={{ width: getColWidth(col), minWidth: getColWidth(col) }}>
                      {isEditing ? (
                        getEditorForColumn(col, value,
                          (v) => saveCell(globalIdx!, col, v),
                          () => setEditingCell(null),
                          focusRef
                        )
                      ) : (
                        <div className="cursor-default">
                          <CellDisplay col={col} value={value} row={task} isActive={isCellActive} onClick={() => {}} />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Hover actions */}
                <div className="flex items-center gap-1 px-2 shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); onSelectTask?.(task); }}
                    className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted transition-colors">
                    <ExternalLink className="h-3 w-3" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(task.id); }}
                    className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors">
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

        {!allCollapsed && processedTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <LayoutList className="h-8 w-8 opacity-20" />
            <p className="text-sm font-medium">No tasks match your filters</p>
            <p className="text-xs">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>

      {/* ─── Context menu ─── */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
          <div className="fixed z-50 w-44 rounded-lg border bg-popover shadow-lg p-1 animate-in fade-in-0 zoom-in-95 duration-100"
            style={{ left: contextMenu.x, top: contextMenu.y }}>
            {contextMenu.col ? (
              <>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-muted text-left transition-colors"
                  onClick={() => { toggleSort(contextMenu.col!.id); setContextMenu(null); }}>
                  <ArrowUpDown className="h-3 w-3" /> Sort Asc
                </button>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-muted text-left transition-colors"
                  onClick={() => { setSortConfig([{ col: contextMenu.col!.id, dir: "desc" }]); setContextMenu(null); }}>
                  <ArrowUpDown className="h-3 w-3 rotate-180" /> Sort Desc
                </button>
                <div className="h-px bg-border my-1" />
                <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-muted text-left transition-colors"
                  onClick={() => { toggleColumnPin(contextMenu.col!.id); setContextMenu(null); }}>
                  📌 {contextMenu.col.pinned ? "Unpin" : "Pin Left"}
                </button>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-muted text-left transition-colors"
                  onClick={() => { toggleColumnVisibility(contextMenu.col!.id); setContextMenu(null); }}>
                  <X className="h-3 w-3" /> Hide
                </button>
                <div className="h-px bg-border my-1" />
                <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-muted text-left transition-colors"
                  onClick={() => { setFilterRules(prev => [...prev, { id: generateId(), column: contextMenu.col!.id, operator: "equals", value: "", logic: "and" }]); setShowFilter(true); setContextMenu(null); }}>
                  <Filter className="h-3 w-3" /> Filter by &ldquo;{contextMenu.col.name}&rdquo;
                </button>
              </>
            ) : contextMenu.row ? (
              <>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-muted text-left transition-colors"
                  onClick={() => { onSelectTask?.(contextMenu.row); setContextMenu(null); }}>
                  <ExternalLink className="h-3 w-3" /> Open Task
                </button>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-muted text-left transition-colors"
                  onClick={() => {
                    const newStatus = contextMenu.row.status === "done" ? "todo" : "done";
                    setTasks(prev => prev.map(t => t.id === contextMenu.row.id ? { ...t, status: newStatus } : t));
                    updateMutation.mutate({ id: contextMenu.row.id, data: { status: newStatus } });
                    setContextMenu(null);
                  }}>
                  {contextMenu.row?.status === "done" ? "Mark Incomplete" : "Mark Complete"}
                </button>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-muted text-left transition-colors"
                  onClick={() => { setSelectedRows(new Set([contextMenu.row.id])); duplicateSelected(); setContextMenu(null); }}>
                  <Copy className="h-3 w-3" /> Duplicate
                </button>
                <div className="h-px bg-border my-1" />
                <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-muted text-left transition-colors"
                  onClick={() => { setSelectedRows(new Set([contextMenu.row.id])); copyToClipboard(); setContextMenu(null); }}>
                  <Copy className="h-3 w-3" /> Copy Row
                </button>
                <div className="h-px bg-border my-1" />
                <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-muted text-left transition-colors text-destructive"
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