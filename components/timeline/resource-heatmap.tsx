"use client";

import { useMemo } from "react";
import { eachDayOfInterval, addDays, isWithinInterval, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Users, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ResourceHeatmapProps {
    tasks: any[];
    startDate: Date;
    daysCount: number;
    cellWidth: number;
}

export default function ResourceHeatmap({ tasks, startDate, daysCount, cellWidth }: ResourceHeatmapProps) {
    const days = useMemo(() => {
        const d = [];
        for (let i = 0; i < daysCount; i++) {
            d.push(addDays(startDate, i));
        }
        return d;
    }, [startDate, daysCount]);

    // Group workload by day
    const workload = useMemo(() => {
        const counts = new Array(daysCount).fill(0);
        
        tasks.forEach(task => {
            if (!task.startDate || !task.dueDate || task.isSummary) return;
            
            const start = startOfDay(new Date(task.startDate));
            const end = startOfDay(new Date(task.dueDate));
            
            days.forEach((day, i) => {
                if (day >= start && day <= end) {
                    counts[i]++;
                }
            });
        });
        
        return counts;
    }, [tasks, days]);

    return (
        <div className="h-20 border-t bg-background/90 backdrop-blur-xl flex z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
            {/* Sidebar Label */}
            <div className="w-[350px] border-r flex items-center px-8 gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Team Capacity</p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Aggregate Workload Heatmap</p>
                </div>
            </div>

            {/* Heatmap Grid */}
            <div className="flex-1 overflow-hidden relative">
                <div className="flex h-full" style={{ width: daysCount * cellWidth }}>
                    {workload.map((count, i) => {
                        const intensity = Math.min(count / 5, 1); // Normalize: 5 tasks is 100% intensity
                        const isOverloaded = count >= 5;
                        
                        return (
                            <TooltipProvider key={i}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div 
                                            style={{ width: cellWidth }}
                                            className={cn(
                                                "h-full border-r border-white/5 transition-all duration-300 flex flex-col justify-end p-1 relative",
                                                count === 0 ? "bg-transparent" : 
                                                isOverloaded ? "bg-rose-500/10" : "bg-emerald-500/5"
                                            )}
                                        >
                                            {isOverloaded && (
                                                <div className="absolute top-2 left-1/2 -translate-x-1/2 animate-bounce">
                                                    <AlertTriangle className="h-3 w-3 text-rose-500" />
                                                </div>
                                            )}
                                            
                                            <div 
                                                className={cn(
                                                    "w-full rounded-sm transition-all duration-700",
                                                    isOverloaded ? "bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]" : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                                                )}
                                                style={{ height: `${intensity * 100}%`, opacity: 0.4 + (intensity * 0.6) }}
                                            />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-slate-900 text-white border-none rounded-xl p-3 shadow-2xl">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest">Workload: {count} Tasks</p>
                                            {isOverloaded && (
                                                <p className="text-[9px] text-rose-400 font-bold flex items-center gap-1">
                                                    <AlertTriangle className="h-3 w-3" /> CRITICAL CAPACITY
                                                </p>
                                            )}
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
