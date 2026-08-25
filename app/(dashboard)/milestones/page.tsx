"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { useSearchParams } from "next/navigation";
import { MilestonePanel } from "@/components/timeline/milestone-panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Milestone, Plus, Calendar, CheckCircle2, Clock, AlertTriangle, Filter } from "lucide-react";
import { format, parseISO, isPast, isToday, isFuture } from "date-fns";

type StatusFilter = "all" | "planned" | "active" | "completed" | "cancelled";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  planned: { label: "Planned", color: "bg-slate-500", icon: Clock },
  active: { label: "Active", color: "bg-blue-500", icon: Milestone },
  completed: { label: "Completed", color: "bg-emerald-500", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-500", icon: AlertTriangle },
};

export default function Page() {
  const { activeWorkspaceId } = useWorkspace();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");

  const { data: projects } = useQuery({
    queryKey: ["sidebar-projects", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) return [];
      const res = await fetch(`/api/projects?workspaceId=${activeWorkspaceId}&limit=50`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!activeWorkspaceId,
  });

  const { data: milestones, isLoading } = useQuery({
    queryKey: ["milestones", activeWorkspaceId, selectedProjectId, statusFilter],
    queryFn: async () => {
      if (!activeWorkspaceId) return [];
      const params = new URLSearchParams({ workspaceId: activeWorkspaceId });
      if (selectedProjectId && selectedProjectId !== "all") params.set("projectId", selectedProjectId);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/milestones?${params}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!activeWorkspaceId,
  });

  const milestoneList = Array.isArray(milestones) ? milestones : [];

  const stats = {
    total: milestoneList.length,
    planned: milestoneList.filter((m: any) => m.status === "planned").length,
    active: milestoneList.filter((m: any) => m.status === "active").length,
    completed: milestoneList.filter((m: any) => m.status === "completed").length,
    overdue: milestoneList.filter((m: any) => m.status !== "completed" && m.status !== "cancelled" && isPast(parseISO(m.dueDate)) && !isToday(parseISO(m.dueDate))).length,
  };

  const getMilestoneStatusConfig = (status: string) => STATUS_CONFIG[status] || STATUS_CONFIG.planned;

  const groupedByProject = milestoneList.reduce((acc: any, milestone: any) => {
    const projectName = milestone.project?.name || "Unassigned";
    if (!acc[projectName]) acc[projectName] = [];
    acc[projectName].push(milestone);
    return acc;
  }, {});

  if (!activeWorkspaceId) return null;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold">All Milestones</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track progress across all projects
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-card rounded-lg border border-border/50">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Milestone className="h-4 w-4" />
            <span className="text-xs font-medium">Total</span>
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="p-4 bg-card rounded-lg border border-border/50">
          <div className="flex items-center gap-2 text-blue-500 mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium">Active</span>
          </div>
          <p className="text-2xl font-bold">{stats.active + stats.planned}</p>
        </div>
        <div className="p-4 bg-card rounded-lg border border-border/50">
          <div className="flex items-center gap-2 text-emerald-500 mb-1">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-medium">Completed</span>
          </div>
          <p className="text-2xl font-bold">{stats.completed}</p>
        </div>
        <div className="p-4 bg-card rounded-lg border border-border/50">
          <div className="flex items-center gap-2 text-amber-500 mb-1">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium">Overdue</span>
          </div>
          <p className="text-2xl font-bold">{stats.overdue}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {Array.isArray(projects) && projects.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground justify-center">
          <Milestone className="h-4 w-4 animate-pulse" /> Loading milestones...
        </div>
      ) : milestoneList.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border/50 rounded-lg">
          <Milestone className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No milestones found</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Create milestones in any project to see them here</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByProject).map(([projectName, projectMilestones]: [string, any]) => (
            <div key={projectName}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground">{projectName}</h3>
                <Badge variant="secondary" className="text-[10px]">{projectMilestones.length}</Badge>
              </div>
              <div className="grid gap-3">
                {projectMilestones.map((milestone: any) => {
                  const statusConfig = getMilestoneStatusConfig(milestone.status);
                  const StatusIcon = statusConfig.icon;
                  const isOverdue = milestone.status !== "completed" && milestone.status !== "cancelled" && isPast(parseISO(milestone.dueDate)) && !isToday(parseISO(milestone.dueDate));
                  const isDueToday = isToday(parseISO(milestone.dueDate));
                  const linkedTasks = milestone.tasks || [];
                  const completedTasks = linkedTasks.filter((t: any) => t.isCompleted).length;

                  return (
                    <div
                      key={milestone.id}
                      className={cn(
                        "p-4 bg-card border border-border/50 rounded-lg transition-all hover:border-primary/20",
                        isOverdue && "border-amber-500/30 bg-amber-500/5",
                        isDueToday && "border-emerald-500/30 bg-emerald-500/5"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0 border-2 border-background"
                          style={{ backgroundColor: milestone.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-sm font-semibold truncate">{milestone.title}</h4>
                            <div className="flex items-center gap-2">
                              <span className={cn("px-2 py-0.5 text-[10px] font-medium rounded-full text-white", statusConfig.color)}>
                                {statusConfig.label}
                              </span>
                            </div>
                          </div>
                          {milestone.description && (
                            <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">{milestone.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground/60">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(parseISO(milestone.dueDate), "MMM d, yyyy")}
                              {isOverdue && <span className="text-amber-500 font-medium ml-1">(overdue)</span>}
                              {isDueToday && <span className="text-emerald-500 font-medium ml-1">(today)</span>}
                            </span>
                            {linkedTasks.length > 0 && (
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {completedTasks}/{linkedTasks.length} tasks
                              </span>
                            )}
                            {milestone.owner && (
                              <span className="text-muted-foreground/50">{milestone.owner.name}</span>
                            )}
                          </div>
                          {linkedTasks.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border/30">
                              <div className="flex gap-2 overflow-x-auto pb-1">
                                {linkedTasks.slice(0, 6).map((task: any) => (
                                  <div
                                    key={task.id}
                                    className="flex-shrink-0 w-36 bg-muted/50 rounded border border-border/30 p-2"
                                    title={task.title}
                                  >
                                    <div className="flex items-center gap-1.5 text-[10px]">
                                      <span
                                        className={cn(
                                          "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                          task.isCompleted ? "bg-emerald-500" :
                                          task.statusCategory === "IN_PROGRESS" ? "bg-blue-500" :
                                          task.statusCategory === "BLOCKED" ? "bg-red-500" :
                                          "bg-slate-400"
                                        )}
                                      />
                                      <span className="truncate font-medium">{task.title}</span>
                                    </div>
                                    {task.dueDate && (
                                      <span className="text-[9px] text-muted-foreground/50 flex mt-1">
                                        {format(parseISO(task.dueDate), "MMM d")}
                                      </span>
                                    )}
                                  </div>
                                ))}
                                {linkedTasks.length > 6 && (
                                  <div className="flex-shrink-0 w-16 flex items-center justify-center text-[10px] text-muted-foreground bg-muted/50 rounded border border-dashed border-border/30">
                                    +{linkedTasks.length - 6} more
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
