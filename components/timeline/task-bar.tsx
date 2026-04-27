"use client";

import { useMemo } from "react";
import { differenceInDays, startOfDay } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Milestone, MoreVertical, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    // Calculate position and width
    const { left, width, isMilestone } = useMemo(() => {
        const start = task.startDate ? new Date(task.startDate) : (task.dueDate ? new Date(task.dueDate) : new Date());
        const end = task.dueDate ? new Date(task.dueDate) : start;
        
        const daysFromStart = differenceInDays(startOfDay(start), startOfDay(timelineStart));
        const duration = Math.max(1, differenceInDays(startOfDay(end), startOfDay(start)) + 1);
        
        return {
            left: daysFromStart * cellWidth,
            width: duration * cellWidth,
            isMilestone: task.isMilestone
        };
    }, [task, timelineStart, cellWidth]);

    const statusColors: any = {
        todo: "bg-slate-500/10 border-slate-500/20 text-slate-500",
        "in-progress": "bg-blue-500/10 border-blue-500/20 text-blue-500",
        blocked: "bg-red-500/10 border-red-500/20 text-red-500",
        done: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
    };

    const priorityGradients: any = {
        high: "from-rose-500/20 to-orange-500/10 border-rose-500/30",
        medium: "from-amber-500/20 to-yellow-500/10 border-amber-500/30",
        low: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30",
    };

    if (isMilestone) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ left }}
                className="absolute flex items-center justify-center z-10 cursor-pointer group"
            >
                <div className="relative">
                    {/* Diamond shape for Milestone */}
                    <div className="w-8 h-8 rotate-45 bg-indigo-600 border-4 border-white dark:border-slate-800 shadow-xl group-hover:scale-110 transition-transform flex items-center justify-center">
                        <Sparkles className="w-3 h-3 text-white -rotate-45" />
                    </div>
                    {/* Tooltip hint */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg whitespace-nowrap pointer-events-none shadow-2xl z-20">
                        Milestone: {task.title}
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            layout
            style={{ left, width }}
            className={cn(
                "absolute h-10 rounded-2xl border flex items-center px-4 cursor-move group transition-all backdrop-blur-md",
                "bg-gradient-to-r shadow-lg hover:shadow-2xl hover:scale-[1.01] active:scale-100",
                priorityGradients[task.priority] || "from-indigo-500/20 to-purple-500/10 border-indigo-500/30"
            )}
        >
            {/* Progress Fill Background */}
            <div 
                className="absolute inset-0 bg-primary/10 -z-10 rounded-2xl overflow-hidden"
            >
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${task.progress || 0}%` }}
                    className="h-full bg-primary/20 transition-all duration-1000"
                />
            </div>

            {/* Task Info */}
            <div className="flex items-center justify-between w-full gap-3 overflow-hidden">
                <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-[10px] font-black uppercase tracking-widest truncate">
                        {task.title}
                    </span>
                    {task.progress > 0 && (
                        <span className="text-[9px] font-black text-primary/60">{task.progress}%</span>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg hover:bg-white/20">
                                <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-white/10 shadow-2xl">
                            <DropdownMenuItem className="text-[10px] font-black uppercase tracking-widest py-2">Edit Details</DropdownMenuItem>
                            <DropdownMenuItem className="text-[10px] font-black uppercase tracking-widest py-2">Add Dependency</DropdownMenuItem>
                            <DropdownMenuItem className="text-[10px] font-black uppercase tracking-widest py-2 text-rose-500">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Resize Handles */}
            <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 rounded-l-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 rounded-r-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.div>
    );
}
