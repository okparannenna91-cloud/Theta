"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { format, differenceInDays, parseISO, isAfter } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Calendar,
  User,
  Layers,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  TrendingUp,
  Flag,
  Milestone as MilestoneIcon,
  ListChecks,
  GanttChartSquare,
  Zap,
  ArrowLeft,
  ArrowRight,
  Target,
  Clock,
} from "lucide-react";
import { BurndownChart } from "./project-burndown";

interface ProjectOverviewProps {
  project: any;
}

const springUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { type: "spring", stiffness: 300, damping: 24, mass: 0.8 },
};

function StatCard({ icon: Icon, label, value, sub, color, bg, trend, delay = 0 }: {
  icon: any; label: string; value: string | number; sub?: string;
  color: string; bg: string; trend?: { dir: "up" | "down"; pct: string }; delay?: number;
}) {
  return (
    <motion.div
      {...springUp}
      transition={{ ...springUp.transition, delay }}
    >
      <Card className="relative overflow-hidden bg-card/40 border-0 shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl"
        style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.06)" }}
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none" />
        <CardContent className="p-5 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground/40 tracking-wide uppercase">{label}</p>
              <div className="flex items-baseline gap-1.5">
                <span className={cn("text-2xl font-semibold tracking-tight", color)}>{value}</span>
                {sub && <span className="text-xs text-muted-foreground/30">{sub}</span>}
              </div>
              {trend && (
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className={cn("h-3 w-3", trend.dir === "up" ? "text-emerald-500" : "text-red-500")} />
                  <span className={cn("text-[10px] font-medium", trend.dir === "up" ? "text-emerald-500" : "text-red-500")}>
                    {trend.pct}
                  </span>
                </div>
              )}
            </div>
            <div className={cn(
              "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
              bg
            )}>
              <Icon className={cn("h-4 w-4", color)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function HealthIndicator({ score, status }: { score: number; status: string }) {
  const barColor = status === "HEALTHY" ? "bg-emerald-500" : status === "AT_RISK" ? "bg-amber-500" : "bg-red-500";
  const label = status === "HEALTHY" ? "Healthy" : status === "AT_RISK" ? "At Risk" : "Critical";
  const labelColor = status === "HEALTHY" ? "text-emerald-600 dark:text-emerald-400" : status === "AT_RISK" ? "text-amber-600 dark:text-amber-400" : "text-red-500";

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground/40 tracking-wide uppercase">Health</span>
        <span className={cn("text-[11px] font-semibold", labelColor)}>{label}</span>
      </div>
      <div className="relative h-2 bg-muted/30 rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", barColor)}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        />
      </div>
      <p className="text-xs text-muted-foreground/30">{score}/100</p>
    </div>
  );
}

function MilestoneRow({ milestone }: { milestone: any }) {
  const isDone = milestone.status === "done";
  const isOverdue = !isDone && milestone.dueDate && isAfter(new Date(), parseISO(milestone.dueDate));

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-card/30 border border-border/10 hover:bg-card/50 transition-all group">
      <div className={cn(
        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-all",
        isDone ? "bg-emerald-500/15 text-emerald-500" :
        isOverdue ? "bg-red-500/15 text-red-500" :
        "bg-primary/8 text-primary/60"
      )}>
        {isDone ? <CheckCircle2 className="h-4 w-4" /> : <MilestoneIcon className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={cn("text-sm font-medium truncate", isDone && "line-through text-muted-foreground/50")}>
            {milestone.title}
          </p>
          {isOverdue && <span className="text-[9px] font-medium text-red-400/70 bg-red-500/8 px-1.5 py-0.5 rounded-full">Overdue</span>}
          {isDone && <span className="text-[9px] font-medium text-emerald-400/70 bg-emerald-500/8 px-1.5 py-0.5 rounded-full">Done</span>}
        </div>
        {milestone.dueDate && (
          <p className={cn("text-[11px] mt-0.5", isOverdue ? "text-red-400/60" : "text-muted-foreground/40")}>
            {isDone ? "Completed " : "Due "}{format(parseISO(milestone.dueDate), "MMM d, yyyy")}
          </p>
        )}
      </div>
      {!isDone && milestone.progress !== undefined && (
        <div className="text-xs font-medium text-muted-foreground/30 shrink-0">{Math.round(milestone.progress)}%</div>
      )}
    </div>
  );
}

