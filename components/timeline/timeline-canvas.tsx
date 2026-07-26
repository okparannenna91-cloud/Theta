"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { format, addDays, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth, eachMonthOfInterval, isToday, differenceInDays, differenceInMinutes, isWeekend, addHours, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter, startOfYear, endOfYear, eachHourOfInterval, eachWeekOfInterval, eachQuarterOfInterval, eachYearOfInterval, startOfDay, endOfDay } from "date-fns";
import { detectCriticalPath, calculateProgressRollup } from "@/lib/scheduling/scheduling-engine";
import { cn } from "@/lib/utils";
import TaskBar from "./task-bar";
import DependencyEngine from "./dependency-engine";
import { ChevronRight, ChevronDown, Folder, FileText, Users, GripVertical } from "lucide-react";
import { ZoomLevel, TimelineVariant, ROW_HEIGHT, VISIBLE_BUFFER, SIDEBAR_WIDTH, GANTT_SIDEBAR_WIDTH, ZOOM_CELL_WIDTHS, ZOOM_CONFIG_MAP, DragState } from "@/components/shared/timeline/types";
import type { UndoCommand } from "@/components/shared/timeline/types";

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
}: TimelineCanvasProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
    const [scrollTop, setScrollTop] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(800);
    const [viewportWidth, setViewportWidth] = useState(1200);
    const isSyncingRef = useRef(false);
    const isGantt = variant === "gantt";
    const [dragPan, setDragPan] = useState<{ startX: number; startScrollLeft: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const cellWidth = ZOOM_CELL_WIDTHS[zoomLevel] || 140;

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
                if (node.isSummary) {
                    node.isSummary = true;
                }
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
            roots.forEach(rollup);
        }
        return roots;
    }, [tasks, enableRollup]);

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
    }, [taskTree, collapsedIds, searchQuery, groupBy, enableRollup]);

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

    const { startDate, endDate, timeUnits, headerLevels } = useMemo(() => {
        const now = new Date();
        let start: Date;
        let end: Date;
        let units: { date: Date; isWeekend: boolean }[];
        type HeaderItem = { label: string; width: number; unit: string; sublabel?: string };
        const levels: HeaderItem[][] = [];

        switch (zoomLevel) {
            case "hour": {
                start = startOfDay(addDays(now, -7));
                end = endOfDay(addDays(now, 14));
                const hours = eachHourOfInterval({ start, end });
                units = hours.map(d => ({ date: d, isWeekend: isWeekend(d) }));
                const days = eachDayOfInterval({ start, end });
                levels.push(days.map(d => ({ label: format(d, "EEE MMM d"), width: 24 * cellWidth, unit: "day" })));
                levels.push(hours.map(h => ({ label: format(h, "HH:mm"), width: cellWidth, unit: "hour" })));
                break;
            }
            case "day": {
                start = startOfMonth(addDays(now, -30));
                end = endOfMonth(addDays(now, 60));
                const days = eachDayOfInterval({ start, end });
                units = days.map(d => ({ date: d, isWeekend: isWeekend(d) }));
                const months = eachMonthOfInterval({ start, end });
                levels.push(months.map(m => ({ label: format(m, "MMMM yyyy"), width: days.filter(d => d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear()).length * cellWidth, unit: "month" })));
                levels.push(days.map(d => ({ label: format(d, "d"), sublabel: format(d, "EEE"), width: cellWidth, unit: "day" })));
                break;
            }
            case "week": {
                start = startOfWeek(addDays(now, -30), { weekStartsOn: 1 });
                end = endOfWeek(addDays(now, 120), { weekStartsOn: 1 });
                const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
                units = weeks.map(w => ({ date: w, isWeekend: false }));
                const months = eachMonthOfInterval({ start, end });
                levels.push(months.map(m => ({ label: format(m, "MMMM yyyy"), width: weeks.filter(w => w.getMonth() === m.getMonth() && w.getFullYear() === m.getFullYear()).length * cellWidth, unit: "month" })));
                levels.push(weeks.map(w => ({ label: `W${format(w, "w")}`, sublabel: format(w, "MMM d"), width: cellWidth, unit: "week" })));
                break;
            }
            case "month": {
                start = startOfMonth(addDays(now, -60));
                end = endOfMonth(addDays(now, 365));
                const months = eachMonthOfInterval({ start, end });
                units = months.map(m => ({ date: m, isWeekend: false }));
                const quarters = eachQuarterOfInterval({ start, end });
                levels.push(quarters.map(q => ({ label: `Q${Math.ceil((q.getMonth() + 1) / 3)} ${format(q, "yyyy")}`, width: months.filter(m => m.getFullYear() === q.getFullYear() && Math.floor(m.getMonth() / 3) === Math.floor(q.getMonth() / 3)).length * cellWidth, unit: "quarter" })));
                levels.push(months.map(m => ({ label: format(m, "MMM"), sublabel: format(m, "yyyy"), width: cellWidth, unit: "month" })));
                break;
            }
            case "quarter": {
                start = startOfQuarter(addDays(now, -90));
                end = endOfQuarter(addDays(now, 540));
                const quarters = eachQuarterOfInterval({ start, end });
                units = quarters.map(q => ({ date: q, isWeekend: false }));
                levels.push(quarters.map(q => ({ label: format(q, "yyyy"), width: quarters.filter(innerQ => innerQ.getFullYear() === q.getFullYear()).length * cellWidth, unit: "year" })));
                levels.push(quarters.map(q => ({ label: `Q${Math.ceil((q.getMonth() + 1) / 3)}`, sublabel: format(q, "yyyy"), width: cellWidth, unit: "quarter" })));
                break;
            }
            case "year": {
                start = startOfYear(addDays(now, -365));
                end = endOfYear(addDays(now, 730));
                const years = eachYearOfInterval({ start, end });
                units = years.map(y => ({ date: y, isWeekend: false }));
                levels.push(years.map(y => ({ label: `${format(y, "yyyy")}`, width: cellWidth, unit: "year" })));
                break;
            }
            default: {
                start = startOfMonth(addDays(now, -30));
                end = endOfMonth(addDays(now, 180));
                const days = eachDayOfInterval({ start, end });
                units = days.map(d => ({ date: d, isWeekend: isWeekend(d) }));
                const months = eachMonthOfInterval({ start, end });
                levels.push(months.map(m => ({ label: format(m, "MMMM yyyy"), width: days.filter(d => d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear()).length * cellWidth, unit: "month" })));
                levels.push(days.map(d => ({ label: format(d, "d"), sublabel: format(d, "EEE"), width: cellWidth, unit: "day" })));
                break;
            }
        }

        return { startDate: start, endDate: end, timeUnits: units, headerLevels: levels };
    }, [zoomLevel, cellWidth]);

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

    const handleTaskUpdate = useCallback(async (taskId: string, updates: any, prevState?: any) => {
        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error("Update failed");
            if (onUndoPush && prevState) {
                onUndoPush({
                    type: updates.type === "resize" ? "resize" : "drag",
                    taskId,
                    previous: prevState,
                    next: updates,
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.error(error);
        }
    }, [onUndoPush]);

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

    useEffect(() => {
        if (scrollContainerRef.current) {
            const todayIdx = timeUnits.findIndex(u => isToday(u.date));
            if (todayIdx !== -1) {
                scrollContainerRef.current.scrollLeft = todayIdx * cellWidth - viewportWidth / 3;
            }
        }
    }, [cellWidth, timeUnits, viewportWidth]);

    useEffect(() => {
        const handleResize = () => {
            setViewportHeight(window.innerHeight - 240);
            setViewportWidth(window.innerWidth - sidebarWidth - 40);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [sidebarWidth]);

    return (
        <div className="flex h-full border-t overflow-hidden flex-col">
            <div className="flex flex-1 overflow-hidden">
                <div
                    className={cn(
                        "border-r bg-background/80 backdrop-blur-xl flex flex-col z-10 shadow-2xl relative",
                        isGantt ? "w-[360px]" : "w-[320px]"
                    )}
                    style={{ minWidth: sidebarWidth }}
                >
                    <div className="h-24 border-b flex items-center px-6 bg-secondary/20 font-semibold text-[10px] text-muted-foreground/60">
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
                                    style={{
                                        position: "absolute",
                                        top: (visibleRange.start + index) * ROW_HEIGHT,
                                        width: "100%",
                                        paddingLeft: `${task.depth * 16 + 16}px`,
                                        height: ROW_HEIGHT,
                                    }}
                                    className="flex items-center pr-3 border-b hover:bg-primary/5 transition-all group cursor-pointer"
                                    onClick={() => {
                                        if (task.children.length > 0) {
                                            toggleCollapse(task.id);
                                        }
                                        onTaskClick?.(task);
                                    }}
                                >
                                    <div className="flex items-center gap-2 w-full min-w-0">
                                        {task.children.length > 0 ? (
                                            collapsedIds.has(task.id) ? <ChevronRight className="h-3.5 w-3.5 text-primary flex-shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                                        ) : (
                                            <div className="w-3.5 flex-shrink-0" />
                                        )}
                                        {task.isSummary ? (
                                            <Folder className={cn("h-4 w-4 flex-shrink-0", task.isCritical ? "text-red-500" : "text-amber-500 fill-amber-500/20")} />
                                        ) : (
                                            <FileText className={cn("h-4 w-4 flex-shrink-0", task.isCritical ? "text-red-500" : "text-blue-500/60")} />
                                        )}
                                        <span className={cn(
                                            "text-xs truncate transition-all",
                                            task.isSummary ? "font-semibold" : "font-medium",
                                            task.isCritical && "text-red-500"
                                        )}>
                                            {task.title}
                                        </span>
                                        {task.assigneeIds && task.assigneeIds.length > 0 && (
                                            <span className="flex-shrink-0 flex items-center gap-1 ml-auto">
                                                <Users className="h-3 w-3 text-muted-foreground/40" />
                                                <span className="text-[9px] text-muted-foreground/40">{task.assigneeIds.length}</span>
                                            </span>
                                        )}
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

                        <div className="relative">
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
                                cellWidth={cellWidth}
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
                                            className="flex items-center relative group border-b"
                                        >
                                            <TaskBar
                                                task={{
                                                    ...task,
                                                    isCritical: criticalPath.has(task.id),
                                                }}
                                                timelineStart={startDate}
                                                cellWidth={cellWidth}
                                                snapUnit={ZOOM_CONFIG_MAP[zoomLevel].snapUnit}
                                                showBaseline={isGantt}
                                                highlightVariance={isGantt}
                                                onUpdate={(updates) => handleTaskUpdate(task.id, updates, prevState)}
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
                        {timeUnits.some(u => isToday(u.date)) && (
                            <div
                                className="absolute top-0 bottom-0 w-0.5 bg-primary/60 shadow-[0_0_10px_rgba(139,92,246,0.4)] z-30 pointer-events-none"
                                style={{ left: timeUnits.findIndex(u => isToday(u.date)) * cellWidth + cellWidth / 2 }}
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
    );
}
