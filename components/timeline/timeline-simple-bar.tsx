"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import { differenceInDays, startOfDay, addDays, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Milestone, GripVertical } from "lucide-react";
import { getTaskLeft, getTaskWidth, getPriorityColor, getStatusColor, getDateFromX } from "./timeline-utils";

interface TimelineSimpleBarProps {
  task: any;
  timelineStart: Date;
  cellWidth: number;
  rowHeight: number;
  isHovered: boolean;
  onUpdate?: (updates: any) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function TimelineSimpleBar({
  task,
  timelineStart,
  cellWidth,
  rowHeight,
  isHovered,
  onUpdate,
  onDragStart,
  onDragEnd,
  onMouseEnter,
  onMouseLeave,
}: TimelineSimpleBarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [resizeDrag, setResizeDrag] = useState<{ direction: "left" | "right"; startX: number; currentDelta: number } | null>(null);
  const dragStartRef = useRef<{ mouseX: number; startDate: string; dueDate: string } | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const snapUnitMinutes = 1440;

  const left = getTaskLeft(task, timelineStart, cellWidth);
  const width = getTaskWidth(task, cellWidth);
  const isMilestone = task.isMilestone;

  const visualLeft = dragOffset !== 0 ? left + dragOffset : (resizeDrag?.direction === "left" ? left + resizeDrag.currentDelta : left);
  const visualWidth = resizeDrag
    ? resizeDrag.direction === "left"
      ? width - resizeDrag.currentDelta
      : width + resizeDrag.currentDelta
    : width;

  const barColor = useMemo(() => {
    if (task.color) return task.color;
    return getPriorityColor(task.priority);
  }, [task.color, task.priority]);

  const statusColor = getStatusColor(task.status);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || e.shiftKey) return;
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    onDragStart?.();

    const startX = e.clientX;
    const taskStartDate = task.startDate || task.dueDate || new Date().toISOString();
    const taskDueDate = task.dueDate || task.startDate || new Date().toISOString();
    dragStartRef.current = { mouseX: startX, startDate: taskStartDate, dueDate: taskDueDate };

    const onMouseMove = (me: MouseEvent) => {
      const rawDelta = me.clientX - startX;
      const snappedPixels = Math.round(rawDelta / cellWidth) * cellWidth;
      setDragOffset(snappedPixels);
    };

    const onMouseUp = (ue: MouseEvent) => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      setIsDragging(false);
      setDragOffset(0);

      if (!onUpdate || !dragStartRef.current) {
        onDragEnd?.();
        dragStartRef.current = null;
        return;
      }

      const rawDelta = ue.clientX - dragStartRef.current.mouseX;
      const daysMoved = Math.round(rawDelta / cellWidth);
      if (daysMoved !== 0) {
        onUpdate({
          startDate: addDays(parseISO(dragStartRef.current.startDate), daysMoved).toISOString(),
          dueDate: addDays(parseISO(dragStartRef.current.dueDate), daysMoved).toISOString(),
        });
      }
      dragStartRef.current = null;
      onDragEnd?.();
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [onUpdate, task, cellWidth, onDragStart, onDragEnd]);

  const handleResizeStart = useCallback((e: React.MouseEvent, direction: "left" | "right") => {
    e.preventDefault();
    e.stopPropagation();
    onDragStart?.();

    const startX = e.clientX;
    const onMouseMove = (me: MouseEvent) => {
      const rawDelta = me.clientX - startX;
      const snappedDelta = Math.round(rawDelta / cellWidth) * cellWidth;
      setResizeDrag({ direction, startX, currentDelta: snappedDelta });
    };

    const onMouseUp = (ue: MouseEvent) => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      setResizeDrag(null);
      onDragEnd?.();

      const rawDelta = ue.clientX - startX;
      const daysDelta = Math.round(rawDelta / cellWidth);
      if (daysDelta === 0) return;

      if (direction === "left") {
        const taskStart = task.startDate ? parseISO(task.startDate) : (task.dueDate ? parseISO(task.dueDate) : new Date());
        onUpdate?.({ startDate: addDays(taskStart, daysDelta).toISOString() });
      } else {
        const taskEnd = task.dueDate ? parseISO(task.dueDate) : (task.startDate ? parseISO(task.startDate) : new Date());
        onUpdate?.({ dueDate: addDays(taskEnd, daysDelta).toISOString() });
      }
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [onUpdate, task, cellWidth, onDragStart, onDragEnd]);

  if (isMilestone) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          left: (dragOffset !== 0 ? left + dragOffset : left) - 12,
          top: (rowHeight - 24) / 2,
          zIndex: isDragging ? 50 : 10,
        }}
        className="absolute flex items-center justify-center cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div
          className={cn(
            "w-6 h-6 rotate-45 border-2 border-white dark:border-slate-800 shadow-xl transition-transform hover:scale-125 overflow-hidden",
            task.color || "bg-amber-500"
          )}
        >
          <div className="-rotate-45 flex items-center justify-center h-full">
            <Milestone className="w-2.5 h-2.5 text-white" />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ height: rowHeight }}
    >
      <div
        ref={barRef}
        onMouseDown={handleMouseDown}
        style={{
          left: visualLeft,
          width: Math.max(visualWidth, 16),
          top: (rowHeight - 28) / 2,
          height: 28,
          pointerEvents: "auto",
          zIndex: isDragging ? 50 : 10,
          backgroundColor: `${barColor}22`,
          borderColor: `${barColor}44`,
        }}
        className={cn(
          "absolute rounded-md border flex items-center px-2 cursor-grab active:cursor-grabbing",
          "backdrop-blur-xl shadow-lg transition-shadow hover:shadow-xl",
          isDragging && "ring-2 ring-primary/50 shadow-2xl scale-y-110 z-50",
          resizeDrag && "ring-2 ring-primary/50"
        )}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div
          className="absolute left-0 top-0 bottom-0 rounded-l-md opacity-20 pointer-events-none"
          style={{ backgroundColor: barColor, width: "100%" }}
        />
        {task.progress > 0 && (
          <div
            className="absolute left-0 top-0 bottom-0 rounded-l-md opacity-30 pointer-events-none"
            style={{
              backgroundColor: barColor,
              width: `${Math.min(100, Math.max(0, task.progress))}%`,
              transition: "width 0.3s ease",
            }}
          />
        )}
        <div className="flex items-center gap-1.5 w-full min-w-0 relative z-10">
          <div
            className="h-2 w-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: statusColor }}
          />
          {width > 60 && (
            <span className="text-[10px] font-semibold truncate text-foreground/90">
              {task.title}
            </span>
          )}
          {task.progress > 0 && width > 100 && (
            <span className="text-[8px] font-semibold text-muted-foreground/60 flex-shrink-0 ml-auto">
              {Math.round(task.progress)}%
            </span>
          )}
        </div>

        <div
          onMouseDown={(e) => handleResizeStart(e, "left")}
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/30 rounded-l-md z-20 pointer-events-auto"
        />
        <div
          onMouseDown={(e) => handleResizeStart(e, "right")}
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/30 rounded-r-md z-20 pointer-events-auto"
        />
      </div>
    </div>
  );
}