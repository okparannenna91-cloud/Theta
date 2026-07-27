"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import { differenceInDays, startOfDay, addMinutes, addDays, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Milestone, AlertCircle, CheckCircle2, GripVertical } from "lucide-react";
import { GanttTooltip } from "@/components/gantt/gantt-tooltip";

interface TaskBarProps {
    task: any;
    timelineStart: Date;
    cellWidth: number;
    snapUnit?: "hour" | "day" | "week" | "month";
    showBaseline?: boolean;
    highlightVariance?: boolean;
  onUpdate?: (updates: any) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export default function TaskBar({
    task,
    timelineStart,
    cellWidth,
    snapUnit = "day",
    showBaseline = true,
    highlightVariance = false,
    onUpdate,
    onDragStart,
    onDragEnd,
}: TaskBarProps) {
    const [resizeDrag, setResizeDrag] = useState<{ direction: "left" | "right"; deltaX: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const dragStartRef = useRef<{ mouseX: number; startDate: string; dueDate: string } | null>(null);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { left, width, isMilestone, isSummary, baselineLeft, baselineWidth, hasVariance } = useMemo(() => {
        const start = task.startDate ? new Date(task.startDate) : (task.dueDate ? new Date(task.dueDate) : new Date());
        const end = task.dueDate ? new Date(task.dueDate) : start;

        const daysFromStart = differenceInDays(startOfDay(start), startOfDay(timelineStart));
        const duration = Math.max(1, differenceInDays(startOfDay(end), startOfDay(start)) + 1);

        let bLeft = 0;
        let bWidth = 0;
        if (task.baselineStartDate && task.baselineDueDate) {
            const bStart = new Date(task.baselineStartDate);
            const bEnd = new Date(task.baselineDueDate);
            bLeft = differenceInDays(startOfDay(bStart), startOfDay(timelineStart)) * cellWidth;
            bWidth = (differenceInDays(startOfDay(bEnd), startOfDay(bStart)) + 1) * cellWidth;
        }

        const hasVarianceVal = bWidth > 0 && (Math.abs(daysFromStart * cellWidth - bLeft) > 2 || Math.abs(duration * cellWidth - bWidth) > 2);

        return {
            left: daysFromStart * cellWidth,
            width: duration * cellWidth,
            isMilestone: task.isMilestone,
            isSummary: task.isSummary,
            baselineLeft: bLeft,
            baselineWidth: bWidth,
            hasVariance: hasVarianceVal,
        };
    }, [task, timelineStart, cellWidth]);

    const snapToUnit = useCallback((value: number, unit: string): number => {
        switch (unit) {
            case "hour": return Math.round(value / 60) * 60;
            case "day": return Math.round(value / 1440) * 1440;
            case "week": return Math.round(value / 10080) * 10080;
            case "month": return Math.round(value / 43200) * 43200;
            default: return Math.round(value / 1440) * 1440;
        }
    }, []);

    const visualLeft = dragOffset !== 0 ? left + dragOffset : (resizeDrag?.direction === "left" ? left + resizeDrag.deltaX : left);
    const visualWidth = resizeDrag ? (
        resizeDrag.direction === "left" ? width - resizeDrag.deltaX : width + resizeDrag.deltaX
    ) : width;

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
            const unitsMoved = snapToUnit(Math.round(rawDelta / cellWidth) * 1440, snapUnit) / 1440;
            if (unitsMoved !== 0) {
                onUpdate({
                    startDate: addMinutes(parseISO(dragStartRef.current.startDate), unitsMoved * 1440).toISOString(),
                    dueDate: addMinutes(parseISO(dragStartRef.current.dueDate), unitsMoved * 1440).toISOString(),
                });
            }
            dragStartRef.current = null;
            onDragEnd?.();
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    }, [onUpdate, task, snapUnit, cellWidth, onDragStart, onDragEnd]);

    const handleResizeStart = useCallback((e: React.MouseEvent, direction: "left" | "right") => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        onDragStart?.();

        const onMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const snappedPixels = Math.round(deltaX / cellWidth) * cellWidth;
            setResizeDrag({ direction, deltaX: snappedPixels });
        };

        const onMouseUp = (upEvent: MouseEvent) => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            setResizeDrag(null);
            onDragEnd?.();

            const deltaX = upEvent.clientX - startX;
            const snappedMinutes = snapToUnit(Math.round(deltaX / cellWidth) * 1440, snapUnit);
            const daysDelta = snappedMinutes / 1440;
            if (daysDelta === 0) return;

