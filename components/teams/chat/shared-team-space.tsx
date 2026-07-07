"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Target,
  CalendarDays,
  Users,
  ArrowRight,
  Loader2,
  ListChecks,
  TrendingUp,
} from "lucide-react";

interface TeamOverview {
  projects: number;
  activeTasks: number;
  completedTasks: number;
  upcomingDeadlines: { title: string; dueDate: string }[];
  memberCount: number;
  sprintProgress?: number;
}

export default function SharedTeamSpace({ workspaceId, teamId }: { workspaceId: string; teamId: string }) {
  const [overview, setOverview] = useState<TeamOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!workspaceId || !teamId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/projects?workspaceId=${workspaceId}&teamId=${teamId}`).then(r => r.json()),
      fetch(`/api/tasks?workspaceId=${workspaceId}&teamId=${teamId}&limit=5&deadlineUpcoming=true`).then(r => r.json()),
      fetch(`/api/teams/${teamId}/members`).then(r => r.json()),
    ])
      .then(([projects, tasks, members]) => {
        const projList = Array.isArray(projects) ? projects : projects?.projects ?? [];
        const taskList = Array.isArray(tasks) ? tasks : tasks?.tasks ?? [];
        const memberList = Array.isArray(members) ? members : members?.members ?? [];
        const allTasks = Array.isArray(tasks) ? tasks : [];

        setOverview({
          projects: projList.length,
          activeTasks: taskList.filter((t: any) => t.status !== "done" && t.status !== "completed").length,
          completedTasks: taskList.filter((t: any) => t.status === "done" || t.status === "completed").length,
          upcomingDeadlines: taskList
            .filter((t: any) => t.dueDate)
            .slice(0, 3)
            .map((t: any) => ({ title: t.title, dueDate: t.dueDate })),
          memberCount: memberList.length,
          sprintProgress: allTasks.length > 0
            ? Math.round((taskList.filter((t: any) => t.status === "done" || t.status === "completed").length / allTasks.length) * 100)
            : 0,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId, teamId]);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Team Overview</span>
        </div>
        <ArrowRight className={`w-4 h-4 text-muted-foreground transition-transform ${collapsed ? "" : "rotate-90"}`} />
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : overview ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-1.5 mb-1">
                        <LayoutDashboard className="w-3 h-3 text-primary" />
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Projects</span>
                      </div>
                      <span className="text-lg font-bold text-foreground">{overview.projects}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-1.5 mb-1">
                        <ListChecks className="w-3 h-3 text-amber-500" />
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Active</span>
                      </div>
                      <span className="text-lg font-bold text-foreground">{overview.activeTasks}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-1.5 mb-1">
                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Done</span>
                      </div>
                      <span className="text-lg font-bold text-foreground">{overview.completedTasks}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Users className="w-3 h-3 text-blue-500" />
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Members</span>
                      </div>
                      <span className="text-lg font-bold text-foreground">{overview.memberCount}</span>
                    </div>
                  </div>

                  {overview.sprintProgress != null && overview.sprintProgress > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">Sprint Progress</span>
                        <span className="text-xs font-semibold text-foreground">{overview.sprintProgress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${overview.sprintProgress}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500"
                        />
                      </div>
                    </div>
                  )}

                  {overview.upcomingDeadlines.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <CalendarDays className="w-3 h-3 text-rose-500" />
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">Upcoming Deadlines</span>
                      </div>
                      <div className="space-y-1.5">
                        {overview.upcomingDeadlines.map((d, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-foreground">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            <span className="flex-1 truncate">{d.title}</span>
                            <span className="text-muted-foreground shrink-0">
                              {new Date(d.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">Could not load overview</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
