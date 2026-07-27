"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { PRIORITY_CONFIG } from "./calendar-types";
import type { CalendarEvent, EventPlacement } from "./calendar-types";
import { CalendarTooltip } from "./calendar-tooltip";
import { useWorkspace } from "@/hooks/use-workspace";
import { useWorkspaceMembers } from "@/hooks/use-workspace-members";
import { UserAvatar } from "@/components/ui/user-avatar";

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

  const { activeWorkspaceId } = useWorkspace();
  const { memberMap } = useWorkspaceMembers(activeWorkspaceId);

  const assigneeMembers = useMemo(() => {
    return (event.assigneeIds || [])
      .map((id: string) => memberMap[id])
      .filter(Boolean);
  }, [event.assigneeIds, memberMap]);

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
  const showAvatars = columnSpan >= 2 && assigneeMembers.length > 0;
  const maxVisAvatars = columnSpan >= 3 ? 2 : 1;
  const visibleAvatars = assigneeMembers.slice(0, maxVisAvatars);
  const avatarOverflow = assigneeMembers.length - visibleAvatars.length;

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
      data-event-id={event.id}
      data-event-bar="true"
      className={cn(
        "relative select-none calendar-event-enter group",
        "transition-all duration-150 ease-out",
        "hover:shadow-lg hover:z-20 hover:-translate-y-[1px]",
        event.isCompleted && "opacity-50",
        isDragging && "opacity-60 scale-[1.02] shadow-xl z-30",
        "rounded-[5px] border border-border/40",
        continuesFromPrev && "rounded-l-none border-l-0",
        continuesToNext && "rounded-r-none border-r-0",
      )}
      style={{
        gridColumn: `${columnStart} / span ${columnSpan}`,
        gridRow: laneIndex + 2,
        margin: "1px 1px",
        backgroundColor: `${event.color}15`,
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={(e) => { setIsHovered(true); setTooltipPos({ x: e.clientX, y: e.clientY }); }}
      onMouseLeave={() => { setIsHovered(false); setIsDragging(false); }}
      onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
    >
      {/* Priority accent stripe - left edge */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[4px] transition-all duration-200"
        style={{ backgroundColor: priorityColor }}
      />

      {/* Status-based background fill */}
      <div
        className="absolute inset-0 rounded-[inherit] opacity-[0.06] pointer-events-none"
        style={{ backgroundColor: statusColor }}
      />

      {/* Hover glow */}
      <div
        className="absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${priorityColor}06, transparent 60%)`,
        }}
      />

      {/* Progress bar - bottom edge */}
      {event.progress > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-[4px] pointer-events-none overflow-hidden">
          <div
            className="h-full transition-all duration-300 ease-out"
            style={{
              backgroundColor: statusColor,
              width: `${Math.min(100, Math.max(0, event.progress))}%`,
            }}
          />
        </div>
      )}

      {!continuesFromPrev && !isSingleDay && (
        <div
          className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-20 hover:bg-primary/20 rounded-l-[5px] transition-colors duration-150"
          onMouseDown={handleResizeLeft}
        />
      )}

      {continuesFromPrev && (
        <span className="text-[9px] text-muted-foreground/40 flex-shrink-0 ml-0.5 drop-shadow-sm">◀</span>
      )}

      <div className="flex flex-col gap-0 py-0.5 px-1.5 relative z-10">
        {/* Title row */}
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-[11px] font-medium truncate text-foreground/80 group-hover:text-foreground transition-colors duration-200 leading-tight">
            {event.title}
          </span>
        </div>

        {/* Meta row - status + avatars */}
        <div className="flex items-center gap-1 min-w-0">
          <div
            className="w-[6px] h-[6px] rounded-full flex-shrink-0 ring-[0.5px] ring-background/50"
            style={{ backgroundColor: statusColor }}
          />
          {showAvatars && (
            <div className="flex items-center -space-x-1 ml-0.5">
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
                <div className="h-[16px] w-[16px] rounded-full bg-muted ring-[0.5px] ring-background/50 flex items-center justify-center text-[6px] font-medium text-muted-foreground">
                  +{avatarOverflow}
                </div>
              )}
            </div>
          )}
          {isHovered && (
            <span className="text-[7px] text-muted-foreground/50 px-1 rounded bg-muted/50 truncate max-w-[50px] ml-auto">
              {event.status.replace(/[_-]/g, " ")}
            </span>
          )}
        </div>
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
