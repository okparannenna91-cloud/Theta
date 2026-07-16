"use client";

import { useMemo, useState } from "react";
import { eachDayOfInterval, addDays, startOfDay, format } from "date-fns";
import { cn } from "@/lib/utils";
import { Users, AlertTriangle, Clock, Activity, ChevronDown, ChevronRight } from "lucide-react";
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface ResourceHeatmapProps {
    tasks: any[];
    startDate: Date;
    daysCount: number;
    cellWidth: number;
    capacity?: number;
    workHoursPerDay?: number;
}

interface ResourceConflict {
    userId: string;
    userName: string;
    date: string;
    totalHours: number;
    taskCount: number;
    taskNames: string[];
}

export default function ResourceHeatmap({
    tasks,
    startDate,
    daysCount,
    cellWidth,
    capacity = 5,
    workHoursPerDay = 8,
}: ResourceHeatmapProps) {
    const [showConflicts, setShowConflicts] = useState(false);

    const days = useMemo(() => {
        const d = [];
        for (let i = 0; i < daysCount; i++) {
            d.push(addDays(startDate, i));
        }
        return d;
    }, [startDate, daysCount]);

    const { taskCounts, hourCounts, maxTasks, maxHours, conflicts } = useMemo(() => {
        const tCounts = new Array(daysCount).fill(0);
        const hCounts = new Array(daysCount).fill(0);
        const userDayHours = new Map<string, { hours: number; tasks: string[]; userName: string }>();

        tasks.forEach(task => {
            if (!task.startDate || !task.dueDate || task.isSummary || task.isMilestone) return;
            const start = startOfDay(new Date(task.startDate));
            const end = startOfDay(new Date(task.dueDate));
            const estHours = task.estimatedHours || workHoursPerDay;

            days.forEach((day, i) => {
                if (day >= start && day <= end) {
                    tCounts[i]++;
                    hCounts[i] += estHours;

                    const assigneeIds = task.assigneeIds || (task.userId ? [task.userId] : []);
                    assigneeIds.forEach((userId: string) => {
                        const dateKey = `${userId}:${format(day, "yyyy-MM-dd")}`;
                        const existing = userDayHours.get(dateKey) || { hours: 0, tasks: [], userName: "" };
                        existing.hours += estHours;
                        existing.tasks.push(task.title || "Untitled");
                        existing.userName = task.user?.name || userId;
                        userDayHours.set(dateKey, existing);
                    });
                }
            });
        });

        const detectedConflicts: ResourceConflict[] = [];
        userDayHours.forEach((data, key) => {
            if (data.hours > workHoursPerDay) {
                const [userId, date] = key.split(":");
                detectedConflicts.push({
                    userId,
                    userName: data.userName,
                    date,
                    totalHours: data.hours,
                    taskCount: data.tasks.length,
                    taskNames: data.tasks,
                });
            }
        });

        detectedConflicts.sort((a, b) => b.totalHours - a.totalHours);

        return {
            taskCounts: tCounts,
            hourCounts: hCounts,
            maxTasks: Math.max(...tCounts, 1),
            maxHours: Math.max(...hCounts, 1),
            conflicts: detectedConflicts,
        };
    }, [tasks, days, daysCount, workHoursPerDay]);

    const overallocationThreshold = capacity;

    return (
        <div className="border-t bg-background/90 backdrop-blur-xl flex flex-col z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
            {conflicts.length > 0 && (
                <div className="border-b px-6 py-2 flex items-center gap-2">
                    <button
                        onClick={() => setShowConflicts(!showConflicts)}
                        className="flex items-center gap-1.5 text-[10px] font-medium text-rose-500 hover:text-rose-600 transition-colors"
                    >
                        {showConflicts ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        <AlertTriangle className="h-3 w-3" />
                        {conflicts.length} resource conflict{conflicts.length !== 1 ? "s" : ""} detected
                    </button>
                </div>
            )}

            {showConflicts && conflicts.length > 0 && (
                <div className="border-b px-6 py-2 max-h-32 overflow-y-auto space-y-1">
                    {conflicts.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="font-medium text-foreground">{c.userName}</span>
                            <span>over-allocated on</span>
                            <span className="font-medium text-rose-500">{c.date}</span>
                            <span>— {Math.round(c.totalHours)}h across {c.taskCount} tasks</span>
                            <span className="text-muted-foreground/50">({c.taskNames.slice(0, 2).join(", ")}{c.taskNames.length > 2 ? "..." : ""})</span>
                        </div>
                    ))}
                </div>
            )}

            <div className="h-24 flex">
                <div className="w-[360px] border-r flex items-center px-6 gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold text-foreground">Resource Planning</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[8px] py-0 h-4 bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                                <Activity className="h-2.5 w-2.5 mr-1" /> {maxTasks} tasks/day
                            </Badge>
                            <Badge variant="outline" className="text-[8px] py-0 h-4 bg-blue-500/10 text-blue-500 border-blue-500/30">
                                <Clock className="h-2.5 w-2.5 mr-1" /> {Math.round(maxHours)}h/day
                            </Badge>
                            {conflicts.length > 0 && (
                                <Badge variant="outline" className="text-[8px] py-0 h-4 bg-rose-500/10 text-rose-500 border-rose-500/30">
                                    <AlertTriangle className="h-2.5 w-2.5 mr-1" /> {conflicts.length} conflicts
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    <div className="flex h-full" style={{ width: daysCount * cellWidth }}>
                        {taskCounts.map((count, i) => {
                            const isOverloaded = count >= overallocationThreshold;
                            const intensity = Math.min(count / overallocationThreshold, 1);
                            const hours = hourCounts[i];
                            const hoursIntensity = Math.min(hours / (capacity * workHoursPerDay), 1);

                            return (
                                <TooltipProvider key={i}>
                                    <Tooltip content={`${count} tasks · ${Math.round(hours)}h estimated${isOverloaded ? ' · OVERALLOCATED' : ''}`}>
                                        <TooltipTrigger asChild>
                                            <div 
                                                style={{ width: cellWidth, minWidth: cellWidth }}
                                                className={cn(
                                                    "h-full border-r border-white/5 transition-all duration-300 relative flex flex-col justify-end",
                                                    isOverloaded ? "bg-rose-500/5" : "bg-transparent"
                                                )}
                                            >
                                                <div className="absolute inset-0 flex flex-col justify-end px-0.5 pb-1">
                                                    <div
                                                        className={cn(
                                                            "w-full rounded-sm transition-all duration-700",
                                                            isOverloaded
                                                                ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                                                                : hoursIntensity > 0.7
                                                                    ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.2)]"
                                                                    : "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.1)]"
                                                        )}
                                                        style={{ height: `${Math.max(4, intensity * 100)}%`, opacity: 0.3 + (intensity * 0.7) }}
                                                    />
                                                </div>

                                                {isOverloaded && (
                                                    <div className="absolute top-1 left-1/2 -translate-x-1/2">
                                                        <AlertTriangle className="h-3 w-3 text-rose-500 animate-pulse" />
                                                    </div>
                                                )}
                                            </div>
                                        </TooltipTrigger>
                                    </Tooltip>
                                </TooltipProvider>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
