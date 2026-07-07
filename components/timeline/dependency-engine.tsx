"use client";

import { useMemo, useRef } from "react";
import { differenceInDays, startOfDay } from "date-fns";

interface DependencyEngineProps {
    tasks: any[];
    timelineStart: Date;
    cellWidth: number;
}

export default function DependencyEngine({ tasks, timelineStart, cellWidth }: DependencyEngineProps) {
    const instanceId = useRef(`dep-arrow-${Math.random().toString(36).slice(2, 10)}`).current;

    const lines = useMemo(() => {
        const paths: { path: string, type: string, id: string }[] = [];
        const taskMap = new Map(tasks.map((t, i) => [t.id, { ...t, index: i }]));
        let pathIndex = 0;

        tasks.forEach((task, targetIndex) => {
            if (!task.predecessors) return;

            task.predecessors.forEach((dep: any) => {
                const source = taskMap.get(dep.predecessorId);
                if (!source) return;

                // ... same path calculation ...
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

                const sourceY = source.index * 64 + 32;
                const targetY = targetIndex * 64 + 32;

                const margin = 12;
                const path = sourceX < targetX
                    ? `M ${sourceX} ${sourceY} L ${sourceX + margin} ${sourceY} L ${sourceX + margin} ${targetY} L ${targetX} ${targetY}`
                    : `M ${sourceX} ${sourceY} L ${sourceX + margin} ${sourceY} L ${sourceX + margin} ${targetY + 32} L ${targetX - margin} ${targetY + 32} L ${targetX - margin} ${targetY} L ${targetX} ${targetY}`;
                
                paths.push({ path, type: dep.type, id: `${dep.predecessorId}-${task.id}-${pathIndex++}` });
            });
        });

        return paths;
    }, [tasks, timelineStart, cellWidth]);

    return (
        <svg 
            className="absolute inset-0 pointer-events-none overflow-visible z-0"
            style={{ width: "100%", height: "100%" }}
        >
            <defs>
                <marker
                    id={instanceId}
                    markerWidth="8"
                    markerHeight="6"
                    refX="7"
                    refY="3"
                    orient="auto"
                >
                    <path d="M 0 0 L 8 3 L 0 6 Z" fill="#8b5cf6" fillOpacity="0.4" />
                </marker>
            </defs>
            
            {lines.map((line) => (
                <path 
                    key={line.id}
                    d={line.path} 
                    fill="none" 
                    stroke={line.type === "FS" ? "#8b5cf6" : "#3b82f6"} 
                    strokeWidth="1.5" 
                    strokeOpacity="0.4"
                    markerEnd={`url(#${instanceId})`}
                    className="transition-all duration-500 hover:stroke-opacity-100 hover:stroke-2 cursor-pointer"
                />
            ))}
        </svg>
    );
}
