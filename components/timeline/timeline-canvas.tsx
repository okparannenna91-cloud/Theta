"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format, addDays, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth, eachMonthOfInterval, isToday, differenceInDays, differenceInMinutes, differenceInCalendarDays, isWeekend, addHours, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, startOfYear, endOfYear, eachHourOfInterval, eachWeekOfInterval, eachQuarterOfInterval, eachYearOfInterval, startOfDay, endOfDay } from "date-fns";
import { detectCriticalPath, calculateProgressRollup } from "@/lib/scheduling/scheduling-engine";
import { invalidateTaskCaches } from "@/lib/invalidate-task-caches";
import { cn } from "@/lib/utils";
import TaskBar from "./task-bar";
import DependencyEngine from "./dependency-engine";
import { ChevronRight, ChevronDown, Folder, FileText, Users, GripVertical, Flag, Plus, Link2, Link2Off, CalendarDays, GitBranch } from "lucide-react";
import { ZoomLevel, TimelineVariant, ROW_HEIGHT, VISIBLE_BUFFER, SIDEBAR_WIDTH, GANTT_SIDEBAR_WIDTH, ZOOM_CELL_WIDTHS, ZOOM_CONFIG_MAP, DragState, DAYS_PER_UNIT } from "@/components/shared/timeline/types";
import type { UndoCommand } from "@/components/shared/timeline/types";
import { useWorkspaceMembers } from "@/hooks/use-workspace-members";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getStatusColor, getPriorityColor } from "./timeline-utils";

interface TimelineCanvasProps {
    tasks: any[];
    zoomLevel: ZoomLevel;
    searchQuery: string;
    showCriticalPath?: boolean;
    schedulingMode?: "auto" | "manual";
    variant?: TimelineVariant;
    onUndoPush?: (cmd: UndoCommand) => void;
    workingDays?: Record<string, boolean>;
    holidays?: { name: string; date: string }[];
    groupBy?: "none" | "project" | "assignee" | "status" | "priority";
    onTaskClick?: (task: any) => void;
    showWeekends?: boolean;
    enableRollup?: boolean;
    workspaceId?: string | null;
    centerDate?: Date;
    onCreateSubtask?: (parentTask: any) => void;
    onEmptyCreate?: () => void;
}

