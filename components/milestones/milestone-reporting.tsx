"use client";

import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Milestone, TrendingUp, AlertTriangle, CheckCircle2, Clock, Calendar } from "lucide-react";
import { format, parseISO, isPast, isToday, differenceInDays } from "date-fns";

interface MilestoneStats {
  total: number;
  completed: number;
  active: number;
  planned: number;
  cancelled: number;
  overdue: number;
  dueThisWeek: number;
  completionRate: number;
  avgDaysToComplete: number;
}

export function MilestoneReporting({ projectId }: { projectId?: string }) {
  const { activeWorkspaceId } = useWorkspace();

  const { data: milestones } = useQuery({
    queryKey: ["milestones-report", activeWorkspaceId, projectId],
    queryFn: async () => {
      if (!activeWorkspaceId) return [];
      const params = new URLSearchParams({ workspaceId: activeWorkspaceId });
      if (projectId) params.set("projectId", projectId);
      const res = await fetch(`/api/milestones?${params}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!activeWorkspaceId,
  });

  const milestoneList = Array.isArray(milestones) ? milestones : [];

  const stats: MilestoneStats = {
    total: milestoneList.length,
    completed: milestoneList.filter((m: any) => m.status === "completed").length,
    active: milestoneList.filter((m: any) => m.status === "active").length,
    planned: milestoneList.filter((m: any) => m.status === "planned").length,
    cancelled: milestoneList.filter((m: any) => m.status === "cancelled").length,
    overdue: milestoneList.filter((m: any) => m.status !== "completed" && m.status !== "cancelled" && isPast(parseISO(m.dueDate)) && !isToday(parseISO(m.dueDate))).length,
    dueThisWeek: milestoneList.filter((m: any) => {
      const due = parseISO(m.dueDate);
      const now = new Date();
      const daysUntil = differenceInDays(due, now);
      return daysUntil >= 0 && daysUntil <= 7;
    }).length,
    completionRate: milestoneList.length > 0 
      ? Math.round((milestoneList.filter((m: any) => m.status === "completed").length / milestoneList.length) * 100)
      : 0,
    avgDaysToComplete: 0,
  };

  const atRiskMilestones = milestoneList.filter((m: any) => {
    if (m.status === "completed" || m.status === "cancelled") return false;
    const due = parseISO(m.dueDate);
    const now = new Date();
    const daysUntil = differenceInDays(due, now);
    const linkedTasks = m.tasks || [];
    const completedTasks = linkedTasks.filter((t: any) => t.isCompleted).length;
    const completionRate = linkedTasks.length > 0 ? completedTasks / linkedTasks.length : 0;
    
    return (daysUntil <= 3 && completionRate < 0.8) || 
           (isPast(due) && !isToday(due)) ||
           (daysUntil <= 0 && completionRate < 1);
  });

  if (milestoneList.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.completed} completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completionRate}%</div>
            <Progress value={stats.completionRate} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", stats.overdue > 0 && "text-amber-500")}>
              {stats.overdue}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Need attention
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Due This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", stats.dueThisWeek > 0 && "text-blue-500")}>
              {stats.dueThisWeek}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Upcoming deadlines
            </p>
          </CardContent>
        </Card>
      </div>

      {atRiskMilestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              At Risk Milestones ({atRiskMilestones.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {atRiskMilestones.map((milestone: any) => {
                const due = parseISO(milestone.dueDate);
                const now = new Date();
                const daysUntil = differenceInDays(due, now);
                const linkedTasks = milestone.tasks || [];
                const completedTasks = linkedTasks.filter((t: any) => t.isCompleted).length;
                const completionRate = linkedTasks.length > 0 ? Math.round((completedTasks / linkedTasks.length) * 100) : 0;
                const isOverdue = isPast(due) && !isToday(due);

                return (
                  <div
                    key={milestone.id}
                    className={cn(
                      "flex items-center gap-4 p-3 rounded-lg border",
                      isOverdue ? "bg-amber-500/5 border-amber-500/30" : "bg-blue-500/5 border-blue-500/30"
                    )}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: milestone.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{milestone.title}</p>
                        <Badge variant={isOverdue ? "destructive" : "secondary"} className="text-[10px]">
                          {isOverdue ? "Overdue" : `${daysUntil}d left`}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>Due: {format(due, "MMM d, yyyy")}</span>
                        {milestone.project && <span>{milestone.project.name}</span>}
                        {linkedTasks.length > 0 && (
                          <span>{completedTasks}/{linkedTasks.length} tasks ({completionRate}%)</span>
                        )}
                      </div>
                    </div>
                    <div className="w-24">
                      <Progress value={completionRate} className="h-2" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Status Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-slate-500">{stats.planned}</div>
              <p className="text-xs text-muted-foreground">Planned</p>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-500">{stats.active}</div>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-emerald-500">{stats.completed}</div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-500">{stats.cancelled}</div>
              <p className="text-xs text-muted-foreground">Cancelled</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
