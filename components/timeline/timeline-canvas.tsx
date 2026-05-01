"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth, eachMonthOfInterval, startOfQuarter, endOfQuarter, isToday } from "date-fns";
import { ZoomLevel } from "./timeline-page";
import { cn } from "@/lib/utils";
import TaskBar from "./task-bar";
import DependencyEngine from "./dependency-engine";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronDown, Folder, FileText } from "lucide-react";
import ResourceHeatmap from "./resource-heatmap";

interface TimelineCanvasProps {
    tasks: any[];
    zoomLevel: ZoomLevel;
    searchQuery: string;
}

const ROW_HEIGHT = 64;
const VISIBLE_BUFFER = 5;

export default function TimelineCanvas({ tasks, zoomLevel, searchQuery }: TimelineCanvasProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(800);

    // Build hierarchy
    const taskTree = useMemo(() => {
        const map = new Map<string, any>(tasks.map(t => [t.id, { ...t, children: [] }]));
        const roots: any[] = [];
        
        map.forEach(task => {
            if (task.parentId && map.has(task.parentId)) {
                map.get(task.parentId).children.push(task);
            } else {
                roots.push(task);
            }
        });
        
        return roots;
    }, [tasks]);

    // Flatten tree
    const allFlattenedTasks = useMemo(() => {
        const flattened: any[] = [];
        function flatten(nodes: any[], depth = 0) {
            nodes.forEach(node => {
                flattened.push({ ...node, depth });
                if (!collapsedIds.has(node.id) && node.children.length > 0) {
                    flatten(node.children, depth + 1);
                }
            });
        }
        flatten(taskTree);
        return flattened.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [taskTree, collapsedIds, searchQuery]);

    // Virtualization logic
    const visibleRange = useMemo(() => {
        const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - VISIBLE_BUFFER);
        const end = Math.min(allFlattenedTasks.length, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + VISIBLE_BUFFER);
        return { start, end };
    }, [scrollTop, viewportHeight, allFlattenedTasks.length]);

    const visibleTasks = allFlattenedTasks.slice(visibleRange.start, visibleRange.end);

    const toggleCollapse = (id: string) => {
        setCollapsedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const startDate = startOfMonth(addDays(new Date(), -30));
    const endDate = endOfMonth(addDays(new Date(), 180));
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    const cellWidth = zoomLevel === "day" ? 120 : zoomLevel === "week" ? 60 : zoomLevel === "month" ? 20 : 8;

    useEffect(() => {
        if (scrollContainerRef.current) {
            const today = new Date();
            const daysFromStart = days.findIndex(d => isSameDay(d, today));
            if (daysFromStart !== -1) {
                scrollContainerRef.current.scrollLeft = daysFromStart * cellWidth - 200;
            }
        }
        
        const handleResize = () => setViewportHeight(window.innerHeight - 200);
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    };

    return (
        <div className="flex h-full border-t border-white/5 overflow-hidden flex-col">
            <div className="flex flex-1 overflow-hidden">
                {/* Virtualized Task List */}
                <div className="w-[350px] border-r bg-background/80 backdrop-blur-xl flex flex-col z-10 shadow-2xl relative">
                    <div className="h-24 border-b flex items-center px-8 bg-secondary/20 font-black uppercase tracking-widest text-[10px] text-muted-foreground/60">
                        Project Architecture
                    </div>
                    <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none" onScroll={handleScroll}>
                        <div style={{ height: allFlattenedTasks.length * ROW_HEIGHT, position: "relative" }}>
                            {visibleTasks.map((task, index) => (
                                <div 
                                    key={task.id} 
                                    style={{ 
                                        position: "absolute",
                                        top: (visibleRange.start + index) * ROW_HEIGHT,
                                        width: "100%",
                                        paddingLeft: `${task.depth * 20 + 20}px` 
                                    }}
                                    className="h-16 flex items-center pr-4 border-b border-white/5 hover:bg-primary/5 transition-all group cursor-pointer"
                                    onClick={() => task.children.length > 0 && toggleCollapse(task.id)}
                                >
                                    <div className="flex items-center gap-3 w-full">
                                        {task.children.length > 0 ? (
                                            collapsedIds.has(task.id) ? <ChevronRight className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-primary" />
                                        ) : (
                                            <div className="w-4" />
                                        )}
                                        {task.isSummary ? <Folder className="h-4 w-4 text-amber-500 fill-amber-500/20" /> : <FileText className="h-4 w-4 text-blue-500/60" />}
                                        <span className={cn("text-xs truncate transition-all", task.isSummary ? "font-black uppercase tracking-widest" : "font-medium")}>
                                            {task.title}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Virtualized Timeline Grid */}
                <div 
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-auto relative bg-slate-50/10 dark:bg-slate-900/10"
                >
                    <div style={{ width: days.length * cellWidth, height: allFlattenedTasks.length * ROW_HEIGHT + 96 }} className="relative">
                        {/* Header */}
                        <div className="sticky top-0 h-24 bg-background/90 backdrop-blur-xl border-b flex flex-col z-20">
                            <div className="flex h-12 border-b border-white/5">
                                {months.map((month, i) => (
                                    <div key={i} style={{ width: days.filter(d => d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear()).length * cellWidth }} className="h-full border-r border-white/5 flex items-center px-6 text-[10px] font-black uppercase tracking-[0.3em] text-primary/80">
                                        {format(month, "MMMM yyyy")}
                                    </div>
                                ))}
                            </div>
                            <div className="flex h-12">
                                {days.map((day, i) => (
                                    <div key={i} style={{ width: cellWidth }} className={cn("h-full border-r border-white/5 flex flex-col items-center justify-center text-[8px] font-black uppercase tracking-tighter", isToday(day) ? "bg-primary/20 text-primary shadow-inner" : "text-muted-foreground/40")}>
                                        <span>{format(day, "eee")}</span>
                                        <span className="text-xs">{format(day, "dd")}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Body */}
                        <div className="relative">
                            {/* Grid Lines */}
                            <div className="absolute inset-0 pointer-events-none flex">
                                {days.map((_, i) => (
                                    <div key={i} style={{ width: cellWidth }} className={cn("h-full border-r border-white/5", isToday(days[i]) && "bg-primary/5 border-r-primary/40")} />
                                ))}
                            </div>

                            {/* Task Bars (Virtualized) */}
                            <div className="relative z-10">
                                <DependencyEngine tasks={allFlattenedTasks} timelineStart={startDate} cellWidth={cellWidth} />
                                {visibleTasks.map((task, index) => (
                                    <div 
                                        key={task.id} 
                                        style={{ 
                                            position: "absolute",
                                            top: (visibleRange.start + index) * ROW_HEIGHT,
                                            width: days.length * cellWidth 
                                        }}
                                        className="h-16 flex items-center relative group"
                                    >
                                        <TaskBar 
                                            task={task} 
                                            timelineStart={startDate} 
                                            cellWidth={cellWidth}
                                            onUpdate={async (updates) => {
                                                try {
                                                    const res = await fetch(`/api/tasks/${task.id}`, {
                                                        method: "PATCH",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify(updates)
                                                    });
                                                    if (!res.ok) throw new Error("Update failed");
                                                } catch (error) {
                                                    console.error(error);
                                                }
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 -z-10 transition-colors pointer-events-none" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Today Line */}
                        <div className="absolute top-0 bottom-0 w-[2px] bg-primary/50 shadow-[0_0_15px_rgba(139,92,246,0.5)] z-30 pointer-events-none" style={{ left: (days.findIndex(d => isSameDay(d, new Date())) * cellWidth) + (cellWidth / 2) }}>
                            <div className="sticky top-20 -translate-x-1/2 w-4 h-4 rounded-full bg-primary flex items-center justify-center shadow-2xl">
                                 <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Resource Heatmap Overlay */}
            <ResourceHeatmap tasks={tasks} startDate={startDate} daysCount={days.length} cellWidth={cellWidth} />
        </div>
    );
}
