"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { PRIORITY_CONFIG } from "./calendar-types";
import type { CalendarEvent, EventPlacement } from "./calendar-types";
import { CalendarTooltip } from "./calendar-tooltip";

interface TaskBarProps {
  placement: EventPlacement;
  weekDays: Date[];
  maxLanes: number;
  onEventClick?: (event: CalendarEvent) => void;
  onDragStart?: (event: CalendarEvent, e: React.MouseEvent) => void;
  onResizeStart?: (event: CalendarEvent, edge: "left" | "right", e: React.MouseEvent) => void;
}

export type { TaskBarProps };

export function TaskBar({ placement, weekDays, maxLanes, onEventClick, onDragStart, onResizeStart }: TaskBarProps) {
  const { event, columnSpan, laneIndex, continuesFromPrev, continuesToNext } = placement;
  const columnStart = continuesFromPrev ? 1 : placement.columnStart;
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const barRef = useRef<HTMLDivElement>(null);

  const isSingleDay = columnSpan === 1 && !continuesFromPrev && !continuesToNext;
  const isMilestone = event.isMilestone;

  const priorityColor = PRIORITY_CONFIG[event.priority]?.color || PRIORITY_CONFIG.none.color;
  const statusColors: Record<string, string> = {
    todo: "#9ca3af",
    in_progress: "#3b82f6",
    "in-progress": "#3b82f6",
    review: "#8b5cf6",
    done: "#10b981",
  };
  const statusColor = statusColors[event.status] || "#9ca3af";

  const leftRounded = isSingleDay || (!continuesFromPrev && columnSpan > 0);
  const rightRounded = isSingleDay || !continuesToNext;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    onDragStart?.(event, e);
  }, [event, onDragStart]);

  const handleResizeLeft = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onResizeStart?.(event, "left", e);
  }, [event, onResizeStart]);

  const handleResizeRight = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onResizeStart?.(event, "right", e);
  }, [event, onResizeStart]);

  if (isMilestone) {
    return (
      <div
        className="flex items-center gap-1.5 px-1 cursor-pointer group"
        style={{ gridColumn: `${columnStart} / span ${columnSpan}`, gridRow: laneIndex + 2 }}
        onClick={() => onEventClick?.(event)}
        onMouseEnter={(e) => { setIsHovered(true); setTooltipPos({ x: e.clientX, y: e.clientY }); }}
        onMouseLeave={() => setIsHovered(false)}
        onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
      >
        <div className="flex items-center gap-1 text-foreground/70 group-hover:text-foreground transition-colors">
          <span className="text-sm">◇</span>
          <span className="text-xs font-medium truncate">{event.title}</span>
        </div>
        {isHovered && <CalendarTooltip event={event} x={tooltipPos.x} y={tooltipPos.y} />}
      </div>
    );
  }

  return (
    <div
      ref={barRef}
      className={cn(
        "relative flex items-center gap-1 px-1.5 py-0.5 select-none transition-shadow group",
        "hover:shadow-md hover:z-10",
        event.isCompleted && "opacity-50",
      )}
      style={{
        gridColumn: `${columnStart} / span ${columnSpan}`,
        gridRow: laneIndex + 2,
        borderRadius: leftRounded ? "6px 0 0 6px" : "0",
        ...(rightRounded ? { borderRadius: leftRounded ? "6px" : "0 6px 6px 0" } : {}),
      }}
      onClick={() => onEventClick?.(event)}
      onMouseDown={handleMouseDown}
      onMouseEnter={(e) => { setIsHovered(true); setTooltipPos({ x: e.clientX, y: e.clientY }); }}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
    >
      <div
        className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
        style={{ backgroundColor: priorityColor }}
      />

      {!continuesFromPrev && !isSingleDay && (
        <div
          className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-20 hover:bg-primary/20 rounded-l-[6px] transition-colors"
          onMouseDown={handleResizeLeft}
        />
      )}

      {continuesFromPrev && (
        <span className="text-[9px] text-muted-foreground/50 flex-shrink-0 ml-1">◀</span>
      )}

      <span className="text-[11px] font-medium truncate flex-1 text-foreground/80 group-hover:text-foreground transition-colors">
        {event.title}
      </span>

      <div className="flex items-center gap-1 flex-shrink-0">
        {columnSpan >= 3 && (
          <div
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: statusColor }}
          />
        )}
      </div>

      {continuesToNext && (
        <span className="text-[9px] text-muted-foreground/50 flex-shrink-0 mr-1">▶</span>
      )}

      {!continuesToNext && !isSingleDay && (
        <div
          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-20 hover:bg-primary/20 rounded-r-[6px] transition-colors"
          onMouseDown={handleResizeRight}
        />
      )}

      {isHovered && <CalendarTooltip event={event} x={tooltipPos.x} y={tooltipPos.y} />}
    </div>
  );
}

export default TaskBar;
