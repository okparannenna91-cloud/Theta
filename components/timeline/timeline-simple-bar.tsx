"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import { differenceInDays, startOfDay, addDays, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Milestone, GripVertical } from "lucide-react";
import { getTaskLeft, getTaskWidth, getPriorityColor, getStatusColor, getDateFromX, MINI_AVATAR_SIZE } from "./timeline-utils";
import { useWorkspace } from "@/hooks/use-workspace";
import { useWorkspaceMembers } from "@/hooks/use-workspace-members";
import { UserAvatar } from "@/components/ui/user-avatar";

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

  const { activeWorkspaceId } = useWorkspace();
  const { memberMap } = useWorkspaceMembers(activeWorkspaceId);

  const assigneeMembers = useMemo(() => {
    return (task.assigneeIds || [])
      .map((id: string) => memberMap[id])
      .filter(Boolean);
  }, [task.assigneeIds, memberMap]);

  const barColor = useMemo(() => {
    if (task.color) return task.color;
    return getPriorityColor(task.priority);
  }, [task.color, task.priority]);

  const statusColor = getStatusColor(task.status);
  const BAR_HEIGHT = 28;
  const MIN_BAR_FOR_AVATARS = 80;

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
      setDragOffset(rawDelta);
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
    // Use continuous pixel movement for visual feedback, snap only on final commit
    const onMouseMove = (me: MouseEvent) => {
      const delta = me.clientX - startX;
      setResizeDrag({ direction, startX, currentDelta: delta });
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

  const showAvatars = visualWidth >= MIN_BAR_FOR_AVATARS && assigneeMembers.length > 0;
  const maxAvatars = visualWidth >= 120 ? 2 : 1;
  const visibleAvatars = assigneeMembers.slice(0, maxAvatars);
  const avatarOverflow = assigneeMembers.length - visibleAvatars.length;
  const showProgressPct = task.progress > 0 && visualWidth > 100;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ height: rowHeight }}
    >
      <div
        ref={barRef}
        data-task-id={task.id}
        data-task-bar="true"
        onMouseDown={handleMouseDown}
        style={{
          left: visualLeft,
          width: Math.max(visualWidth, 16),
          top: (rowHeight - BAR_HEIGHT) / 2,
          height: BAR_HEIGHT,
          pointerEvents: "auto",
          zIndex: isDragging ? 50 : 10,
        }}
        className={cn(
          "absolute rounded-md border flex items-center px-1.5 cursor-grab active:cursor-grabbing",
          "backdrop-blur-xl shadow-sm transition-all duration-150",
          "hover:shadow-md hover:z-20",
          isDragging && "ring-2 ring-primary/50 shadow-2xl scale-y-110 z-50",
          resizeDrag && "ring-2 ring-primary/50"
        )}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* Priority accent stripe - left edge */}
        <div
          className="absolute left-0 top-0.5 bottom-0.5 w-[3px] rounded-l-sm"
          style={{ backgroundColor: barColor }}
        />

        {/* Status-based background fill */}
        <div
          className="absolute inset-0 rounded-md opacity-15 pointer-events-none"
          style={{ backgroundColor: statusColor }}
        />

        {/* Hover glow overlay */}
        <div
          className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${statusColor}08, transparent 60%)`,
          }}
        />

        {/* Progress bar - bottom edge */}
        {task.progress > 0 && (
          <div
            className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-md pointer-events-none overflow-hidden"
          >
            <div
              className="h-full transition-all duration-300 ease-out"
              style={{
                backgroundColor: statusColor,
                width: `${Math.min(100, Math.max(0, task.progress))}%`,
              }}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex items-center gap-1 w-full min-w-0 relative z-10">
          {/* Status dot */}
          <div
            className="h-[7px] w-[7px] rounded-full flex-shrink-0 ring-[0.5px] ring-background/50"
            style={{ backgroundColor: statusColor }}
          />

          {/* Title */}
          {width > 60 && (
            <span className="text-[10px] font-semibold truncate text-foreground/90 leading-none">
              {task.title}
            </span>
          )}

          {/* Progress % */}
          {showProgressPct && (
            <span className="text-[7px] font-semibold text-muted-foreground/50 flex-shrink-0 ml-auto">
              {Math.round(task.progress)}%
            </span>
          )}

          {/* Assignee avatars */}
          {showAvatars && (
            <div className="flex items-center -space-x-1 flex-shrink-0 ml-1">
              {visibleAvatars.map((m: any) => (
                <UserAvatar
                  key={m.id}
                  imageUrl={m.imageUrl}
                  name={m.name}
                  size="sm"
                  className="ring-[0.5px] ring-background/50"
                />
              ))}
              {avatarOverflow > 0 && (
                <div className="h-[18px] w-[18px] rounded-full bg-muted ring-[0.5px] ring-background/50 flex items-center justify-center text-[7px] font-medium text-muted-foreground">
                  +{avatarOverflow}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Resize handles */}
        <div
          onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, "left"); }}
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-l-md z-30 pointer-events-auto opacity-0 group-hover:opacity-100 hover:bg-white/15 transition-all"
        />
        <div
          onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, "right"); }}
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-r-md z-30 pointer-events-auto opacity-0 group-hover:opacity-100 hover:bg-white/15 transition-all"
        />
      </div>
    </div>
  );
}