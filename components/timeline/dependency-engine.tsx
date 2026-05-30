"use client";

import { useMemo } from "react";
import { differenceInDays, startOfDay } from "date-fns";

interface DependencyEngineProps {
    tasks: any[];
    timelineStart: Date;
    cellWidth: number;
}

export default function DependencyEngine({ tasks, timelineStart, cellWidth }: DependencyEngineProps) {
    const lines = useMemo(() => {
        const paths: { path: string, type: string }[] = [];
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

                // Determine X coordinates based on dependency type
                switch (dep.type) {
                    case "SS": // Start-to-Start
                        sourceX = differenceInDays(startOfDay(sourceStart), startOfDay(timelineStart)) * cellWidth;
                        targetX = differenceInDays(startOfDay(targetStart), startOfDay(timelineStart)) * cellWidth;
                        break;
                    case "FF": // Finish-to-Finish
                        sourceX = (differenceInDays(startOfDay(sourceEnd), startOfDay(timelineStart)) + 1) * cellWidth;
                        targetX = (differenceInDays(startOfDay(targetEnd), startOfDay(timelineStart)) + 1) * cellWidth;
                        break;
                    case "SF": // Start-to-Finish
                        sourceX = differenceInDays(startOfDay(sourceStart), startOfDay(timelineStart)) * cellWidth;
                        targetX = (differenceInDays(startOfDay(targetEnd), startOfDay(timelineStart)) + 1) * cellWidth;
                        break;
                    case "FS": // Finish-to-Start (Default)
                    default:
                        sourceX = (differenceInDays(startOfDay(sourceEnd), startOfDay(timelineStart)) + 1) * cellWidth;
                        targetX = differenceInDays(startOfDay(targetStart), startOfDay(timelineStart)) * cellWidth;
                }

                const sourceY = source.index * 64 + 32;
                const targetY = targetIndex * 64 + 32;

                // Create a stepped path (Manhattan routing)
                const margin = 12;
                const path = sourceX < targetX
                    ? `M ${sourceX} ${sourceY} L ${sourceX + margin} ${sourceY} L ${sourceX + margin} ${targetY} L ${targetX} ${targetY}`
                    : `M ${sourceX} ${sourceY} L ${sourceX + margin} ${sourceY} L ${sourceX + margin} ${targetY + 32} L ${targetX - margin} ${targetY + 32} L ${targetX - margin} ${targetY} L ${targetX} ${targetY}`;
                
                paths.push({ path, type: dep.type });
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
                    id="arrowhead"
                    markerWidth="8"
                    markerHeight="6"
                    refX="7"
                    refY="3"
                    orient="auto"
                >
                    <path d="M 0 0 L 8 3 L 0 6 Z" fill="#8b5cf6" fillOpacity="0.4" />
                </marker>
            </defs>
            
            {lines.map((line, i) => (
                <path 
                    key={i} 
                    d={line.path} 
                    fill="none" 
                    stroke={line.type === "FS" ? "#8b5cf6" : "#3b82f6"} 
                    strokeWidth="1.5" 
                    strokeOpacity="0.4"
                    markerEnd="url(#arrowhead)"
                    className="transition-all duration-500 hover:stroke-opacity-100 hover:stroke-2 cursor-pointer"
                />
            ))}
        </svg>
    );
}
