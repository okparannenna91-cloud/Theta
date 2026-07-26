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
  onDragStart?: (event: CalendarEvent, e: React.MouseEvent) => void;
  onResizeStart?: (event: CalendarEvent, edge: "left" | "right", e: React.MouseEvent) => void;
}

export type { TaskBarProps };

export function TaskBar({ placement, weekDays, maxLanes, onDragStart, onResizeStart }: TaskBarProps) {
  const { event, columnSpan, laneIndex, continuesFromPrev, continuesToNext } = placement;
  const columnStart = continuesFromPrev ? 1 : placement.columnStart;
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
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
    setIsDragging(true);
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
        className="flex items-center gap-1.5 px-1 cursor-default group"
        style={{ gridColumn: `${columnStart} / span ${columnSpan}`, gridRow: laneIndex + 2 }}
        onMouseEnter={(e) => { setIsHovered(true); setTooltipPos({ x: e.clientX, y: e.clientY }); }}
        onMouseLeave={() => setIsHovered(false)}
        onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
      >
        <div className="flex items-center gap-1 text-foreground/50 group-hover:text-foreground transition-all duration-200">
          <span className="text-sm drop-shadow-sm">◆</span>
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
        "relative flex items-center gap-1 px-1.5 py-0.5 select-none calendar-event-enter",
        "transition-all duration-150 ease-out group",
        "hover:shadow-lg hover:z-20 hover:scale-y-[1.04] hover:origin-left",
        event.isCompleted && "opacity-50",
        isDragging && "opacity-60 scale-105 shadow-xl z-30",
      )}
      style={{
        gridColumn: `${columnStart} / span ${columnSpan}`,
        gridRow: laneIndex + 2,
        borderRadius: leftRounded ? "5px 0 0 5px" : "0",
        ...(rightRounded ? { borderRadius: leftRounded ? "5px" : "0 5px 5px 0" } : {}),
        backgroundColor: `${event.color}18`,
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={(e) => { setIsHovered(true); setTooltipPos({ x: e.clientX, y: e.clientY }); }}
      onMouseLeave={() => { setIsHovered(false); setIsDragging(false); }}
      onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
    >
      <div
        className="absolute left-0 top-0.5 bottom-0.5 w-0.5 rounded-full transition-all duration-200"
        style={{ backgroundColor: priorityColor }}
      />

      <div
        className="absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${priorityColor}08, transparent 60%)`,
        }}
      />

      {!continuesFromPrev && !isSingleDay && (
        <div
          className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-20 hover:bg-primary/20 rounded-l-[5px] transition-colors duration-150"
          onMouseDown={handleResizeLeft}
        />
      )}

      {continuesFromPrev && (
        <span className="text-[9px] text-muted-foreground/40 flex-shrink-0 ml-0.5 drop-shadow-sm">◀</span>
      )}

      <span className="text-[11px] font-medium truncate flex-1 text-foreground/70 group-hover:text-foreground transition-colors duration-200">
        {event.title}
      </span>

      <div className="flex items-center gap-1 flex-shrink-0 mr-0.5">
        {isHovered && (
          <span className="text-[9px] text-muted-foreground/50 px-1 py-0.5 rounded bg-muted/50 truncate max-w-[60px]">
            {event.status.replace(/[_-]/g, " ")}
          </span>
        )}
        {columnSpan >= 3 && !isHovered && (
          <div
            className="w-1.5 h-1.5 rounded-full flex-shrink-0 ring-1 ring-background"
            style={{ backgroundColor: statusColor }}
          />
        )}
      </div>

      {continuesToNext && (
        <span className="text-[9px] text-muted-foreground/40 flex-shrink-0 mr-0.5 drop-shadow-sm">▶</span>
      )}

      {!continuesToNext && !isSingleDay && (
        <div
          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-20 hover:bg-primary/20 rounded-r-[5px] transition-colors duration-150"
          onMouseDown={handleResizeRight}
        />
      )}

      {isHovered && <CalendarTooltip event={event} x={tooltipPos.x} y={tooltipPos.y} />}
    </div>
  );
}

export default TaskBar;
