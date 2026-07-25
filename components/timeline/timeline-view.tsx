"use client";

import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { format, isToday, isWeekend, startOfDay, addDays, addWeeks, addMonths, addQuarters, parseISO, eachDayOfInterval, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown, Plus } from "lucide-react";
import { useWorkspace } from "@/hooks/use-workspace";
import { invalidateTaskCaches } from "@/lib/invalidate-task-caches";
import { TimelineSimpleBar } from "./timeline-simple-bar";
import { TimelineHoverCard } from "./timeline-hover-card";
import {
  computeDateRange, computeTimeUnits, getDateFromX, ROW_HEIGHT, LANE_HEADER_HEIGHT,
  HEADER_HEIGHT, HEADER_SUB_HEIGHT, SIDEBAR_WIDTH, CELL_WIDTHS,
  groupTasks, GroupByKey,
} from "./timeline-utils";
import type { ZoomLevel } from "@/components/shared/timeline/types";

export interface TimelineViewProps {
  tasks: any[];
  zoomLevel: ZoomLevel;
  searchQuery: string;
  groupBy: GroupByKey | "none";
  collapsedGroups: Set<string>;
  onToggleGroup: (key: string) => void;
  showMilestones: boolean;
  showWeekends: boolean;
  onTaskUpdate: (taskId: string, updates: any) => void;
  onTaskClick: (task: any) => void;
  onCreateTask: (startDate: string, endDate: string) => void;
  onLogActivity: (action: string, taskId: string, metadata?: any) => void;
  dateOffset?: number;
}

