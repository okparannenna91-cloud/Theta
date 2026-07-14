"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import { differenceInDays, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Link2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { DependencyType, DependencyLine } from "@/components/shared/timeline/types";

interface DependencyEngineProps {
    tasks: any[];
    timelineStart: Date;
    cellWidth: number;
    isGantt: boolean;
    onDependencyCreate?: (sourceId: string, targetId: string, type: DependencyType) => void;
    onDependencyDelete?: (sourceId: string, targetId: string) => void;
}

export default function DependencyEngine({
    tasks,
    timelineStart,
    cellWidth,
    isGantt,
    onDependencyCreate,
    onDependencyDelete,
}: DependencyEngineProps) {
    const instanceId = useRef(`dep-arrow-${Math.random().toString(36).slice(2, 10)}`).current;
    const [dragDep, setDragDep] = useState<{ sourceId: string; sourceX: number; sourceY: number; currentX: number; currentY: number } | null>(null);
    const [hoveredTask, setHoveredTask] = useState<string | null>(null);

    const ROW_HEIGHT = 56;

    const lines: DependencyLine[] = useMemo(() => {
        if (!isGantt) return [];
        const paths: DependencyLine[] = [];
        const taskMap = new Map(tasks.map((t, i) => [t.id, { ...t, index: i }]));

        tasks.forEach((task, targetIndex) => {
            if (!task.predecessors) return;
            task.predecessors.forEach((dep: any) => {
                const source = taskMap.get(dep.predecessorId);
                if (!source) return;

                const sourceStart = source.startDate ? new Date(source.startDate) : new Date();
                const sourceEnd = source.dueDate ? new Date(source.dueDate) : sourceStart;
                const targetStart = task.startDate ? new Date(task.startDate) : new Date();
                const targetEnd = task.dueDate ? new Date(task.dueDate) : targetStart;

                let sourceX: number;
                let targetX: number;

                switch (dep.type) {
                    case "SS":
                        sourceX = differenceInDays(startOfDay(sourceStart), startOfDay(timelineStart)) * cellWidth;
                        targetX = differenceInDays(startOfDay(targetStart), startOfDay(timelineStart)) * cellWidth;
                        break;
                    case "FF":
                        sourceX = (differenceInDays(startOfDay(sourceEnd), startOfDay(timelineStart)) + 1) * cellWidth;
                        targetX = (differenceInDays(startOfDay(targetEnd), startOfDay(timelineStart)) + 1) * cellWidth;
                        break;
                    case "SF":
                        sourceX = differenceInDays(startOfDay(sourceStart), startOfDay(timelineStart)) * cellWidth;
                        targetX = (differenceInDays(startOfDay(targetEnd), startOfDay(timelineStart)) + 1) * cellWidth;
                        break;
                    case "FS":
                    default:
                        sourceX = (differenceInDays(startOfDay(sourceEnd), startOfDay(timelineStart)) + 1) * cellWidth;
                        targetX = differenceInDays(startOfDay(targetStart), startOfDay(timelineStart)) * cellWidth;
                }

                const sourceY = source.index * ROW_HEIGHT + ROW_HEIGHT / 2;
                const targetY = targetIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

                const margin = 12;
                let path: string;
                if (sourceX < targetX) {
                    const midY = (sourceY + targetY) / 2;
                    path = `M ${sourceX} ${sourceY} L ${sourceX + margin} ${sourceY} L ${sourceX + margin} ${midY} L ${targetX - margin} ${midY} L ${targetX - margin} ${targetY} L ${targetX} ${targetY}`;
                } else {
                    const bendX = Math.max(sourceX, targetX) + 40;
                    path = `M ${sourceX} ${sourceY} L ${sourceX + margin} ${sourceY} L ${bendX} ${sourceY} L ${bendX} ${targetY} L ${targetX - margin} ${targetY} L ${targetX} ${targetY}`;
                }

                paths.push({
                    id: `${dep.predecessorId}-${task.id}`,
                    sourceTaskId: dep.predecessorId,
                    targetTaskId: task.id,
                    type: dep.type,
                    path,
                    sourceX,
                    sourceY,
                    targetX,
                    targetY,
                });
            });
        });

        return paths;
    }, [tasks, timelineStart, cellWidth, isGantt]);

    const handleConnectorMouseDown = useCallback((e: React.MouseEvent, sourceId: string) => {
        if (!isGantt) return;
        e.preventDefault();
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setDragDep({
            sourceId,
            sourceX: rect.left + rect.width / 2,
            sourceY: rect.top + rect.height / 2,
            currentX: e.clientX,
            currentY: e.clientY,
        });

        const onMove = (me: MouseEvent) => {
            setDragDep(prev => prev ? { ...prev, currentX: me.clientX, currentY: me.clientY } : null);
        };
        const onUp = () => {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
            setDragDep(null);
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    }, [isGantt]);

    if (!isGantt) return null;

    return (
        <>
            <svg className="absolute inset-0 pointer-events-none overflow-visible z-0" style={{ width: "100%", height: "100%" }}>
                <defs>
                    <marker id={`${instanceId}-fs`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                        <path d="M 0 0 L 8 3 L 0 6 Z" fill="#8b5cf6" fillOpacity="0.5" />
                    </marker>
                    <marker id={`${instanceId}-ss`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                        <path d="M 0 0 L 8 3 L 0 6 Z" fill="#3b82f6" fillOpacity="0.5" />
                    </marker>
                    <marker id={`${instanceId}-ff`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                        <path d="M 0 0 L 8 3 L 0 6 Z" fill="#10b981" fillOpacity="0.5" />
                    </marker>
                    <marker id={`${instanceId}-sf`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                        <path d="M 0 0 L 8 3 L 0 6 Z" fill="#f59e0b" fillOpacity="0.5" />
                    </marker>
                </defs>

                {lines.map((line) => {
                    const markerMap: Record<string, string> = {
                        FS: `${instanceId}-fs`,
                        SS: `${instanceId}-ss`,
                        FF: `${instanceId}-ff`,
                        SF: `${instanceId}-sf`,
                    };
                    return (
                        <g key={line.id} className="group cursor-pointer">
                            <path
                                d={line.path}
                                fill="none"
                                stroke={line.type === "FS" ? "#8b5cf6" : line.type === "SS" ? "#3b82f6" : line.type === "FF" ? "#10b981" : "#f59e0b"}
                                strokeWidth="1.5"
                                strokeOpacity="0.4"
                                markerEnd={`url(#${markerMap[line.type]})`}
                                className="transition-all duration-300 hover:stroke-opacity-100 hover:stroke-2"
                            />
                            <foreignObject
                                x={(line.sourceX + line.targetX) / 2 - 8}
                                y={Math.min(line.sourceY, line.targetY) - 8}
                                width="16"
                                height="16"
                                className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
                            >
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => onDependencyDelete?.(line.sourceTaskId, line.targetTaskId)}
                                >
                                    <X className="h-2 w-2" />
                                </Button>
                            </foreignObject>
                        </g>
                    );
                })}

                {dragDep && (
                    <line
                        x1={dragDep.sourceX}
                        y1={dragDep.sourceY}
                        x2={dragDep.currentX}
                        y2={dragDep.currentY}
                        stroke="#8b5cf6"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        strokeOpacity="0.6"
                        className="pointer-events-none"
                    />
                )}
            </svg>

            <div className="absolute left-0 top-0 bottom-0 w-2 z-20 pointer-events-none">
                {tasks.map((task, index) => (
                    <TooltipProvider key={task.id}>
                        <Tooltip content="Drag to create dependency">
                            <TooltipTrigger asChild>
                                <div
                    onMouseDown={(e) => handleConnectorMouseDown(e, task.id)}
                                    onMouseEnter={() => setHoveredTask(task.id)}
                                    onMouseLeave={() => setHoveredTask(null)}
                                    style={{ top: index * ROW_HEIGHT + ROW_HEIGHT / 2 - 8, position: "absolute" }}
                                    className={cn(
                                        "w-2 h-4 rounded-r-full bg-primary/20 cursor-crosshair pointer-events-auto transition-all",
                                        hoveredTask === task.id ? "bg-primary/60 scale-150" : ""
                                    )}
                                >
                                    <Link2 className="w-2 h-2 text-primary/60 absolute top-1 left-0.5" />
                                </div>
                            </TooltipTrigger>
                        </Tooltip>
                    </TooltipProvider>
                ))}
            </div>
        </>
    );
}
