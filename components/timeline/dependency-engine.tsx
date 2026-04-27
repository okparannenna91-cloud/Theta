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
        const paths: string[] = [];
        const taskMap = new Map(tasks.map((t, i) => [t.id, { ...t, index: i }]));

        tasks.forEach((task, targetIndex) => {
            if (!task.dependencyIds) return;

            task.dependencyIds.forEach((sourceId: string) => {
                const source = taskMap.get(sourceId);
                if (!source) return;

                const sourceStart = source.startDate ? new Date(source.startDate) : new Date();
                const sourceEnd = source.dueDate ? new Date(source.dueDate) : sourceStart;
                const targetStart = task.startDate ? new Date(task.startDate) : new Date();

                const sourceX = (differenceInDays(startOfDay(sourceEnd), startOfDay(timelineStart)) + 1) * cellWidth;
                const sourceY = source.index * 64 + 32; // h-16 is 64px, +32 for middle

                const targetX = differenceInDays(startOfDay(targetStart), startOfDay(timelineStart)) * cellWidth;
                const targetY = targetIndex * 64 + 32;

                // Create a stepped path (Manhattan routing)
                const midX = sourceX + (targetX - sourceX) / 2;
                const path = `M ${sourceX} ${sourceY} L ${midX} ${sourceY} L ${midX} ${targetY} L ${targetX} ${targetY}`;
                paths.push(path);
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
            
            {lines.map((d, i) => (
                <path 
                    key={i} 
                    d={d} 
                    fill="none" 
                    stroke="#8b5cf6" 
                    strokeWidth="1.5" 
                    strokeOpacity="0.3"
                    markerEnd="url(#arrowhead)"
                    className="transition-all duration-500"
                />
            ))}
        </svg>
    );
}