export function ProjectOverview({ project }: ProjectOverviewProps) {
  const safeTasks = useMemo(() => Array.isArray(project?.tasks) ? project.tasks : [], [project?.tasks]);
  const milestones = useMemo(() => Array.isArray(project?.milestones) ? project.milestones : [], [project?.milestones]);

  const completedTasks = useMemo(() =>
    safeTasks.filter((t: any) => t.status === "done" || t.status === "Completed").length,
    [safeTasks]
  );
  const overdueTasks = useMemo(() =>
    safeTasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done" && t.status !== "Completed").length,
    [safeTasks]
  );
  const progress = safeTasks.length > 0 ? (completedTasks / safeTasks.length) * 100 : 0;

  const tasksByPriority = useMemo(() => {
    const counts: Record<string, number> = {};
    safeTasks.forEach((t: any) => {
      const p = t.priority || "none";
      counts[p] = (counts[p] || 0) + 1;
    });
    return counts;
  }, [safeTasks]);

  const weeksSinceStart = useMemo(() => {
    if (!project.createdAt) return 1;
    return Math.max(1, Math.ceil(differenceInDays(new Date(), new Date(project.createdAt)) / 7));
  }, [project.createdAt]);

  const avgWeeklyCompletion = useMemo(() =>
    ((completedTasks / weeksSinceStart) || 0).toFixed(1),
    [completedTasks, weeksSinceStart]
  );

  const healthScore = useMemo(() => {
    const overduePenalty = overdueTasks * 12;
    const stalled = safeTasks.filter((t: any) => t.status === "in_progress" && t.updatedAt && differenceInDays(new Date(), new Date(t.updatedAt)) > 4).length;
    return Math.max(0, Math.min(100, Math.round(100 - overduePenalty - stalled * 6)));
  }, [safeTasks, overdueTasks]);

  const healthStatus = healthScore >= 70 ? "HEALTHY" : healthScore >= 40 ? "AT_RISK" : "CRITICAL";

  const stuckTasks = useMemo(() =>
    safeTasks.filter((t: any) => t.status === "blocked" || t.status === "stuck").length,
    [safeTasks]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={ListChecks}
            label="Total Tasks"
            value={safeTasks.length}
            color="text-blue-600 dark:text-blue-400"
            bg="bg-blue-500/10"
            delay={0}
          />
          <StatCard
            icon={CheckCircle2}
            label="Completed"
            value={completedTasks}
            sub={`of ${safeTasks.length}`}
            color="text-emerald-600 dark:text-emerald-400"
            bg="bg-emerald-500/10"
            trend={completedTasks > 0 ? { dir: "up", pct: `${Math.round((completedTasks / safeTasks.length) * 100)}%` } : undefined}
            delay={0.05}
          />
          <StatCard
            icon={AlertCircle}
            label="Overdue"
            value={overdueTasks}
            color="text-red-500 dark:text-red-400"
            bg="bg-red-500/10"
            delay={0.1}
          />
        </div>

        {/* Burndown + Summary row */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Burndown */}
          <motion.div {...springUp} transition={{ ...springUp.transition, delay: 0.15 }} className="md:col-span-3">
            <Card className="h-full bg-card/40 border-0 shadow-sm rounded-2xl overflow-hidden relative"
              style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.06)" }}
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none" />
              <div className="p-5 pb-3 relative">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[11px] font-medium text-muted-foreground/40 tracking-wide uppercase">Burndown</h3>
                  <span className="text-[10px] text-muted-foreground/30">{weeksSinceStart} weeks</span>
                </div>
                <div className="h-20">
                  <BurndownChart totalTasks={safeTasks.length} completedTasks={completedTasks} weeksSinceStart={weeksSinceStart} />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Quick summary */}
          <motion.div {...springUp} transition={{ ...springUp.transition, delay: 0.2 }} className="md:col-span-2">
            <Card className="h-full bg-card/40 border-0 shadow-sm rounded-2xl relative"
              style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.06)" }}
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none" />
              <div className="p-5 relative">
                <h3 className="text-[11px] font-medium text-muted-foreground/40 tracking-wide uppercase mb-3">Sprint Health</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground/50">Velocity</span>
                    <span className="text-xs font-semibold">{avgWeeklyCompletion}/wk</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground/50">Completion</span>
                    <span className="text-xs font-semibold">{Math.round(progress)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground/50">Blocked</span>
                    <span className={cn("text-xs font-semibold", stuckTasks > 0 ? "text-red-400" : "text-muted-foreground/50")}>{stuckTasks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground/50">Capacity</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-muted/30 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-primary/60"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, Math.round((completedTasks / Math.max(safeTasks.length, 1)) * 100))}%` }}
                          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>
                      <span className="text-xs font-semibold">{safeTasks.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* About */}
        <motion.div {...springUp} transition={{ ...springUp.transition, delay: 0.25 }}>
          <Card className="bg-card/40 border-0 shadow-sm rounded-2xl overflow-hidden relative"
            style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.06)" }}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none" />
            <div className="p-5 relative">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold tracking-tight">About</h2>
                  <p className="text-[10px] text-muted-foreground/40">Project description</p>
                </div>
                <span className="text-[10px] font-medium text-primary bg-primary/8 px-2.5 py-1 rounded-full">
                  {project.status || "Active"}
                </span>
              </div>

              <p className="text-sm text-muted-foreground/60 leading-relaxed">
                {project.description || "No description provided yet."}
              </p>

              <div className="mt-4 pt-4 border-t border-border/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-medium text-muted-foreground/40 tracking-wide uppercase">Progress</span>
                  <span className="text-xs font-semibold text-primary">{Math.round(progress)}%</span>
                </div>
                <Progress
                  value={progress}
                  className="h-1.5 bg-muted/30 rounded-full [&>div]:rounded-full [&>div]:bg-gradient-to-r [&>div]:from-primary/70 [&>div]:to-primary"
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Milestones */}
        <motion.div {...springUp} transition={{ ...springUp.transition, delay: 0.3 }} className="space-y-3">
          <div className="flex items-center gap-2.5 px-1">
            <Flag className="h-4 w-4 text-muted-foreground/40" />
            <h3 className="text-xs font-semibold tracking-tight text-muted-foreground/70">Milestones</h3>
            <span className="text-[10px] text-muted-foreground/30">{milestones.length}</span>
          </div>

          {milestones.length > 0 ? (
            <div className="space-y-1.5">
              {milestones.slice(0, 5).map((ms: any) => (
                <MilestoneRow key={ms.id} milestone={ms} />
              ))}
              {milestones.length > 5 && (
                <button className="text-[10px] text-muted-foreground/40 hover:text-foreground transition-colors font-medium px-3 py-1">
                  +{milestones.length - 5} more milestones
                </button>
              )}
            </div>
          ) : (
            <Card className="bg-card/30 border-0 shadow-sm rounded-2xl p-5 text-center">
              <div className="h-8 w-8 rounded-xl bg-muted/30 flex items-center justify-center mx-auto mb-2">
                <Flag className="h-4 w-4 text-muted-foreground/25" />
              </div>
              <p className="text-xs font-medium text-muted-foreground/40">No milestones yet</p>
              <p className="text-[10px] text-muted-foreground/25 mt-0.5">Add milestones to track key checkpoints</p>
            </Card>
          )}
        </motion.div>

        {/* Priority distribution */}
        <motion.div {...springUp} transition={{ ...springUp.transition, delay: 0.35 }}>
          <Card className="bg-card/40 border-0 shadow-sm rounded-2xl relative"
            style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.06)" }}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none" />
            <div className="p-5 relative">
              <h3 className="text-[11px] font-medium text-muted-foreground/40 tracking-wide uppercase mb-3">Priority Distribution</h3>
              <div className="space-y-2">
                {[
                  { key: "urgent", label: "Urgent", color: "bg-red-500", textColor: "text-red-400" },
                  { key: "high", label: "High", color: "bg-orange-500", textColor: "text-orange-400" },
                  { key: "medium", label: "Medium", color: "bg-amber-500", textColor: "text-amber-400" },
                  { key: "low", label: "Low", color: "bg-emerald-500", textColor: "text-emerald-400" },
                ].map((p) => {
                  const count = tasksByPriority[p.key] || 0;
                  const pct = safeTasks.length > 0 ? (count / safeTasks.length) * 100 : 0;
                  return (
                    <div key={p.key} className="flex items-center gap-3">
                      <span className={cn("text-[10px] font-medium w-12", p.textColor)}>{p.label}</span>
                      <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                        <motion.div
                          className={cn("h-full rounded-full", p.color)}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground/40 w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Teams */}
        {(project.projectTeams?.length > 0 || project.team) && (
          <motion.div {...springUp} transition={{ ...springUp.transition, delay: 0.4 }} className="space-y-3">
            <div className="flex items-center gap-2.5 px-1">
              <Layers className="h-4 w-4 text-muted-foreground/40" />
              <h3 className="text-xs font-semibold tracking-tight text-muted-foreground/70">Teams</h3>
            </div>

            <div className="space-y-3">
              {(project.projectTeams?.length > 0 ? project.projectTeams : [project.team].filter(Boolean)).map((pt: any, idx: number) => {
                const team = pt.team || pt;
                const role = pt.role;
                const members = Array.isArray(team?.members) ? team.members : [];
                return (
                  <Card key={pt.id || idx} className="bg-card/40 border-0 shadow-sm rounded-2xl overflow-hidden relative"
                    style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.06)" }}
                  >
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none" />
                    <div className="p-4 relative">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold tracking-tight">{team.name}</span>
                          {role && <span className="text-[9px] font-medium text-primary bg-primary/8 px-2 py-0.5 rounded-full">{role.replace("_", " ")}</span>}
                        </div>
                        <span className="text-[10px] text-muted-foreground/30">{members.length} member{members.length !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {members.slice(0, 8).map((member: any) => {
                          const user = member.user || member;
                          return (
                            <div key={member.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-card/40 border border-border/10">
                              <Avatar className="h-5 w-5 ring-1 ring-background">
                                <AvatarImage src={user?.imageUrl} />
                                <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                  {user?.name?.[0] || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-[10px] font-medium truncate max-w-[80px]">{user?.name}</span>
                            </div>
                          );
                        })}
                        {members.length > 8 && (
                          <div className="flex items-center justify-center px-2.5 py-1.5 rounded-lg bg-muted/20 border border-dashed border-border/10">
                            <span className="text-[10px] text-muted-foreground/30">+{members.length - 8}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* Right sidebar */}
      <div className="space-y-4">
        {/* Health */}
        <motion.div {...springUp} transition={{ ...springUp.transition, delay: 0.2 }}>
          <Card className="bg-card/40 border-0 shadow-sm rounded-2xl overflow-hidden relative"
            style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.06)" }}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none" />
            <div className="p-5 relative">
              <HealthIndicator score={healthScore} status={healthStatus} />

              <div className="mt-4 pt-4 border-t border-border/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground/40">Weekly velocity</span>
                  <span className="text-xs font-semibold">{avgWeeklyCompletion}/wk</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground/40">Overdue tasks</span>
                  <span className={cn("text-xs font-semibold", overdueTasks > 0 ? "text-red-400" : "text-muted-foreground/50")}>{overdueTasks}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground/40">Weeks active</span>
                  <span className="text-xs font-semibold">{weeksSinceStart}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground/40">Completion rate</span>
                  <span className="text-xs font-semibold">{Math.round(progress)}%</span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Project details */}
        <motion.div {...springUp} transition={{ ...springUp.transition, delay: 0.25 }}>
          <Card className="bg-card/40 border-0 shadow-sm rounded-2xl overflow-hidden relative"
            style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.06)" }}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none" />
            <div className="p-4 border-b border-border/10 relative">
              <h3 className="text-[10px] font-semibold text-muted-foreground/40 tracking-wide uppercase">Details</h3>
            </div>
            <div className="p-4 space-y-3.5 relative">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-lg bg-primary/8 flex items-center justify-center text-primary shrink-0">
                  <User className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] font-semibold text-muted-foreground/30 tracking-wide uppercase">Owner</p>
                  <p className="text-xs font-semibold truncate">{project.user?.name || "System"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-lg bg-amber-500/8 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <Calendar className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] font-semibold text-muted-foreground/30 tracking-wide uppercase">Created</p>
                  <p className="text-xs font-semibold truncate">
                    {project.createdAt ? format(new Date(project.createdAt), "MMM d, yyyy") : "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-lg bg-emerald-500/8 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] font-semibold text-muted-foreground/30 tracking-wide uppercase">Duration</p>
                  <p className="text-xs font-semibold truncate">
                    {project.createdAt ? `${format(new Date(project.createdAt), "MMM yyyy")} — present` : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Velocity card */}
        <motion.div {...springUp} transition={{ ...springUp.transition, delay: 0.3 }}>
          <Card className="relative overflow-hidden bg-gradient-to-br from-primary/[0.04] via-primary/[0.01] to-transparent border-0 shadow-sm rounded-2xl"
            style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.06)" }}
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/[0.03] rounded-full -translate-y-1/3 translate-x-1/4 blur-3xl pointer-events-none" />
            <CardContent className="p-5 relative">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-semibold text-muted-foreground/40 tracking-wide uppercase">Velocity</span>
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-2xl font-semibold tracking-tight text-foreground">{avgWeeklyCompletion}</span>
                <span className="text-[10px] font-medium text-muted-foreground/30">tasks/wk</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/8 border border-primary/15 text-primary/70">
                <Zap className="h-3 w-3" />
                <span className="text-[9px] font-semibold">Forecast</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
