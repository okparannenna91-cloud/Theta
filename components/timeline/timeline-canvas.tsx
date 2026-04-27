"use client";

import { useEffect, useRef, useState } from "react";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth, eachMonthOfInterval, startOfQuarter, endOfQuarter, isToday } from "date-fns";
import { ZoomLevel } from "./timeline-page";
import { cn } from "@/lib/utils";
import TaskBar from "./task-bar";
import DependencyEngine from "./dependency-engine";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";

interface TimelineCanvasProps {
    tasks: any[];
    zoomLevel: ZoomLevel;
    searchQuery: string;
}

export default function TimelineCanvas({ tasks, zoomLevel, searchQuery }: TimelineCanvasProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Calculate time range based on tasks or default to 3 months around today
    const startDate = startOfMonth(addDays(new Date(), -30));
    const endDate = endOfMonth(addDays(new Date(), 90));

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    // Grid cell width based on zoom level
    const cellWidth = zoomLevel === "day" ? 120 : zoomLevel === "week" ? 40 : zoomLevel === "month" ? 10 : 4;

    useEffect(() => {
        // Scroll to current date on mount
        if (scrollContainerRef.current) {
            const today = new Date();
            const daysFromStart = days.findIndex(d => isSameDay(d, today));
            if (daysFromStart !== -1) {
                scrollContainerRef.current.scrollLeft = daysFromStart * cellWidth - 200;
            }
        }
    }, []);

    // Filter tasks based on search
    const filteredTasks = tasks.filter(task => 
        task.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-full border-t border-white/5 overflow-hidden">
            {/* Sticky Task List Sidebar */}
            <div className="w-[300px] border-r bg-background/50 backdrop-blur-md flex flex-col z-10 shadow-[10px_0_30px_-15px_rgba(0,0,0,0.1)]">
                <div className="h-24 border-b flex items-center px-8 bg-secondary/20 font-black uppercase tracking-widest text-[10px] text-muted-foreground">
                    Project Hierarchy
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none">
                    {filteredTasks.map((task, i) => (
                        <div 
                            key={task.id} 
                            className="h-16 flex items-center px-8 border-b border-white/5 hover:bg-secondary/50 transition-colors group cursor-pointer"
                        >
                            <div className="flex items-center gap-3 w-full">
                                <div className="h-2 w-2 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                                <span className="text-xs font-black uppercase tracking-widest truncate">{task.title}</span>
                            </div>
                        </div>
                    ))}
                    {filteredTasks.length === 0 && (
                        <div className="p-8 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            No tasks synchronized
                        </div>
                    )}
                </div>
            </div>

            {/* Scrollable Timeline Grid */}
            <div 
                ref={scrollContainerRef}
                className="flex-1 overflow-auto relative scroll-smooth bg-slate-50/20 dark:bg-slate-900/10"
            >
                <div style={{ width: days.length * cellWidth }} className="h-full relative">
                    {/* Grid Header (Time Axis) */}
                    <div className="sticky top-0 h-24 bg-background/80 backdrop-blur-md border-b flex flex-col z-20">
                        {/* Month Labels */}
                        <div className="flex h-12 border-b border-white/5">
                            {months.map((month, i) => {
                                const monthDays = days.filter(d => d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear());
                                return (
                                    <div 
                                        key={i} 
                                        style={{ width: monthDays.length * cellWidth }}
                                        className="h-full border-r border-white/5 flex items-center px-4 text-xs font-black uppercase tracking-[0.2em] text-primary"
                                    >
                                        {format(month, "MMMM yyyy")}
                                    </div>
                                );
                            })}
                        </div>
                        {/* Day Labels */}
                        <div className="flex h-12">
                            {days.map((day, i) => (
                                <div 
                                    key={i} 
                                    style={{ width: cellWidth }}
                                    className={cn(
                                        "h-full border-r border-white/5 flex flex-col items-center justify-center text-[9px] font-black uppercase tracking-tighter",
                                        isToday(day) ? "bg-primary/10 text-primary" : "text-muted-foreground"
                                    )}
                                >
                                    <span>{format(day, "eee")}</span>
                                    <span className="text-xs">{format(day, "dd")}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Timeline Body (Task Bars) */}
                    <div className="relative pt-4">
                        {/* Vertical Grid Lines */}
                        <div className="absolute inset-0 pointer-events-none flex">
                            {days.map((_, i) => (
                                <div 
                                    key={i} 
                                    style={{ width: cellWidth }} 
                                    className={cn(
                                        "h-full border-r border-white/5",
                                        isToday(days[i]) && "bg-primary/5 border-r-primary/30"
                                    )} 
                                />
                            ))}
                        </div>

                        {/* Task Rows */}
                        <div className="relative z-10">
                            <DependencyEngine 
                                tasks={filteredTasks} 
                                timelineStart={startDate} 
                                cellWidth={cellWidth} 
                            />
                            {filteredTasks.map((task, i) => (
                                <div key={task.id} className="h-16 flex items-center relative group">
                                    {/* Task Bar */}
                                    <TaskBar 
                                        task={task} 
                                        timelineStart={startDate} 
                                        cellWidth={cellWidth} 
                                    />
                                    
                                    {/* Row background highlight on hover */}
                                    <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 -z-10 transition-colors pointer-events-none" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Today Indicator Line */}
                    <div 
                        className="absolute top-0 bottom-0 w-px bg-primary z-30 pointer-events-none"
                        style={{ 
                            left: (days.findIndex(d => isSameDay(d, new Date())) * cellWidth) + (cellWidth / 2) 
                        }}
                    >
                        <div className="absolute top-0 -translate-x-1/2 w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/50" />
                    </div>
                </div>
            </div>
        </div>
    );
}