export function TimelineView({
  tasks,
  zoomLevel,
  searchQuery,
  groupBy,
  collapsedGroups,
  onToggleGroup,
  showMilestones,
  showWeekends,
  onTaskUpdate,
  onTaskClick,
  onCreateTask,
  onLogActivity,
  dateOffset = 0,
}: TimelineViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(1200);
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [dragCreate, setDragCreate] = useState<{ startX: number; currentX: number; startDate: Date } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, scrollLeft: 0 });

  const isSyncingRef = useRef(false);
  const cellWidth = CELL_WIDTHS[zoomLevel] || CELL_WIDTHS.week;

  const { start: timelineStart, end: timelineEnd } = useMemo(
    () => computeDateRange(zoomLevel),
    [zoomLevel]
  );

  const { units: timeUnits, headers: headerLevels } = useMemo(
    () => computeTimeUnits(zoomLevel, timelineStart, timelineEnd),
    [zoomLevel, timelineStart, timelineEnd]
  );

  const totalTimelineWidth = timeUnits.length * cellWidth;

  const filteredTasks = useMemo(() => {
    let result = tasks;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t: any) => t.title?.toLowerCase().includes(q));
    }

    if (!showMilestones) {
      result = result.filter((t: any) => !t.isMilestone);
    }

    const hasDates = result.some((t: any) => t.startDate || t.dueDate);
    if (hasDates) {
      result = result.filter((t: any) => t.startDate || t.dueDate);
    }

    return result;
  }, [tasks, searchQuery, showMilestones]);

  const grouped = useMemo(
    () => groupTasks(filteredTasks, groupBy),
    [filteredTasks, groupBy]
  );

  const visibleGroups = useMemo(
    () => grouped.filter(g => !collapsedGroups.has(g.key)),
    [grouped, collapsedGroups]
  );

  const currentDate = useMemo(() => {
    const base = new Date();
    switch (zoomLevel) {
      case "day": return addDays(base, dateOffset * 7);
      case "week": return addWeeks(base, dateOffset);
      case "month": return addMonths(base, dateOffset);
      case "quarter": return addQuarters(base, dateOffset);
      default: return addDays(base, dateOffset * 7);
    }
  }, [zoomLevel, dateOffset]);

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth - SIDEBAR_WIDTH - 40);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (scrollContainerRef.current) {
      const todayIdx = timeUnits.findIndex(u => isToday(u.date));
      if (todayIdx !== -1) {
        scrollContainerRef.current.scrollLeft = todayIdx * cellWidth - viewportWidth / 3;
      }
    }
  }, [cellWidth, timeUnits, viewportWidth]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    const target = e.currentTarget;
    const isTimeline = target === scrollContainerRef.current;
    if (isTimeline) setScrollLeft(target.scrollLeft);
    const otherPanel = isTimeline ? sidebarRef.current : scrollContainerRef.current;
    if (otherPanel && Math.abs(otherPanel.scrollTop - target.scrollTop) > 1) {
      otherPanel.scrollTop = target.scrollTop;
    }
    setScrollTop(target.scrollTop);
    isSyncingRef.current = false;
  }, []);

  const handleTimelineMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, scrollLeft: scrollContainerRef.current?.scrollLeft || 0 });
      e.preventDefault();
    }
  }, []);

  const handleTimelineMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && scrollContainerRef.current) {
      const delta = e.clientX - panStart.x;
      scrollContainerRef.current.scrollLeft = panStart.scrollLeft - delta;
    }
  }, [isPanning, panStart]);

  const handleTimelineMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent, groupKey: string) => {
    if (e.button !== 0 || e.shiftKey || (e.target as HTMLElement).closest("[data-task-bar]")) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left + (scrollContainerRef.current?.scrollLeft || 0);
    const startDate = getDateFromX(x, timelineStart, cellWidth);
    setDragCreate({ startX: x, currentX: x, startDate });
  }, [timelineStart, cellWidth]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragCreate) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left + (scrollContainerRef.current?.scrollLeft || 0);
    setDragCreate(prev => prev ? { ...prev, currentX: x } : null);
  }, [dragCreate]);

  const handleCanvasMouseUp = useCallback(() => {
    if (!dragCreate) return;
    const startDate = dragCreate.startDate;
    const rawDelta = dragCreate.currentX - dragCreate.startX;
    const daysDelta = Math.max(1, Math.round(Math.abs(rawDelta) / cellWidth));
    const endDate = addDays(startDate, rawDelta >= 0 ? daysDelta : 0);
    if (daysDelta >= 1) {
      onCreateTask(startDate.toISOString(), endDate.toISOString());
    }
    setDragCreate(null);
  }, [dragCreate, cellWidth, onCreateTask]);

  const handleBarHover = useCallback((taskId: string | null, e?: React.MouseEvent) => {
    if (taskId && e) {
      setHoveredTask(taskId);
      setHoverPos({ x: e.clientX + 16, y: e.clientY - 10 });
    } else {
      setHoveredTask(null);
    }
  }, []);

  const todayIndex = timeUnits.findIndex(u => isToday(u.date));

  let rowOffset = 0;
  const groupRows: { key: string; label: string; taskCount: number; rowStart: number; rowCount: number }[] = [];

  for (const group of grouped) {
    const isCollapsed = collapsedGroups.has(group.key);
    const count = isCollapsed ? 0 : group.tasks.length;
    groupRows.push({
      key: group.key,
      label: group.label,
      taskCount: group.tasks.length,
      rowStart: rowOffset,
      rowCount: count,
    });
    rowOffset += 1 + count;
  }

  const totalRows = rowOffset;
  const totalContentHeight = totalRows * ROW_HEIGHT + LANE_HEADER_HEIGHT;

  return (
    <div className="flex h-full overflow-hidden">
      <div
        ref={sidebarRef}
        onScroll={handleScroll}
        className="flex-shrink-0 border-r bg-background/80 backdrop-blur-xl overflow-y-auto scrollbar-none z-10"
        style={{ width: SIDEBAR_WIDTH }}
      >
        <div
          className="border-b flex items-center px-4 sticky top-0 bg-background/95 backdrop-blur-xl z-10"
          style={{ height: HEADER_HEIGHT + HEADER_SUB_HEIGHT }}
        >
          <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
            {groupBy === "none" ? "Tasks" : `${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}`}
          </span>
        </div>
        <div style={{ height: totalContentHeight, position: "relative" }}>
          {grouped.map((group) => {
            const gr = groupRows.find(r => r.key === group.key)!;
            const isCollapsed = collapsedGroups.has(group.key);
            const top = gr.rowStart * ROW_HEIGHT;

            return (
              <div key={group.key}>
                <div
                  className="flex items-center gap-2 px-4 border-b bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors sticky-top"
                  style={{ height: ROW_HEIGHT, top }}
                  onClick={() => onToggleGroup(group.key)}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="text-xs font-semibold truncate">{group.label}</span>
                  <span className="text-[10px] text-muted-foreground/60 ml-auto">{group.tasks.length}</span>
                </div>
                {!isCollapsed && group.tasks.map((task: any) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 px-4 pl-9 border-b hover:bg-primary/5 transition-colors cursor-pointer"
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => onTaskClick(task)}
                  >
                    <div
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: task.color || (task.isMilestone ? "#f59e0b" : "#64748b") }}
                    />
                    <span className="text-xs truncate">{task.title}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        onMouseDown={handleTimelineMouseDown}
        onMouseMove={handleTimelineMouseMove}
        onMouseUp={handleTimelineMouseUp}
        onMouseLeave={handleTimelineMouseUp}
        className="flex-1 overflow-auto relative select-none"
        style={{ cursor: isPanning ? "grabbing" : "default" }}
      >
        <div style={{ width: totalTimelineWidth, minHeight: "100%" }} className="relative">
          <div
            className="sticky top-0 bg-background/95 backdrop-blur-xl border-b flex flex-col z-20 shadow-sm"
            style={{ width: totalTimelineWidth }}
          >
            {headerLevels.map((level, levelIdx) => (
              <div
                key={levelIdx}
                className={cn(
                  "flex border-b",
                  levelIdx === headerLevels.length - 1 ? `h-[${HEADER_SUB_HEIGHT}px]` : `h-[${HEADER_HEIGHT - HEADER_SUB_HEIGHT}px]`
                )}
                style={{ height: levelIdx === headerLevels.length - 1 ? HEADER_SUB_HEIGHT : HEADER_HEIGHT - HEADER_SUB_HEIGHT }}
              >
                {level.map((item, i) => (
                  <div
                    key={i}
                    style={{ width: item.width, minWidth: cellWidth }}
                    className="h-full border-r flex items-center px-2 text-[9px] font-semibold text-muted-foreground/80 truncate"
                  >
                    <span className="truncate">{item.label}</span>
                    {(item as any).sublabel && (
                      <span className="ml-1 text-[8px] text-muted-foreground/40 hidden sm:inline">
                        {(item as any).sublabel}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="relative" style={{ minHeight: totalContentHeight }}>
            <div className="absolute inset-0 pointer-events-none flex">
              {timeUnits.map((unit, i) => (
                <div
                  key={i}
                  style={{ width: cellWidth, minWidth: cellWidth }}
                  className={cn(
                    "h-full border-r relative",
                    isToday(unit.date) && "bg-primary/5 border-r-primary/40",
                    unit.isWeekend && showWeekends && "bg-muted/20"
                  )}
                />
              ))}
            </div>

            {grouped.map((group) => {
              const gr = groupRows.find(r => r.key === group.key)!;
              const isCollapsed = collapsedGroups.has(group.key);
              if (isCollapsed) return null;

              return (
                <div key={group.key}>
                  {group.tasks.map((task: any, taskIdx: number) => {
                    const rowTop = (gr.rowStart + 1 + taskIdx) * ROW_HEIGHT;
                    return (
                      <div
                        key={task.id}
                        style={{
                          position: "absolute",
                          top: rowTop,
                          height: ROW_HEIGHT,
                          width: totalTimelineWidth,
                        }}
                        className="border-b group"
                        onMouseEnter={() => setHoveredTask(task.id)}
                        onMouseLeave={() => setHoveredTask(null)}
                      >
                        <TimelineSimpleBar
                          task={task}
                          timelineStart={timelineStart}
                          cellWidth={cellWidth}
                          rowHeight={ROW_HEIGHT}
                          isHovered={hoveredTask === task.id}
                          onUpdate={(updates) => {
                            onTaskUpdate(task.id, updates);
                            onLogActivity("moved", task.id, { changes: { startDate: { old: task.startDate, new: updates.startDate }, dueDate: { old: task.dueDate, new: updates.dueDate } } });
                          }}
                          onClick={() => onTaskClick(task)}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}

            <div
              className="absolute inset-0 z-5"
              onMouseDown={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest("[data-task-bar]")) return;
                if (target.closest("[data-no-dnd]")) return;
                handleCanvasMouseDown(e, "all");
              }}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
            />

            {dragCreate && (
              <div
                className="absolute top-0 h-full bg-primary/10 border-2 border-dashed border-primary/40 rounded z-40 pointer-events-none"
                style={{
                  left: Math.min(dragCreate.startX, dragCreate.currentX),
                  width: Math.abs(dragCreate.currentX - dragCreate.startX),
                }}
              >
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  {format(dragCreate.startDate, "MMM d")}
                </div>
              </div>
            )}

            {todayIndex !== -1 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-primary/60 shadow-[0_0_10px_rgba(139,92,246,0.4)] z-30 pointer-events-none"
                style={{ left: todayIndex * cellWidth + cellWidth / 2 }}
              >
                <div className="sticky top-0 -translate-x-1/2 w-3 h-3 rounded-full bg-primary flex items-center justify-center shadow-2xl">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {hoveredTask && (() => {
        const task = tasks.find((t: any) => t.id === hoveredTask);
        if (!task) return null;
        return (
          <div
            className="fixed z-50 pointer-events-none"
            style={{ left: hoverPos.x, top: hoverPos.y }}
          >
            <TimelineHoverCard task={task} />
          </div>
        );
      })()}
    </div>
  );
}