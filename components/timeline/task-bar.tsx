"use client";

import { useMemo } from "react";
import { differenceInDays, startOfDay } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Milestone, MoreVertical, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface TaskBarProps {
    task: any;
    timelineStart: Date;
    cellWidth: number;
}

export default function TaskBar({ task, timelineStart, cellWidth }: TaskBarProps) {
    const { left, width, isMilestone, isSummary } = useMemo(() => {
        const start = task.startDate ? new Date(task.startDate) : (task.dueDate ? new Date(task.dueDate) : new Date());
        const end = task.dueDate ? new Date(task.dueDate) : start;
        
        const daysFromStart = differenceInDays(startOfDay(start), startOfDay(timelineStart));
        const duration = Math.max(1, differenceInDays(startOfDay(end), startOfDay(start)) + 1);
        
        return {
            left: daysFromStart * cellWidth,
            width: duration * cellWidth,
            isMilestone: task.isMilestone,
            isSummary: task.isSummary
        };
    }, [task, timelineStart, cellWidth]);

    const priorityStyles: any = {
        high: "from-rose-500/30 to-orange-500/20 border-rose-500/40 shadow-rose-500/10",
        medium: "from-amber-500/30 to-yellow-500/20 border-amber-500/40 shadow-amber-500/10",
        low: "from-emerald-500/30 to-teal-500/20 border-emerald-500/40 shadow-emerald-500/10",
    };

    if (isMilestone) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.5, rotate: 45 }}
                animate={{ opacity: 1, scale: 1, rotate: 45 }}
                style={{ left }}
                className="absolute flex items-center justify-center z-10 cursor-pointer group"
            >
                <div className="w-6 h-6 bg-indigo-600 border-2 border-white dark:border-slate-800 shadow-xl group-hover:scale-125 transition-all">
                    <div className="-rotate-45 flex items-center justify-center h-full">
                        <Sparkles className="w-2.5 h-2.5 text-white" />
                    </div>
                </div>
            </motion.div>
        );
    }

    if (isSummary) {
        return (
            <div
                style={{ left, width }}
                className="absolute h-8 flex flex-col justify-end z-10 pointer-events-none"
            >
                {/* Summary Bar Bracket Shape */}
                <div className="h-2 w-full bg-slate-900 dark:bg-slate-200 rounded-sm relative">
                    <div className="absolute left-0 bottom-0 w-1 h-3 bg-slate-900 dark:bg-slate-200 rounded-sm" />
                    <div className="absolute right-0 bottom-0 w-1 h-3 bg-slate-900 dark:bg-slate-200 rounded-sm" />
                </div>
                <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/80 mb-1 px-1">
                    {Math.round(task.progress || 0)}% AGGREGATE
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ left, width }}
            className={cn(
                "absolute h-10 rounded-2xl border flex items-center px-4 cursor-grab active:cursor-grabbing group backdrop-blur-xl shadow-lg transition-all",
                "bg-gradient-to-r",
                priorityStyles[task.priority] || "from-slate-500/20 to-slate-400/10 border-white/10"
            )}
        >
            {/* Progress Fill */}
            <div className="absolute inset-0 bg-black/5 dark:bg-white/5 rounded-2xl overflow-hidden pointer-events-none">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${task.progress || 0}%` }}
                    className="h-full bg-white/20 dark:bg-white/10"
                />
            </div>

            <div className="flex items-center justify-between w-full gap-3 overflow-hidden pointer-events-none">
                <div className="flex items-center gap-2 overflow-hidden">
                    {task.status === "done" ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                    ) : task.status === "blocked" ? (
                        <AlertCircle className="h-3 w-3 text-rose-500 flex-shrink-0" />
                    ) : null}
                    <span className="text-[10px] font-black uppercase tracking-widest truncate">
                        {task.title}
                    </span>
                </div>
                
                <span className="text-[9px] font-black opacity-40 flex-shrink-0">
                    {Math.round(task.progress || 0)}%
                </span>
            </div>

            {/* Drag Handles */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/30 rounded-l-2xl" />
            <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/30 rounded-r-2xl" />
        </motion.div>
    );
}