export default function TimelineCanvas({
    tasks,
    zoomLevel,
    searchQuery,
    showCriticalPath = true,
    schedulingMode = "auto",
    variant = "timeline",
    onUndoPush,
    workingDays,
    holidays,
    groupBy = "none",
    onTaskClick,
    showWeekends = true,
    enableRollup = false,
    workspaceId,
    centerDate,
    onCreateSubtask,
    onEmptyCreate,
}: TimelineCanvasProps) {
    const queryClient = useQueryClient();
    const activeWorkspace = workspaceId || undefined;
    const { memberMap } = useWorkspaceMembers(activeWorkspace || null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const selectedRowRef = useRef<HTMLDivElement>(null);
    const collapseStorageKey = useMemo(() => `theta-timeline-collapsed-${workspaceId || "global"}`, [workspaceId]);
    const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => {
        if (typeof window === "undefined") return new Set();
        try {
            const raw = window.localStorage.getItem(collapseStorageKey);
            if (raw) return new Set(JSON.parse(raw));
        } catch {}
        return new Set();
    });
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [pendingParentMove, setPendingParentMove] = useState<{ taskId: string; updates: any; prevState?: any; offset: number; children: any[] } | null>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(800);
    const [viewportWidth, setViewportWidth] = useState(1200);
    const isSyncingRef = useRef(false);
    const isGantt = variant === "gantt";
    const [dragPan, setDragPan] = useState<{ startX: number; startScrollLeft: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        try {
            window.localStorage.setItem(collapseStorageKey, JSON.stringify(Array.from(collapsedIds)));
        } catch {}
    }, [collapsedIds, collapseStorageKey]);

    const cellWidth = ZOOM_CELL_WIDTHS[zoomLevel] || 140;
    const pixelsPerDay = cellWidth / DAYS_PER_UNIT[zoomLevel];

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        if (isSyncingRef.current) return;
        isSyncingRef.current = true;
        const target = e.currentTarget;
        const isTimeline = target === scrollContainerRef.current;
        if (isTimeline) {
            setScrollLeft(target.scrollLeft);
        }
        const otherPanel = isTimeline ? sidebarRef.current : scrollContainerRef.current;
        if (otherPanel && Math.abs(otherPanel.scrollTop - target.scrollTop) > 1) {
            otherPanel.scrollTop = target.scrollTop;
        }
        setScrollTop(target.scrollTop);
        isSyncingRef.current = false;
    }, []);

    const handleTimelineWheel = useCallback((e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) return;
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft += e.deltaX;
        }
    }, []);

    const handleTimelineMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
            setDragPan({ startX: e.clientX, startScrollLeft: scrollContainerRef.current?.scrollLeft || 0 });
            e.preventDefault();
        }
    }, []);

    const handleTimelineMouseMove = useCallback((e: React.MouseEvent) => {
        if (dragPan && scrollContainerRef.current) {
            const delta = e.clientX - dragPan.startX;
            scrollContainerRef.current.scrollLeft = dragPan.startScrollLeft - delta;
        }
    }, [dragPan]);

    const handleTimelineMouseUp = useCallback(() => {
        setDragPan(null);
    }, []);

    const taskTree = useMemo(() => {
        if (!Array.isArray(tasks)) return [];
        const map = new Map<string, any>(tasks.map(t => [t.id, { ...t, children: [] }]));
        const roots: any[] = [];
        map.forEach(task => {
            if (task.parentId && map.has(task.parentId)) {
                map.get(task.parentId).children.push(task);
            } else {
                roots.push(task);
            }
        });
        if (enableRollup) {
            function rollup(node: any) {
                if (node.children.length === 0) return;
                node.children.forEach(rollup);
                const total = node.children.reduce((sum: number, c: any) => sum + (c.progress || 0), 0);
                node.progress = Math.round(total / node.children.length);
                node.isSummary = true;
                // Only roll dates up when the parent has date-sync enabled
                if (node.syncParentDates !== false) {
                    const earliestStart = node.children.reduce((min: Date | null, c: any) => {
                        const d = c.startDate ? new Date(c.startDate) : null;
                        return d && (!min || d < min) ? d : min;
                    }, null);
                    const latestDue = node.children.reduce((max: Date | null, c: any) => {
                        const d = c.dueDate ? new Date(c.dueDate) : null;
                        return d && (!max || d > max) ? d : max;
                    }, null);
                    if (earliestStart) node.startDate = earliestStart.toISOString();
                    if (latestDue) node.dueDate = latestDue.toISOString();
                }
            }
            roots.forEach(rollup);
        }
        return roots;
    }, [tasks, enableRollup]);

    const childrenMap = useMemo(() => {
        const map = new Map<string, any[]>();
        function walk(nodes: any[]) {
            if (!Array.isArray(nodes)) return;
            nodes.forEach((n) => {
                if (Array.isArray(n.children) && n.children.length > 0) map.set(n.id, n.children);
                walk(n.children);
            });
        }
        walk(taskTree);
        return map;
    }, [taskTree]);

    const findRangeEdge = useCallback((taskId: string, edge: "start" | "due"): any | null => {
        const direct = childrenMap.get(taskId);
        if (!direct || direct.length === 0) return null;
        function walk(children: any[]): any | null {
            let best: any | null = null;
            for (const c of children) {
                const sub = childrenMap.get(c.id);
                const leaf = sub && sub.length > 0 ? walk(sub) : c;
                if (!leaf) continue;
                const leafDate = edge === "start" ? leaf.startDate : leaf.dueDate;
                if (!leafDate) continue;
                if (!best) {
                    best = leaf;
                    continue;
                }
                const bestDate = edge === "start" ? best.startDate : best.dueDate;
                if (edge === "start" ? leafDate < bestDate : leafDate > bestDate) best = leaf;
            }
            return best;
        }
        return walk(direct);
    }, [childrenMap]);

    const allFlattenedTasks = useMemo(() => {
        const flattened: any[] = [];

        function flatten(nodes: any[], depth = 0) {
            if (!Array.isArray(nodes)) return;
            nodes.forEach(node => {
                if (node._isGroupHeader) {
                    flattened.push(node);
                    return;
                }
                flattened.push({ ...node, depth });
                const children = Array.isArray(node.children) ? node.children : [];
                if (!collapsedIds.has(node.id) && children.length > 0) {
                    flatten(children, depth + 1);
                }
            });
        }

        if (groupBy !== "none") {
            const groups = new Map<string, { label: string; tasks: any[]; icon?: string }>();
            const flatTasks: any[] = [];
            function collectAll(nodes: any[]) {
                nodes.forEach(n => {
                    flatTasks.push(n);
                    if (n.children?.length) collectAll(n.children);
                });
            }
            collectAll(taskTree);

            flatTasks.forEach(t => {
                let groupKey = "unassigned";
                let groupLabel = "Unassigned";
                if (groupBy === "project") {
                    groupKey = t.project?.id || "unassigned";
                    groupLabel = t.project?.name || "No Project";
                } else if (groupBy === "assignee") {
                    groupKey = t.assigneeIds?.join(",") || "unassigned";
                    groupLabel = t.assigneeIds?.length > 0 ? `${t.assigneeIds.length} assignees` : "Unassigned";
                } else if (groupBy === "status") {
                    groupKey = t.status || "unassigned";
                    groupLabel = (t.status || "unassigned").replace("_", " ");
                } else if (groupBy === "priority") {
                    groupKey = t.priority || "unassigned";
                    groupLabel = t.priority || "unassigned";
                }
                if (!groups.has(groupKey)) {
                    groups.set(groupKey, { label: groupLabel, tasks: [] });
                }
                groups.get(groupKey)!.tasks.push(t);
            });

            const groupColors: Record<string, string> = {
                urgent: "text-red-500", high: "text-rose-500", medium: "text-amber-500", low: "text-emerald-500",
                todo: "text-muted-foreground", in_progress: "text-blue-500", done: "text-emerald-500",
                blocked: "text-red-500", backlog: "text-muted-foreground",
            };

            groups.forEach((group, key) => {
                const isCollapsed = collapsedIds.has(`group-${key}`);
                flattened.push({
                    id: `group-${key}`,
                    title: group.label,
                    _isGroupHeader: true,
                    _groupKey: key,
                    _groupCount: group.tasks.length,
                    _isCollapsed: isCollapsed,
                    _groupColor: groupColors[group.label.toLowerCase()] || "",
                });
                if (!isCollapsed) {
                    group.tasks.forEach(t => {
                        flattened.push({ ...t, depth: 1 });
                    });
                }
            });
        } else {
            flatten(taskTree);
        }

        return flattened.filter(t =>
            !searchQuery || t.title?.toLowerCase().includes(searchQuery.toLowerCase()) || t._isGroupHeader
        );
    }, [taskTree, collapsedIds, searchQuery, groupBy]);

    const visibleRange = useMemo(() => {
        const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - VISIBLE_BUFFER);
        const end = Math.min(allFlattenedTasks.length, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + VISIBLE_BUFFER);
        return { start, end };
    }, [scrollTop, viewportHeight, allFlattenedTasks.length]);

    const visibleTasks = allFlattenedTasks.slice(visibleRange.start, visibleRange.end);

    const toggleCollapse = useCallback((id: string) => {
        setCollapsedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const selectableTasks = useMemo(() => allFlattenedTasks.filter(t => !t._isGroupHeader), [allFlattenedTasks]);
    const selectedIndex = useMemo(() => {
        if (!selectedTaskId) return -1;
        return selectableTasks.findIndex(t => t.id === selectedTaskId);
    }, [selectableTasks, selectedTaskId]);

    useEffect(() => {
        if (selectedRowRef.current) {
            selectedRowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
    }, [selectedTaskId]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
            const sel = selectedIndex >= 0 ? selectableTasks[selectedIndex] : null;
            switch (e.key) {
                case "j":
                case "J": {
                    e.preventDefault();
                    if (selectableTasks.length === 0) return;
                    const next = selectedIndex < selectableTasks.length - 1 ? selectedIndex + 1 : 0;
                    setSelectedTaskId(selectableTasks[next].id);
                    break;
                }
                case "k":
                case "K": {
                    e.preventDefault();
                    if (selectableTasks.length === 0) return;
                    const prev = selectedIndex > 0 ? selectedIndex - 1 : selectableTasks.length - 1;
                    setSelectedTaskId(selectableTasks[prev].id);
                    break;
                }
                case "Enter": {
                    if (sel) {
                        e.preventDefault();
                        onTaskClick?.(sel);
                    }
                    break;
                }
                case "ArrowRight": {
                    if (sel?.children?.length && collapsedIds.has(sel.id)) {
                        e.preventDefault();
                        toggleCollapse(sel.id);
                    }
                    break;
                }
                case "ArrowLeft": {
                    if (sel?.children?.length && !collapsedIds.has(sel.id)) {
                        e.preventDefault();
                        toggleCollapse(sel.id);
                    }
                    break;
                }
                case "Escape": {
                    setSelectedTaskId(null);
                    break;
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectableTasks, selectedIndex, onTaskClick, collapsedIds, toggleCollapse]);

    const groupedCollapsedIds = useMemo(() => {
        if (groupBy === "none") return collapsedIds;
        const result = new Set(collapsedIds);
        allFlattenedTasks.forEach(t => {
            if (t._isGroupHeader) {
                if (!collapsedIds.has(t.id)) {
                    result.delete(t.id);
                }
            }
        });
        return result;
    }, [collapsedIds, groupBy, allFlattenedTasks]);

    const buildUnitsAndLevels = useCallback((z: ZoomLevel, s: Date, e: Date) => {
        let units: { date: Date; isWeekend: boolean }[];
        type HeaderItem = { label: string; width: number; unit: string; sublabel?: string };
        const levels: HeaderItem[][] = [];

        switch (z) {
            case "hour": {
                const hours = eachHourOfInterval({ start: s, end: e });
                units = hours.map(d => ({ date: d, isWeekend: isWeekend(d) }));
                const days = eachDayOfInterval({ start: s, end: e });
                levels.push(days.map(d => ({ label: format(d, "EEE MMM d"), width: 24 * cellWidth, unit: "day" })));
                levels.push(hours.map(h => ({ label: format(h, "HH:mm"), width: cellWidth, unit: "hour" })));
                break;
            }
            case "day": {
                const days = eachDayOfInterval({ start: s, end: e });
                units = days.map(d => ({ date: d, isWeekend: isWeekend(d) }));
                const months = eachMonthOfInterval({ start: s, end: e });
                levels.push(months.map(m => ({ label: format(m, "MMMM yyyy"), width: days.filter(d => d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear()).length * cellWidth, unit: "month" })));
                levels.push(days.map(d => ({ label: format(d, "d"), sublabel: format(d, "EEE"), width: cellWidth, unit: "day" })));
                break;
            }
            case "week": {
                const weeks = eachWeekOfInterval({ start: s, end: e }, { weekStartsOn: 1 });
                units = weeks.map(w => ({ date: w, isWeekend: false }));
                const months = eachMonthOfInterval({ start: s, end: e });
                levels.push(months.map(m => ({ label: format(m, "MMMM yyyy"), width: weeks.filter(w => w.getMonth() === m.getMonth() && w.getFullYear() === m.getFullYear()).length * cellWidth, unit: "month" })));
                levels.push(weeks.map(w => ({ label: `W${format(w, "w")}`, sublabel: format(w, "MMM d"), width: cellWidth, unit: "week" })));
                break;
            }
            case "month": {
                const months = eachMonthOfInterval({ start: s, end: e });
                units = months.map(m => ({ date: m, isWeekend: false }));
                const quarters = eachQuarterOfInterval({ start: s, end: e });
                levels.push(quarters.map(q => ({ label: `Q${Math.ceil((q.getMonth() + 1) / 3)} ${format(q, "yyyy")}`, width: months.filter(m => m.getFullYear() === q.getFullYear() && Math.floor(m.getMonth() / 3) === Math.floor(q.getMonth() / 3)).length * cellWidth, unit: "quarter" })));
                levels.push(months.map(m => ({ label: format(m, "MMM"), sublabel: format(m, "yyyy"), width: cellWidth, unit: "month" })));
                break;
            }
            case "quarter": {
                const quarters = eachQuarterOfInterval({ start: s, end: e });
                units = quarters.map(q => ({ date: q, isWeekend: false }));
                levels.push(quarters.map(q => ({ label: format(q, "yyyy"), width: quarters.filter(innerQ => innerQ.getFullYear() === q.getFullYear()).length * cellWidth, unit: "year" })));
                levels.push(quarters.map(q => ({ label: `Q${Math.ceil((q.getMonth() + 1) / 3)}`, sublabel: format(q, "yyyy"), width: cellWidth, unit: "quarter" })));
                break;
            }
            case "year": {
                const years = eachYearOfInterval({ start: s, end: e });
                units = years.map(y => ({ date: y, isWeekend: false }));
                levels.push(years.map(y => ({ label: `${format(y, "yyyy")}`, width: cellWidth, unit: "year" })));
                break;
            }
            default: {
                const days = eachDayOfInterval({ start: s, end: e });
                units = days.map(d => ({ date: d, isWeekend: isWeekend(d) }));
                const months = eachMonthOfInterval({ start: s, end: e });
                levels.push(months.map(m => ({ label: format(m, "MMMM yyyy"), width: days.filter(d => d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear()).length * cellWidth, unit: "month" })));
                levels.push(days.map(d => ({ label: format(d, "d"), sublabel: format(d, "EEE"), width: cellWidth, unit: "day" })));
                break;
            }
        }

        return { units, levels };
    }, [cellWidth]);

    const taskIdsKey = allFlattenedTasks.map(t => t.id).join("|");

    const { startDate, endDate, timeUnits, headerLevels } = useMemo(() => {
        const now = centerDate || new Date();
        let start: Date;
        let end: Date;

        switch (zoomLevel) {
            case "hour": start = startOfDay(addDays(now, -7)); end = endOfDay(addDays(now, 14)); break;
            case "day": start = startOfMonth(addDays(now, -30)); end = endOfMonth(addDays(now, 60)); break;
            case "week": start = startOfWeek(addDays(now, -30), { weekStartsOn: 1 }); end = endOfWeek(addDays(now, 120), { weekStartsOn: 1 }); break;
            case "month": start = startOfMonth(addDays(now, -60)); end = endOfMonth(addDays(now, 365)); break;
            case "quarter": start = startOfQuarter(addDays(now, -90)); end = endOfQuarter(addDays(now, 540)); break;
            case "year": start = startOfYear(addDays(now, -365)); end = endOfYear(addDays(now, 730)); break;
            default: start = startOfMonth(addDays(now, -30)); end = endOfMonth(addDays(now, 180));
        }

        const padDays = { hour: 1, day: 1, week: 3, month: 7, quarter: 15, year: 30 }[zoomLevel] ?? 1;
        for (const t of allFlattenedTasks) {
            if (t.startDate) {
                const d = new Date(t.startDate);
                if (d < start) start = startOfDay(addDays(d, -padDays));
            }
            if (t.dueDate) {
                const d = new Date(t.dueDate);
                if (d > end) end = endOfDay(addDays(d, padDays));
            }
        }

        const built = buildUnitsAndLevels(zoomLevel, start, end);
        return { startDate: start, endDate: end, timeUnits: built.units, headerLevels: built.levels };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [zoomLevel, cellWidth, centerDate, taskIdsKey]);

    const criticalPath = useMemo(() => {
        if (!isGantt || !showCriticalPath) return new Set<string>();
        const flatten = (nodes: any[]): any[] => {
            if (!Array.isArray(nodes) || nodes.length === 0) return [];
            return nodes.flatMap((n: any) => {
                const children = Array.isArray(n.children) ? n.children : [];
                return [n, ...flatten(children)];
            });
        };
        if (!Array.isArray(taskTree)) return new Set<string>();
        const unfiltered = taskTree.flatMap((nodes) => flatten(nodes));
        const schedulingTasks = unfiltered.map(t => ({
            id: t.id,
            startDate: t.startDate ? new Date(t.startDate) : null,
            dueDate: t.dueDate ? new Date(t.dueDate) : null,
            durationMinutes: t.startDate && t.dueDate ? differenceInMinutes(new Date(t.dueDate), new Date(t.startDate)) : 0,
            schedulingMode: t.schedulingMode || "auto",
            predecessors: Array.isArray(t.predecessors) ? t.predecessors.map((p: any) => ({
                predecessorId: p.predecessorId,
                type: p.type,
                lagMinutes: p.lag || 0
            })) : []
        }));
        return detectCriticalPath(schedulingTasks);
    }, [taskTree, isGantt, showCriticalPath]);

    const setTaskDates = useCallback((taskId: string, patch: any) => {
        if (!activeWorkspace) return;
        const apply = (old: unknown) => {
            if (!Array.isArray(old)) return old;
            return old.map((t: any) => (t && t.id === taskId ? { ...t, ...patch } : t));
        };
        for (const key of ["tasks", "gantt-tasks", "timeline-tasks"] as const) {
            queryClient.setQueriesData({ queryKey: [key, activeWorkspace] }, apply);
        }
    }, [activeWorkspace, queryClient]);

    const applyTaskUpdate = useCallback(async (taskId: string, updates: any, prevState?: any, type: "drag" | "resize" = "drag") => {
        setTaskDates(taskId, updates);
        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error("Update failed");
            if (activeWorkspace) {
                invalidateTaskCaches({ queryClient, workspaceId: activeWorkspace });
            }
            if (onUndoPush && prevState) {
                onUndoPush({
                    type,
                    taskId,
                    previous: prevState,
                    next: updates,
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            if (prevState) setTaskDates(taskId, prevState);
            console.error(error);
        }
    }, [activeWorkspace, queryClient, onUndoPush, setTaskDates]);

    const handleTaskUpdate = useCallback(async (taskId: string, updates: any, prevState?: any, isRolledSummary = false) => {
        const children = childrenMap.get(taskId);
        const isMove = !!(updates.startDate && updates.dueDate);
        // Dragging a parent asks whether to move its subtasks together.
        if (isMove && children?.length) {
            const anchorOld = prevState?.startDate || prevState?.dueDate;
            if (anchorOld) {
                const offset = differenceInCalendarDays(new Date(updates.startDate), new Date(anchorOld));
                setPendingParentMove({ taskId, updates, prevState, offset, children });
                return "dialog";
            }
        }
        // Rolled-up summary bars derive their range from subtasks, so a resize has to be
        // applied to the edge child (leaf) that drives the range instead of the parent itself.
        if (!isMove && isRolledSummary && children?.length && prevState) {
            const edge = updates.dueDate ? "due" : "start";
            const leaf = findRangeEdge(taskId, edge);
            const oldEdgeDate = edge === "due" ? prevState.dueDate : prevState.startDate;
            const newEdgeDate = edge === "due" ? updates.dueDate : updates.startDate;
            if (leaf && oldEdgeDate && newEdgeDate) {
                const daysDelta = differenceInCalendarDays(new Date(newEdgeDate), new Date(oldEdgeDate));
                const leafOldDate = edge === "due" ? leaf.dueDate : leaf.startDate;
                if (daysDelta !== 0 && leafOldDate) {
                    const leafNext: any = {};
                    if (edge === "due") leafNext.dueDate = addDays(new Date(leafOldDate), daysDelta).toISOString();
                    else leafNext.startDate = addDays(new Date(leafOldDate), daysDelta).toISOString();
                    return applyTaskUpdate(
                        leaf.id,
                        leafNext,
                        { startDate: leaf.startDate, dueDate: leaf.dueDate },
                        "resize"
                    );
                }
            }
        }
        await applyTaskUpdate(taskId, updates, prevState, isMove ? "drag" : "resize");
    }, [childrenMap, applyTaskUpdate, findRangeEdge]);

    const confirmParentMove = useCallback(async (withChildren: boolean) => {
        if (!pendingParentMove) return;
        const { taskId, updates, prevState, offset, children } = pendingParentMove;
        const headers = { "Content-Type": "application/json" };
        const patches: { taskId: string; previous: any; next: any }[] = [];
        if (withChildren) {
            for (const child of children) {
                if (!child.startDate && !child.dueDate) continue;
                const childNext: any = {};
                if (child.startDate) childNext.startDate = addDays(new Date(child.startDate), offset).toISOString();
                if (child.dueDate) childNext.dueDate = addDays(new Date(child.dueDate), offset).toISOString();
                patches.push({
                    taskId: child.id,
                    previous: { startDate: child.startDate, dueDate: child.dueDate },
                    next: childNext,
                });
            }
        }
        patches.push({ taskId, previous: prevState, next: updates });

        patches.forEach(p => setTaskDates(p.taskId, p.next));
        try {
            const results = await Promise.all(
                patches.map(p => fetch(`/api/tasks/${p.taskId}`, {
                    method: "PATCH",
                    headers,
                    body: JSON.stringify(p.next),
                }))
            );
            if (!results.every(r => r.ok)) throw new Error("Move failed");
            if (activeWorkspace) {
                invalidateTaskCaches({ queryClient, workspaceId: activeWorkspace });
            }
            if (onUndoPush) {
                for (const p of patches) {
                    onUndoPush({ type: "drag", taskId: p.taskId, previous: p.previous, next: p.next, timestamp: Date.now() });
                }
            }
        } catch (error) {
            patches.forEach(p => setTaskDates(p.taskId, p.previous));
            console.error(error);
        }
        setPendingParentMove(null);
    }, [pendingParentMove, activeWorkspace, queryClient, onUndoPush, setTaskDates]);

    const handleSyncToggle = useCallback(async (taskId: string, current: boolean) => {
        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ syncParentDates: !current })
            });
            if (!res.ok) throw new Error("Update failed");
            if (activeWorkspace) {
                invalidateTaskCaches({ queryClient, workspaceId: activeWorkspace });
            }
        } catch (error) {
            console.error(error);
        }
    }, [activeWorkspace, queryClient]);

    const handleDependencyCreate = useCallback(async (sourceId: string, targetId: string, type: "FS" | "SS" | "FF" | "SF" = "FS") => {
        try {
            const res = await fetch(`/api/tasks/${targetId}/dependencies`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ predecessorId: sourceId, type })
            });
            if (!res.ok) throw new Error("Failed to create dependency");
        } catch (error) {
            console.error(error);
        }
    }, []);

    const handleDependencyDelete = useCallback(async (sourceId: string, targetId: string) => {
        try {
            const res = await fetch(`/api/tasks/${targetId}/dependencies/${sourceId}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to delete dependency");
        } catch (error) {
            console.error(error);
        }
    }, []);

    const sidebarWidth = isGantt ? GANTT_SIDEBAR_WIDTH : SIDEBAR_WIDTH;
    const totalTimelineWidth = timeUnits.length * cellWidth;
    const totalContentHeight = allFlattenedTasks.length * ROW_HEIGHT;
    const todayPx = differenceInCalendarDays(startOfDay(new Date()), startOfDay(startDate)) * pixelsPerDay;

    useEffect(() => {
        if (scrollContainerRef.current) {
            const anchor = centerDate || new Date();
            const anchorPx = differenceInCalendarDays(startOfDay(anchor), startOfDay(startDate)) * pixelsPerDay;
            if (anchorPx >= 0 && anchorPx <= totalTimelineWidth) {
                scrollContainerRef.current.scrollLeft = anchorPx - viewportWidth / 3;
            }
        }
    }, [cellWidth, pixelsPerDay, totalTimelineWidth, viewportWidth, centerDate, startDate]);

    useEffect(() => {
        const handleResize = () => {
            const el = scrollContainerRef.current;
            if (el && el.clientHeight > 0) {
                setViewportHeight(el.clientHeight);
                setViewportWidth(el.clientWidth);
            }
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [sidebarWidth]);

    if (!Array.isArray(tasks) || tasks.length === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
                <div className="rounded-full bg-muted p-4">
                    <CalendarDays className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-semibold">No tasks yet</h2>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                    Create your first task to begin planning your timeline.
                </p>
                {onEmptyCreate && (
                    <Button size="sm" className="text-xs" onClick={onEmptyCreate}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> New Task
                    </Button>
                )}
            </div>
        );
    }

    return (
        <>
        <div className="flex h-full border-t overflow-hidden flex-col">
            <div className="flex flex-1 overflow-hidden">
                <div
                    className={cn(
                        "border-r bg-background/80 backdrop-blur-xl flex flex-col z-10 shadow-2xl relative",
                        isGantt ? "w-[320px]" : "w-[280px]"
                    )}
                    style={{ minWidth: sidebarWidth }}
                >
                    <div className="h-16 border-b flex items-center px-5 bg-secondary/20 font-semibold text-[10px] text-muted-foreground/60">
                        {isGantt ? "Project Tasks" : "Timeline Tasks"}
                    </div>
                    <div
                        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none"
                        ref={sidebarRef}
                        onScroll={handleScroll}
                    >
                        <div style={{ height: totalContentHeight, position: "relative" }}>
                            {visibleTasks.map((task, index) => (
                                task._isGroupHeader ? (
                                    <div
                                        key={task.id}
                                        style={{
                                            position: "absolute",
                                            top: (visibleRange.start + index) * ROW_HEIGHT,
                                            width: "100%",
                                            height: ROW_HEIGHT,
                                        }}
                                        className="flex items-center px-4 border-b bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors"
                                        onClick={() => toggleCollapse(task.id)}
                                    >
                                        <div className="flex items-center gap-2 w-full">
                                            {task._isCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                {task.title}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground/50 ml-auto">
                                                {task._groupCount} tasks
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                <div
                                    key={task.id}
                                    ref={selectedTaskId === task.id ? selectedRowRef : undefined}
                                    style={{
                                        position: "absolute",
                                        top: (visibleRange.start + index) * ROW_HEIGHT,
                                        width: "100%",
                                        paddingLeft: `${task.depth * 14 + 16}px`,
                                        paddingRight: 12,
                                        height: ROW_HEIGHT,
                                    }}
                                    role="row"
                                    aria-expanded={task.children.length > 0 ? !collapsedIds.has(task.id) : undefined}
                                    aria-selected={selectedTaskId === task.id}
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") { e.preventDefault(); onTaskClick?.(task); }
                                        if (e.key === " ") { e.preventDefault(); if (task.children.length > 0) toggleCollapse(task.id); }
                                    }}
                                    className={cn(
                                        "flex items-center border-b transition-all group cursor-pointer",
                                        selectedTaskId === task.id ? "bg-primary/8 ring-1 ring-inset ring-primary/20" : "hover:bg-primary/5"
                                    )}
                                    onClick={() => {
                                        setSelectedTaskId(task.id);
                                        if (task.children.length > 0) {
                                            toggleCollapse(task.id);
                                        }
                                        onTaskClick?.(task);
                                    }}
                                >
                                    <div className="flex items-start gap-1.5 w-full min-w-0 py-1.5">
                                        {task.children.length > 0 ? (
                                            collapsedIds.has(task.id) ? <ChevronRight className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" /> : <ChevronDown className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                                        ) : (
                                            <div className="w-3.5 flex-shrink-0" />
                                        )}
                                        {task.isSummary ? (
                                            <Folder className={cn("h-4 w-4 flex-shrink-0 mt-0.5", task.isCritical ? "text-red-500" : "text-amber-500 fill-amber-500/20")} />
                                        ) : (
                                            <FileText className={cn("h-4 w-4 flex-shrink-0 mt-0.5", task.isCritical ? "text-red-500" : "text-blue-500/60")} />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className={cn(
                                                    "text-xs truncate",
                                                    task.isSummary ? "font-semibold" : "font-medium",
                                                    task.isCritical && "text-red-500"
                                                )}>
                                                    {task.title}
                                                </span>
                                                {task.isSummary && task.progress > 0 && (
                                                    <span className="text-[9px] font-semibold text-muted-foreground/60 flex-shrink-0">{Math.round(task.progress)}%</span>
                                                )}
                                                {task.children.length > 0 && (
                                                    <span className="ml-auto flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            type="button"
                                                            title={task.syncParentDates === false ? "Parent dates are independent — click to sync from subtasks" : "Sync parent dates with subtasks — click to make independent"}
                                                            className="h-5 w-5 rounded flex items-center justify-center hover:bg-primary/10 text-muted-foreground hover:text-primary"
                                                            onClick={(e) => { e.stopPropagation(); handleSyncToggle(task.id, task.syncParentDates !== false); }}
                                                        >
                                                            {task.syncParentDates === false ? <Link2Off className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            title="Add subtask"
                                                            className="h-5 w-5 rounded flex items-center justify-center hover:bg-primary/10 text-muted-foreground hover:text-primary"
                                                            onClick={(e) => { e.stopPropagation(); onCreateSubtask?.(task); }}
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </button>
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/70 mt-0.5 min-w-0">
                                                <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: getStatusColor(task.status) }} />
                                                {task.priority && task.priority !== "none" && (
                                                    <Flag className="h-2.5 w-2.5 flex-shrink-0" style={{ color: getPriorityColor(task.priority) }} />
                                                )}
                                                <span className="truncate">
                                                    {(task.startDate || task.dueDate)
                                                        ? `${task.startDate ? format(new Date(task.startDate), "MMM d") : "—"} – ${task.dueDate ? format(new Date(task.dueDate), "MMM d") : "—"}`
                                                        : "No dates"}
                                                </span>
                                                {Array.isArray(task.assigneeIds) && task.assigneeIds.length > 0 && (
                                                    <span className="ml-auto flex items-center gap-0.5 flex-shrink-0">
                                                        {task.assigneeIds.slice(0, 3).map((id: string) => {
                                                            const m = memberMap[id];
                                                            return <UserAvatar key={id} imageUrl={m?.imageUrl} name={m?.name || "?"} size="sm" />;
                                                        })}
                                                        {task.assigneeIds.length > 3 && (
                                                            <span className="text-[8px] text-muted-foreground/50">+{task.assigneeIds.length - 3}</span>
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                )
                            ))}
                        </div>
                    </div>
                </div>

                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    onWheel={handleTimelineWheel}
                    onMouseDown={handleTimelineMouseDown}
                    onMouseMove={handleTimelineMouseMove}
                    onMouseUp={handleTimelineMouseUp}
                    onMouseLeave={handleTimelineMouseUp}
                    className="flex-1 overflow-auto relative select-none"
                    style={{ cursor: dragPan ? "grabbing" : "default" }}
                >
                    <div style={{ width: totalTimelineWidth, height: totalContentHeight + 96 }} className="relative">
                        <div className="sticky top-0 bg-background/90 backdrop-blur-xl border-b flex flex-col z-20 shadow-sm" style={{ width: totalTimelineWidth }}>
                            {headerLevels.map((level, levelIdx) => (
                                <div key={levelIdx} className={cn("flex border-b", levelIdx === headerLevels.length - 1 ? "h-10" : "h-7")}>
                                    {level.map((item, i) => (
                                        <div
                                            key={i}
                                            style={{ width: item.width, minWidth: cellWidth }}
                                            className="h-full border-r flex items-center px-3 text-[9px] font-semibold text-primary/80 truncate"
                                        >
                                            <span className="truncate">{item.label}</span>
                                            {"sublabel" in item && (
                                                <span className="ml-1 text-[8px] text-muted-foreground/40 hidden sm:inline">{item.sublabel}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>

                        <div className="relative" style={{ height: totalContentHeight }}>
                            {/* Grid background */}
                            <div className="absolute inset-0 pointer-events-none flex" style={{ top: 0 }}>
                                {timeUnits.map((unit, i) => (
                                    <div
                                        key={i}
                                        style={{ width: cellWidth, minWidth: cellWidth }}
                                        className={cn(
                                            "h-full border-r relative",
                                            isToday(unit.date) && "bg-primary/5 border-r-primary/40",
                                            unit.isWeekend && showWeekends && "bg-muted/10"
                                        )}
                                    />
                                ))}
                            </div>

                            {/* Dependency Engine */}
                            <DependencyEngine
                                tasks={allFlattenedTasks}
                                timelineStart={startDate}
                                cellWidth={pixelsPerDay}
                                isGantt={isGantt}
                                onDependencyCreate={handleDependencyCreate}
                                onDependencyDelete={handleDependencyDelete}
                            />

                            {/* Task bars */}
                            <div className="relative z-10">
                                {visibleTasks.map((task, index) => {
                                    if (task._isGroupHeader) {
                                        return (
                                            <div
                                                key={task.id}
                                                style={{
                                                    position: "absolute",
                                                    top: (visibleRange.start + index) * ROW_HEIGHT,
                                                    width: totalTimelineWidth,
                                                    height: ROW_HEIGHT,
                                                }}
                                                className="flex items-center relative border-b bg-muted/20 cursor-pointer"
                                                onClick={() => toggleCollapse(task.id)}
                                            >
                                                <div className="flex items-center gap-2 px-3 w-full">
                                                    <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                                                        {task.title} · {task._groupCount} tasks
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    const prevState = task.startDate || task.dueDate
                                        ? { startDate: task.startDate, dueDate: task.dueDate }
                                        : undefined;
                                    return (
                                        <div
                                            key={task.id}
                                            style={{
                                                position: "absolute",
                                                top: (visibleRange.start + index) * ROW_HEIGHT,
                                                width: totalTimelineWidth,
                                                height: ROW_HEIGHT,
                                            }}
                                            onClick={() => setSelectedTaskId(task.id)}
                                            className={cn(
                                                "flex items-center relative group border-b",
                                                selectedTaskId === task.id && "bg-primary/[0.04]"
                                            )}
                                        >
                                            <TaskBar
                                                task={{
                                                    ...task,
                                                    isCritical: criticalPath.has(task.id),
                                                }}
                                                timelineStart={startDate}
                                                cellWidth={pixelsPerDay}
                                                snapUnit={ZOOM_CONFIG_MAP[zoomLevel].snapUnit}
                                                showBaseline={isGantt}
                                                highlightVariance={isGantt}
                                                onUpdate={(updates) => handleTaskUpdate(task.id, updates, prevState, task.isSummary && task.syncParentDates !== false)}
                                                onDragStart={() => setIsDragging(true)}
                                                onDragEnd={() => setIsDragging(false)}
                                            />
                                            <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 -z-10 transition-colors pointer-events-none" />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Today indicator */}
                        {todayPx >= 0 && todayPx <= totalTimelineWidth && (
                            <div
                                className="absolute top-0 bottom-0 w-0.5 bg-primary/60 shadow-[0_0_10px_rgba(139,92,246,0.4)] z-30 pointer-events-none"
                                style={{ left: todayPx }}
                            >
                                <div className="sticky top-24 -translate-x-1/2 w-3 h-3 rounded-full bg-primary flex items-center justify-center shadow-2xl">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

            <Dialog open={!!pendingParentMove} onOpenChange={(open) => { if (!open) setPendingParentMove(null); }}>
                <DialogContent className="sm:max-w-[420px] rounded-xl">
                    <DialogHeader>
                        <DialogTitle className="text-sm flex items-center gap-2">
                            <GitBranch className="h-4 w-4 text-primary" />
                            Move all subtasks together?
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            This parent has {pendingParentMove?.children?.length || 0} subtask{pendingParentMove?.children?.length !== 1 ? "s" : ""}. Move the subtasks along with it, or move only this parent?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => setPendingParentMove(null)}>
                            Cancel
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => confirmParentMove(false)}>
                            Move Parent Only
                        </Button>
                        <Button size="sm" className="text-xs" onClick={() => confirmParentMove(true)}>
                            Move Parent + All Subtasks
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
