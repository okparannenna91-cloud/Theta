"use client";

import { useMemo } from "react";
import { format, startOfWeek, addDays, differenceInDays } from "date-fns";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface TimelineViewProps {
    tasks: any[];
}

export function TimelineView({ tasks }: TimelineViewProps) {
    const startDate = useMemo(() => {
        const today = new Date();
        return startOfWeek(today);
    }, []);

    const days = useMemo(() => {
        return Array.from({ length: 30 }).map((_, i) => addDays(startDate, i));
    }, [startDate]);

    const tasksWithDates = useMemo(() => {
        return tasks.filter((t) => t.dueDate).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [tasks]);

    return (
        <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Project Timeline</h3>
            </div>

            <ScrollArea className="flex-1 w-full">
                <div className="min-w-[1200px] flex flex-col">
                    {/* Header: Days */}
                    <div className="flex border-b border-slate-100 dark:border-slate-800">
                        <div className="w-48 sticky left-0 bg-slate-50 dark:bg-slate-900 border-r z-10 px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Task</div>
                        {days.map((day) => (
                            <div key={day.toISOString()} className="w-24 border-r border-slate-100 dark:border-slate-800 px-2 py-2 flex flex-col items-center">
                                <span className="text-[10px] text-slate-400 font-bold uppercase">{format(day, "EEE")}</span>
                                <span className="text-xs font-black text-slate-900 dark:text-slate-100">{format(day, "d")}</span>
                            </div>
                        ))}
                    </div>

                    {/* Rows: Tasks */}
                    <div className="flex-1">
                        {tasksWithDates.map((task) => {
                            const taskStart = new Date(task.createdAt);
                            const taskEnd = new Date(task.dueDate);
                            const startOffset = Math.max(0, differenceInDays(taskStart, startDate));
                            const duration = Math.max(1, differenceInDays(taskEnd, taskStart));

                            return (
                                <div key={task.id} className="flex border-b border-slate-50 dark:border-slate-800/50 group hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors">
                                    <div className="w-48 sticky left-0 bg-white dark:bg-slate-900 border-r z-10 px-4 py-3 flex items-center min-w-0">
                                        <span className="text-xs font-bold truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{task.title}</span>
                                    </div>
                                    <div className="flex-1 relative h-12">
                                        <div
                                            className={cn(
                                                "absolute top-2 h-8 rounded-lg flex items-center px-3 shadow-sm border border-black/5",
                                                task.priority === "high" ? "bg-red-500 text-white" :
                                                    task.priority === "medium" ? "bg-amber-400 text-white" : "bg-emerald-500 text-white"
                                            )}
                                            style={{
                                                left: `${startOffset * 96}px`,
                                                width: `${duration * 96}px`
                                            }}
                                        >
                                            <span className="text-[10px] font-black truncate">{task.title}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {tasksWithDates.length === 0 && (
                            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground italic">
                                <span className="text-sm">No tasks with due dates found.</span>
                            </div>
                        )}
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}
