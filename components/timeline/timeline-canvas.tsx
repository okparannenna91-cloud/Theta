"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { format, addDays, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth, eachMonthOfInterval, isToday, differenceInDays, differenceInMinutes, isWeekend } from "date-fns";
import { detectCriticalPath } from "@/lib/scheduling/scheduling-engine";
import { cn } from "@/lib/utils";
import TaskBar from "./task-bar";
import DependencyEngine from "./dependency-engine";
import { ChevronRight, ChevronDown, Folder, FileText } from "lucide-react";
import ResourceHeatmap from "./resource-heatmap";
import { ZoomLevel, TimelineVariant, ROW_HEIGHT, VISIBLE_BUFFER, SIDEBAR_WIDTH, ZOOM_CELL_WIDTHS } from "@/components/shared/timeline/types";

interface TimelineCanvasProps {
    tasks: any[];
    zoomLevel: ZoomLevel;
    searchQuery: string;
    variant?: TimelineVariant;
    onUndoPush?: (cmd: any) => void;
}

export default function TimelineCanvas({ tasks, zoomLevel, searchQuery, variant = "timeline", onUndoPush }: TimelineCanvasProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(800);
    const isSyncingRef = useRef(false);
    const isGantt = variant === "gantt";

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        if (isSyncingRef.current) return;
        isSyncingRef.current = true;
        const targetScrollTop = e.currentTarget.scrollTop;
        setScrollTop(targetScrollTop);
        const otherPanel = e.currentTarget === sidebarRef.current ? scrollContainerRef.current : sidebarRef.current;
        if (otherPanel && Math.abs(otherPanel.scrollTop - targetScrollTop) > 1) {
            otherPanel.scrollTop = targetScrollTop;
        }
        isSyncingRef.current = false;
    }, []);

    const taskTree = useMemo(() => {
        const map = new Map<string, any>(tasks.map(t => [t.id, { ...t, children: [] }]));
        const roots: any[] = [];
        map.forEach(task => {
            if (task.parentId && map.has(task.parentId)) {
                map.get(task.parentId).children.push(task);
            } else {
                roots.push(task);
            }
        });
        return roots;
    }, [tasks]);

    const allFlattenedTasks = useMemo(() => {
        const flattened: any[] = [];
        function flatten(nodes: any[], depth = 0) {
            nodes.forEach(node => {
                flattened.push({ ...node, depth });
                if (!collapsedIds.has(node.id) && node.children.length > 0) {
                    flatten(node.children, depth + 1);
                }
            });
        }
        flatten(taskTree);
        return flattened.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [taskTree, collapsedIds, searchQuery]);

    const visibleRange = useMemo(() => {
        const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - VISIBLE_BUFFER);
        const end = Math.min(allFlattenedTasks.length, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + VISIBLE_BUFFER);
        return { start, end };
    }, [scrollTop, viewportHeight, allFlattenedTasks.length]);

    const visibleTasks = allFlattenedTasks.slice(visibleRange.start, visibleRange.end);

    const toggleCollapse = (id: string) => {
        setCollapsedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const startDate = useMemo(() => startOfMonth(addDays(new Date(), -30)), []);
    const endDate = useMemo(() => endOfMonth(addDays(new Date(), 180)), []);
    const days = useMemo(() => eachDayOfInterval({ start: startDate, end: endDate }), [startDate, endDate]);
    const months = useMemo(() => eachMonthOfInterval({ start: startDate, end: endDate }), [startDate, endDate]);

    const cellWidth = useMemo(() => ZOOM_CELL_WIDTHS[zoomLevel] || 160, [zoomLevel]);

    const criticalPath = useMemo(() => {
        if (!isGantt || !Array.isArray(taskTree)) return new Set();
        const flatten = (nodes: any[]): any[] => {
            if (!Array.isArray(nodes) || nodes.length === 0) return [];
            return nodes.flatMap((n: any) => [n, ...flatten(Array.isArray(n.children) ? n.children : [])]);
        };
        const unfiltered = taskTree.flatMap((nodes) => flatten(nodes));
        const schedulingTasks = unfiltered.map(t => ({
            id: t.id,
            startDate: t.startDate ? new Date(t.startDate) : null,
            dueDate: t.dueDate ? new Date(t.dueDate) : null,
            durationMinutes: t.startDate && t.dueDate ? differenceInMinutes(new Date(t.dueDate), new Date(t.startDate)) : 0,
            schedulingMode: t.schedulingMode || "auto",
            predecessors: t.predecessors?.map((p: any) => ({
                predecessorId: p.predecessorId,
                type: p.type,
                lagMinutes: p.lag || 0
            })) || []
        }));
        return detectCriticalPath(schedulingTasks);
    }, [taskTree, isGantt]);

    const handleTaskUpdate = useCallback(async (taskId: string, updates: any, prevState?: any) => {
        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error("Update failed");
            if (onUndoPush && prevState) {
                onUndoPush({ type: "drag", taskId, previous: prevState, next: updates, timestamp: Date.now() });
            }
        } catch (error) {
            console.error(error);
        }
    }, [onUndoPush]);

    useEffect(() => {
        if (scrollContainerRef.current) {
            const today = new Date();
            const daysFromStart = days.findIndex(d => isSameDay(d, today));
            if (daysFromStart !== -1) {
                scrollContainerRef.current.scrollLeft = daysFromStart * cellWidth - 200;
            }
        }
        const handleResize = () => setViewportHeight(window.innerHeight - 200);
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [cellWidth, days]);

    const todayIndex = days.findIndex(d => isSameDay(d, new Date()));

    return (
        <div className="flex h-full border-t overflow-hidden flex-col">
            <div className="flex flex-1 overflow-hidden">
                <div className={cn(
                    "border-r bg-background/80 backdrop-blur-xl flex flex-col z-10 shadow-2xl relative",
                    isGantt ? "w-[350px]" : "w-[300px]"
                )}>
                    <div className="h-24 border-b flex items-center px-8 bg-secondary/20 font-semibold text-[10px] text-muted-foreground/60">
                        {isGantt ? "Project Tasks" : "Timeline Tasks"}
                    </div>
                    <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none" ref={sidebarRef} onScroll={handleScroll}>
                        <div style={{ height: allFlattenedTasks.length * ROW_HEIGHT, position: "relative" }}>
                            {visibleTasks.map((task, index) => (
                                <div
                                    key={task.id}
                                    style={{
                                        position: "absolute",
                                        top: (visibleRange.start + index) * ROW_HEIGHT,
                                        width: "100%",
                                        paddingLeft: `${task.depth * 20 + 20}px`
                                    }}
                                    className="h-16 flex items-center pr-4 border-b hover:bg-primary/5 transition-all group cursor-pointer"
                                    onClick={() => task.children.length > 0 && toggleCollapse(task.id)}
                                >
                                    <div className="flex items-center gap-3 w-full">
                                        {task.children.length > 0 ? (
                                            collapsedIds.has(task.id) ? <ChevronRight className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-primary" />
                                        ) : (
                                            <div className="w-4" />
                                        )}
                                        {task.isSummary ? <Folder className="h-4 w-4 text-amber-500 fill-amber-500/20" /> : <FileText className="h-4 w-4 text-blue-500/60" />}
                                        <span className={cn("text-xs truncate transition-all", task.isSummary ? "font-semibold" : "font-medium")}>
                                            {task.title}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-auto relative"
                >
                    <div style={{ width: days.length * cellWidth, height: allFlattenedTasks.length * ROW_HEIGHT + 96 }} className="relative">
                        <div className="sticky top-0 bg-background/90 backdrop-blur-xl border-b flex flex-col z-20" style={{ width: days.length * cellWidth }}>
                            <div className="flex h-12 border-b">
                                {months.map((month, i) => (
                                    <div key={i} style={{ width: days.filter(d => d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear()).length * cellWidth }} className="h-full border-r flex items-center px-6 text-[10px] font-semibold text-primary/80">
                                        {format(month, "MMMM yyyy")}
                                    </div>
                                ))}
                            </div>
                            <div className="flex h-12">
                                {days.map((day, i) => (
                                    <div key={i} style={{ width: cellWidth }} className={cn(
                                        "h-full border-r flex flex-col items-center justify-center text-[8px] font-semibold relative",
                                        isToday(day) ? "bg-primary/20 text-primary shadow-inner" : isWeekend(day) ? "bg-muted/30" : "text-muted-foreground/40"
                                    )}>
                                        <span>{format(day, "eee")}</span>
                                        <span className="text-xs">{format(day, "dd")}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 pointer-events-none flex">
                                {days.map((day, i) => (
                                    <div key={i} style={{ width: cellWidth }} className={cn(
                                        "h-full border-r relative",
                                        isToday(day) && "bg-primary/5 border-r-primary/40",
                                        isWeekend(day) && "bg-muted/10"
                                    )} />
                                ))}
                            </div>

                            <div className="relative z-10">
                                {isGantt && <DependencyEngine tasks={allFlattenedTasks} timelineStart={startDate} cellWidth={cellWidth} />}
                                {visibleTasks.map((task, index) => {
                                    const prevState = task.startDate || task.dueDate ? { startDate: task.startDate, dueDate: task.dueDate } : undefined;
                                    return (
                                        <div
                                            key={task.id}
                                            style={{
                                                position: "absolute",
                                                top: (visibleRange.start + index) * ROW_HEIGHT,
                                                width: days.length * cellWidth
                                            }}
                                            className="h-16 flex items-center relative group"
                                        >
                                            <TaskBar
                                                task={{
                                                    ...task,
                                                    isCritical: criticalPath.has(task.id)
                                                }}
                                                timelineStart={startDate}
                                                cellWidth={cellWidth}
                                                onUpdate={(updates) => handleTaskUpdate(task.id, updates, prevState)}
                                            />
                                            <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 -z-10 transition-colors pointer-events-none" />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {todayIndex >= 0 && (
                            <div className="absolute top-0 bottom-0 w-[2px] bg-primary/50 shadow-[0_0_15px_rgba(139,92,246,0.5)] z-30 pointer-events-none" style={{ left: todayIndex * cellWidth + cellWidth / 2 }}>
                                <div className="sticky top-20 -translate-x-1/2 w-4 h-4 rounded-full bg-primary flex items-center justify-center shadow-2xl">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isGantt && <ResourceHeatmap tasks={tasks} startDate={startDate} daysCount={days.length} cellWidth={cellWidth} />}
        </div>
    );
}
