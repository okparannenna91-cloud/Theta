"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Users, Clock, AlertTriangle, TrendingUp,
  CalendarDays, Filter, ChevronLeft, ChevronRight
} from "lucide-react";
import { format, addDays, startOfWeek, differenceInDays } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface WorkloadViewProps {
  tasks: any[];
  workspaceId: string;
}

export default function WorkloadView({ tasks, workspaceId }: WorkloadViewProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = addDays(startOfWeek(new Date()), weekOffset * 7);
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const assigneeGroups: Record<string, any[]> = {};
  tasks.forEach(t => {
    const key = t.assigneeId || "unassigned";
    if (!assigneeGroups[key]) assigneeGroups[key] = [];
    assigneeGroups[key].push(t);
  });

  const getCapacity = (assignee: string) => {
    const userTasks = assigneeGroups[assignee] || [];
    const activeTasks = userTasks.filter(t => t.status !== "done" && t.status !== "completed");
    return Math.min(activeTasks.length * 20, 100);
  };

  const getColor = (capacity: number) => {
    if (capacity >= 80) return "text-red-500 bg-red-500";
    if (capacity >= 50) return "text-amber-500 bg-amber-500";
    return "text-emerald-500 bg-emerald-500";
  };

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold">Workload</h3>
          <p className="text-xs text-muted-foreground">Team capacity management</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 rounded-xl p-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setWeekOffset(w => w - 1)}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="text-xs font-bold px-2 min-w-[140px] text-center">
              {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setWeekOffset(w => w + 1)}>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold" onClick={() => setWeekOffset(0)}>
            Today
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="border rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex bg-slate-50 dark:bg-slate-900 border-b">
            <div className="w-48 flex-shrink-0 px-4 py-3 border-r">
              <span className="text-[10px] font-bold text-slate-500">Team Member</span>
            </div>
            {days.map((day, i) => (
              <div key={i} className={cn(
                "flex-1 px-3 py-3 text-center border-r last:border-r-0",
                (day.getDay() === 0 || day.getDay() === 6) && "bg-slate-100/50 dark:bg-slate-800/20"
              )}>
                <div className="text-[9px] font-bold uppercase text-slate-400">{format(day, "EEE")}</div>
                <div className={cn(
                  "text-xs font-bold mt-0.5",
                  format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") && "text-primary"
                )}>
                  {format(day, "d")}
                </div>
              </div>
            ))}
            <div className="w-20 flex-shrink-0 px-3 py-3 text-center">
              <span className="text-[10px] font-bold text-slate-500">Load</span>
            </div>
          </div>

          {/* Team Rows */}
          {Object.entries(assigneeGroups).length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No team workload data</p>
              <p className="text-xs mt-1">Assign tasks to team members to see workload</p>
            </div>
          ) : (
            Object.entries(assigneeGroups).map(([assignee, assigneeTasks]) => {
              const capacity = getCapacity(assignee);
              const capColor = getColor(capacity);

              return (
                <div key={assignee} className="flex border-b last:border-b-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="w-48 flex-shrink-0 px-4 py-4 border-r flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {assignee === "unassigned" ? "?" : assignee[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-medium">{assignee === "unassigned" ? "Unassigned" : assignee}</p>
                      <p className="text-[9px] text-slate-400">{assigneeTasks.length} tasks</p>
                    </div>
                  </div>

                  {days.map((day, i) => {
                    const dayTasks = assigneeTasks.filter(t => {
                      if (!t.dueDate) return false;
                      return format(new Date(t.dueDate), "yyyy-MM-dd") === format(day, "yyyy-MM-dd");
                    });
                    const isOverdue = dayTasks.some(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done");
                    return (
                      <div key={i} className={cn(
                        "flex-1 px-3 py-4 border-r last:border-r-0 relative",
                        (day.getDay() === 0 || day.getDay() === 6) && "bg-slate-100/30 dark:bg-slate-800/10"
                      )}>
                        {dayTasks.slice(0, 2).map((t, ti) => (
                          <div key={ti} className={cn(
                            "text-[9px] font-bold px-1.5 py-0.5 rounded mb-0.5 truncate",
                            t.priority === "high" ? "bg-red-100 dark:bg-red-900/20 text-red-600" : "bg-muted dark:bg-primary/10 text-primary"
                          )}>
                            {t.title}
                          </div>
                        ))}
                        {dayTasks.length > 2 && (
                          <div className="text-[8px] text-slate-400 font-bold">+{dayTasks.length - 2} more</div>
                        )}
                        {isOverdue && <AlertTriangle className="h-3 w-3 text-red-500 absolute top-1 right-1" />}
                      </div>
                    );
                  })}

                  <div className="w-20 flex-shrink-0 px-3 py-4 flex items-center justify-center">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full border-2 flex items-center justify-center">
                        <div className={cn("h-4 w-4 rounded-full", capColor.replace("text-", "bg-").split(" ")[1])}
                          style={{ opacity: capacity / 100 }} />
                      </div>
                      <span className={cn("text-[10px] font-bold", capColor.split(" ")[0])}>{capacity}%</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
