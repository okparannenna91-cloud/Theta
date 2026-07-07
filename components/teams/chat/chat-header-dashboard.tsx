"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  ListChecks,
  Clock,
  FolderKanban,
  TrendingUp,
  Loader2,
} from "lucide-react";

interface Metrics {
  tasksCompleted: number;
  openTasks: number;
  upcomingDeadlines: number;
  activeProjects: number;
  teamVelocity: number;
}

export default function ChatHeaderDashboard({ workspaceId, teamId }: { workspaceId: string; teamId: string }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId || !teamId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/tasks?workspaceId=${workspaceId}&teamId=${teamId}&limit=1&count=true`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/projects?workspaceId=${workspaceId}&teamId=${teamId}&limit=1&count=true`).then(r => r.json()).catch(() => ({})),
    ])
      .then(([tasksData, projectsData]) => {
        const tasks = Array.isArray(tasksData) ? tasksData : tasksData?.tasks ?? [];
        const projects = Array.isArray(projectsData) ? projectsData : projectsData?.projects ?? [];
        const completed = tasks.filter((t: any) => t.status === "done" || t.status === "completed").length;
        const upcoming = tasks.filter((t: any) => t.dueDate && new Date(t.dueDate) > new Date()).length;

        setMetrics({
          tasksCompleted: completed,
          openTasks: tasks.length - completed,
          upcomingDeadlines: upcoming,
          activeProjects: projects.filter((p: any) => p.status !== "archived").length,
          teamVelocity: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId, teamId]);

  if (loading) return null;

  const items = metrics ? [
    { icon: CheckCircle2, label: "Completed", value: metrics.tasksCompleted, color: "text-emerald-500" },
    { icon: ListChecks, label: "Open", value: metrics.openTasks, color: "text-amber-500" },
    { icon: Clock, label: "Deadlines", value: metrics.upcomingDeadlines, color: "text-rose-500" },
    { icon: FolderKanban, label: "Projects", value: metrics.activeProjects, color: "text-blue-500" },
    { icon: TrendingUp, label: "Velocity", value: `${metrics.teamVelocity}%`, color: "text-purple-500" },
  ] : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4"
    >
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <item.icon className={`w-3 h-3 ${item.color}`} />
          <span className="text-xs font-medium text-muted-foreground hidden sm:inline">{item.label}</span>
          <span className="text-xs font-bold text-foreground">{item.value}</span>
        </div>
      ))}
    </motion.div>
  );
}
