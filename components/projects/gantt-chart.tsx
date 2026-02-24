"use client";

import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, differenceInDays } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface GanttChartProps {
    tasks: any[];
}

export function GanttChart({ tasks }: GanttChartProps) {
    const { startDate, endDate, days } = useMemo(() => {
        const today = new Date();
        const start = startOfMonth(today);
        const end = endOfMonth(today);
        return {
            startDate: start,
            endDate: end,
            days: eachDayOfInterval({ start, end })
        };
    }, []);

    return (
        <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-white dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-20">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Gantt Chart</h3>
            </div>

            <ScrollArea className="flex-1 w-full">
                <div className="inline-flex flex-col min-w-full">
                    {/* Gantt Header */}
                    <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
                        <div className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Task Hierarchy</div>
                        <div className="flex">
                            {days.map((day) => (
                                <div key={day.toISOString()} className={cn(
                                    "w-10 border-r border-slate-100 dark:border-slate-800 py-3 flex flex-col items-center",
                                    (day.getDay() === 0 || day.getDay() === 6) && "bg-slate-50 dark:bg-slate-800/20"
                                )}>
                                    <span className="text-[9px] text-slate-400 font-bold">{format(day, "eeeee")}</span>
                                    <span className="text-[10px] font-black">{format(day, "d")}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Gantt Body */}
                    <div className="flex-1">
                        {tasks.filter(t => t.dueDate).map((task) => {
                            const taskStart = new Date(task.createdAt);
                            const taskEnd = new Date(task.dueDate);
                            const startOffset = Math.max(0, differenceInDays(taskStart, startDate));
                            const duration = Math.max(1, differenceInDays(taskEnd, taskStart));

                            return (
                                <div key={task.id} className="flex border-b border-slate-100 dark:border-slate-800/50 group h-12 hover:bg-white dark:hover:bg-slate-900 transition-colors">
                                    <div className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center bg-white dark:bg-slate-900 sticky left-0 z-10">
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-bold truncate">{task.title}</span>
                                            {task.dependencies?.length > 0 && (
                                                <span className="text-[8px] text-indigo-500 font-bold uppercase">Has Dependencies</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex relative">
                                        {days.map((day) => (
                                            <div key={day.toISOString()} className={cn(
                                                "w-10 h-full border-r border-slate-50 dark:border-slate-800/10",
                                                (day.getDay() === 0 || day.getDay() === 6) && "bg-slate-50/50 dark:bg-slate-800/5"
                                            )} />
                                        ))}

                                        <div
                                            className={cn(
                                                "absolute top-2.5 h-7 rounded-sm shadow-md border-l-4 transition-transform hover:scale-[1.02] cursor-pointer",
                                                task.priority === "high" ? "bg-red-500/10 border-red-500 text-red-600" :
                                                    task.priority === "medium" ? "bg-amber-500/10 border-amber-500 text-amber-600" : "bg-emerald-500/10 border-emerald-500 text-emerald-600"
                                            )}
                                            style={{
                                                left: `${startOffset * 40}px`,
                                                width: `${duration * 40}px`
                                            }}
                                        >
                                            <div className="w-full h-full relative px-2 flex items-center">
                                                <span className="text-[9px] font-black truncate">{task.title}</span>
                                                {/* Progress Overlay */}
                                                <div
                                                    className="absolute top-0 left-0 h-full bg-current opacity-20 pointer-events-none"
                                                    style={{ width: `${task.progress || 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}