            if (direction === "left") {
                const newStart = addMinutes(new Date(task.startDate || task.dueDate), snappedMinutes);
                onUpdate?.({ startDate: newStart.toISOString() });
            } else {
                const newEnd = addMinutes(new Date(task.dueDate || task.startDate), snappedMinutes);
                onUpdate?.({ dueDate: newEnd.toISOString() });
            }
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    }, [onUpdate, task, snapUnit, cellWidth, onDragStart, onDragEnd]);

    const priorityStyles: any = {
        urgent: "from-red-500/40 to-orange-500/20 border-red-500/50 shadow-red-500/10",
        high: "from-rose-500/30 to-orange-500/20 border-rose-500/40 shadow-rose-500/10",
        medium: "from-amber-500/30 to-yellow-500/20 border-amber-500/40 shadow-amber-500/10",
        low: "from-emerald-500/30 to-teal-500/20 border-emerald-500/40 shadow-emerald-500/10",
        none: "from-slate-500/20 to-slate-400/10 border-white/10",
    };

    const criticalStyle = "from-red-500/40 to-rose-600/30 border-red-500/50 shadow-red-500/20 ring-1 ring-red-500/30";

    const taskColor = task.color || "";
    const hasTaskColor = !!taskColor;
    const priorityBorderColor: Record<string, string> = {
        urgent: "rgba(239,68,68,0.5)",
        high: "rgba(244,63,94,0.4)",
        medium: "rgba(251,191,36,0.4)",
        low: "rgba(52,211,153,0.4)",
        none: "rgba(255,255,255,0.1)",
    };
    const taskBarGradient = hasTaskColor
        ? "bg-card border-white/10"
        : task.isCritical ? criticalStyle : priorityStyles[task.priority] || "from-slate-500/20 to-slate-400/10 border-white/10";
    const taskBarBorderColor = hasTaskColor ? (task.isCritical ? "rgba(239,68,68,0.5)" : priorityBorderColor[task.priority] || "rgba(255,255,255,0.1)") : undefined;

    if (isMilestone) {
        return (
            <>
            <motion.div
                data-task-id={task.id}
                initial={{ opacity: 0, scale: 0.5, rotate: 45 }}
                animate={{ opacity: 1, scale: 1, rotate: 45 }}
                onMouseDown={handleMouseDown}
                onMouseEnter={(e) => {
                    setIsHovered(true);
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setTooltipPos({ x: Math.min(rect.right + 8, window.innerWidth - 300), y: rect.top });
                }}
                onMouseLeave={() => setIsHovered(false)}
                style={{ left: visualLeft, zIndex: isDragging ? 50 : 10 }}
                className="absolute flex items-center justify-center cursor-grab active:cursor-grabbing group"
            >
                    <div className={cn(
                        "w-6 h-6 border-2 border-white dark:border-slate-800 shadow-xl group-hover:scale-125 transition-all overflow-hidden",
                        !hasTaskColor && (task.isCritical ? "bg-red-500" : "bg-amber-500")
                    )}
                    style={hasTaskColor ? { backgroundColor: taskColor } : {}}>
                        <div className="-rotate-45 flex items-center justify-center h-full relative">
                            <Milestone className="w-2.5 h-2.5 text-white relative z-10" />
                            {task.progress > 0 && (
                                <div className="absolute inset-0 bg-white/20" style={{ clipPath: `inset(${100 - Math.min(100, Math.max(0, task.progress))}% 0 0 0)` }} />
                            )}
                        </div>
                    </div>
                </motion.div>
                {isHovered && !isDragging && (
                    <div
                        className="fixed z-[100] pointer-events-none"
                        style={{ left: tooltipPos.x, top: tooltipPos.y }}
                    >
                        <GanttTooltip task={task} />
                    </div>
                )}
            </>
        );
    }

    if (isSummary) {
        const collapsed = task.children?.length > 0 && task.children.every((c: any) => c.isSummary || !c.children || c.children.length === 0);
        return (
        <div
            data-task-id={task.id}
            style={{ left, pointerEvents: "auto" }}
            className="absolute h-8 flex flex-col justify-end z-10 pointer-events-none"
        >
                <div className={cn(
                    "h-2 w-full rounded-sm relative",
                    task.isCritical ? "bg-red-500/60" : "bg-slate-900 dark:bg-slate-200"
                )}>
                    <div className={cn(
                        "absolute left-0 bottom-0 w-1 h-3 rounded-sm",
                        task.isCritical ? "bg-red-500/60" : "bg-slate-900 dark:bg-slate-200"
                    )} />
                    <div className={cn(
                        "absolute right-0 bottom-0 w-1 h-3 rounded-sm",
                        task.isCritical ? "bg-red-500/60" : "bg-slate-900 dark:bg-slate-200"
                    )} />
                </div>
                {task.progress > 0 && (
                    <div className="text-[9px] font-semibold text-muted-foreground/80 mb-1 px-1">
                        {Math.round(task.progress)}%
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="relative h-10 w-full pointer-events-none">
            {showBaseline && baselineWidth > 0 && (
                <>
                    <div
                        style={{ left: baselineLeft, width: baselineWidth }}
                        className={cn(
                            "absolute top-8 h-2 rounded-full border z-0",
                            highlightVariance && hasVariance
                                ? "bg-amber-500/30 border-amber-500/40"
                                : "bg-slate-500/20 border-slate-500/10"
                        )}
                    />
                    {highlightVariance && hasVariance && (
                        <div
                            className="absolute top-7 text-[8px] font-bold text-amber-500 z-0"
                            style={{ left: Math.max(baselineLeft, left) + Math.min(baselineWidth, width) / 2 - 20 }}
                        >
                            {Math.round(Math.abs((left + width) - (baselineLeft + baselineWidth)) / cellWidth)}d variance
                        </div>
                    )}
                </>
            )}

            <div className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                <GripVertical className="h-3 w-3 text-muted-foreground/40" />
            </div>

            <div
                data-task-id={task.id}
                onMouseDown={handleMouseDown}
                onMouseEnter={(e) => {
                    setIsHovered(true);
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setTooltipPos({ x: Math.min(rect.right + 8, window.innerWidth - 300), y: rect.top });
                }}
                onMouseLeave={() => setIsHovered(false)}
                style={{
                    left: visualLeft,
                    width: visualWidth,
                    pointerEvents: "auto",
                    zIndex: isDragging ? 50 : 10,
                    ...(hasTaskColor ? {
                        backgroundColor: `${taskColor}20`,
                        borderColor: taskBarBorderColor,
                    } : {}),
                }}
                className={cn(
                    "absolute h-10 rounded-lg border flex items-center px-3 cursor-grab active:cursor-grabbing group backdrop-blur-xl shadow-lg transition-shadow hover:shadow-xl",
                    hasTaskColor ? "" : "bg-gradient-to-r",
                    taskBarGradient,
                    isDragging && "ring-2 ring-primary/50 shadow-2xl scale-y-110",
                    resizeDrag && "ring-2 ring-primary/50"
                )}>
                {hasTaskColor && (
                    <div
                        className="absolute left-0 top-1 bottom-1 w-1 rounded-full"
                        style={{ backgroundColor: taskColor }}
                    />
                )}
                <div className="absolute inset-0 bg-black/5 dark:bg-white/5 rounded-lg overflow-hidden pointer-events-none">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${task.progress || 0}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="h-full bg-white/20 dark:bg-white/10"
                    />
                </div>

                <div className="flex items-center justify-between w-full gap-2 overflow-hidden pointer-events-none">
                    <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
                        {task.status === "done" ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                        ) : task.status === "blocked" || task.status === "stuck" ? (
                            <AlertCircle className="h-3 w-3 text-rose-500 flex-shrink-0" />
                        ) : null}
                        <span className="text-[10px] font-semibold truncate">
                            {task.title}
                        </span>
                        {task.isCritical && (
                            <Badge variant="outline" className="bg-red-500/20 text-red-500 border-red-500/40 text-[7px] py-0 h-4 font-semibold flex-shrink-0">CRITICAL</Badge>
                        )}
                        {task.schedulingMode === "manual" && (
                            <Badge variant="outline" className="bg-blue-500/20 text-blue-500 border-blue-500/40 text-[7px] py-0 h-4 font-semibold flex-shrink-0">MANUAL</Badge>
                        )}
                    </div>

                    {task.progress > 0 && (
                        <span className="text-[9px] font-semibold opacity-40 flex-shrink-0">
                            {Math.round(task.progress)}%
                        </span>
                    )}
                </div>

                <div
                    onMouseDown={(e) => handleResizeStart(e, "left")}
                    className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-l-lg z-20 pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity"
                />
                <div
                    onMouseDown={(e) => handleResizeStart(e, "right")}
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-r-lg z-20 pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity"
                />
            </div>

            {isHovered && !isDragging && !resizeDrag && (
                <div
                    className="fixed z-[100] pointer-events-none"
                    style={{ left: tooltipPos.x, top: tooltipPos.y }}
                >
                    <GanttTooltip task={task} />
                </div>
            )}
        </div>
    );
}
