"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  CalendarDays,
  ArrowUpRight,
  ListTodo,
  Bell,
} from "lucide-react";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { cn } from "@/lib/utils";

function startOfDay(d: Date) {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s;
}

function endOfDay(d: Date) {
  const e = new Date(d);
  e.setHours(23, 59, 59, 999);
  return e;
}

function isOverdue(dueDate: string) {
  return new Date(dueDate) < startOfDay(new Date());
}

function isDueToday(dueDate: string) {
  const now = new Date();
  const due = new Date(dueDate);
  return (
    startOfDay(due) <= now && due <= endOfDay(now)
  );
}

function isUpcoming(dueDate: string) {
  const now = new Date();
  const due = new Date(dueDate);
  return due > endOfDay(now);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function priorityColor(p: string) {
  switch (p) {
    case "urgent":
      return "bg-red-500/15 text-red-600 border-red-500/30";
    case "high":
      return "bg-orange-500/15 text-orange-600 border-orange-500/30";
    case "medium":
      return "bg-yellow-500/15 text-yellow-600 border-yellow-500/30";
    case "low":
      return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
    default:
      return "bg-slate-500/15 text-slate-600 border-slate-500/30";
  }
}

function TaskRow({
  task,
  onClick,
}: {
  task: any;
  onClick: () => void;
}) {
  const overdue = task.dueDate && task.status !== "done" && isOverdue(task.dueDate);
  const dueToday = task.dueDate && isDueToday(task.dueDate);

  return (
    <Card
      className="group p-3 flex items-center gap-3 hover:border-primary/20 cursor-pointer transition-all shadow-sm"
      onClick={onClick}
    >
      <button className="shrink-0 hover:scale-110 transition-transform active:scale-95 z-10">
        {task.status === "done" ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : (
          <Circle className="h-4 w-4 text-slate-300 hover:text-emerald-500/50" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <h4
          className={cn(
            "text-sm font-medium truncate group-hover:text-primary transition-colors",
            task.status === "done" && "line-through text-muted-foreground opacity-60"
          )}
        >
          {task.title}
        </h4>
        <div className="flex items-center gap-2 mt-0.5">
          {task.project?.name && (
            <span className="text-[10px] text-muted-foreground font-medium">
              {task.project.name}
            </span>
          )}
          {task.dueDate && (
            <span
              className={cn(
                "text-[10px] font-medium",
                overdue ? "text-red-500" : dueToday ? "text-amber-500" : "text-muted-foreground"
              )}
            >
              {overdue ? "Overdue" : dueToday ? "Today" : formatDate(task.dueDate)}
            </span>
          )}
        </div>
      </div>

      <Badge
        variant="outline"
        className={cn("text-[9px] font-semibold border px-1.5 py-0 h-4", priorityColor(task.priority || "medium"))}
      >
        {task.priority || "Medium"}
      </Badge>
    </Card>
  );
}

function SectionHeader({
  icon: Icon,
  label,
  count,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={cn("p-1.5 rounded-md", accent)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{label}</h3>
      <Badge variant="secondary" className="text-[10px] font-semibold px-1.5 py-0 h-4 rounded-md">
        {count}
      </Badge>
    </div>
  );
}

function EmptySection({ message }: { message: string }) {
  return (
    <p className="text-xs text-muted-foreground italic py-2">{message}</p>
  );
}

export default function MyTasksPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setUserId(data?.id))
      .catch(() => {});
  }, []);

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ["tasks", activeWorkspaceId, "my", userId],
    queryFn: async () => {
      const params = new URLSearchParams({ workspaceId: activeWorkspaceId! });
      if (userId) params.set("assigneeId", userId);
      params.set("limit", "200");
      const res = await fetch(`/api/tasks?${params}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
    enabled: !!activeWorkspaceId && !!userId,
  });

  const allTasks = Array.isArray(tasksData?.tasks) ? tasksData.tasks : [];
  const now = new Date();

  const overdue = allTasks.filter(
    (t: any) => t.status !== "done" && t.dueDate && isOverdue(t.dueDate)
  );
  const dueToday = allTasks.filter(
    (t: any) => t.status !== "done" && t.dueDate && isDueToday(t.dueDate)
  );
  const upcoming = allTasks.filter(
    (t: any) => t.status !== "done" && t.dueDate && isUpcoming(t.dueDate)
  );
  const completed = allTasks.filter((t: any) => t.status === "done");
  const noDueDate = allTasks.filter(
    (t: any) => t.status !== "done" && !t.dueDate
  );

  const totalActive = overdue.length + dueToday.length + upcoming.length + noDueDate.length;

  if (isLoading || !userId) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">My Tasks</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Tasks assigned to you across all projects
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{overdue.length}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Overdue</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{dueToday.length}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Due Today</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <CalendarDays className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{upcoming.length}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Upcoming</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{completed.length}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {overdue.length > 0 && (
          <div>
            <SectionHeader icon={AlertTriangle} label="Overdue" count={overdue.length} accent="bg-red-500/10" />
            <div className="grid gap-2">
              {overdue.map((task: any) => (
                <TaskRow key={task.id} task={task} onClick={() => setSelectedTask(task)} />
              ))}
            </div>
          </div>
        )}

        {dueToday.length > 0 && (
          <div>
            <SectionHeader icon={Clock} label="Due Today" count={dueToday.length} accent="bg-amber-500/10" />
            <div className="grid gap-2">
              {dueToday.map((task: any) => (
                <TaskRow key={task.id} task={task} onClick={() => setSelectedTask(task)} />
              ))}
            </div>
          </div>
        )}

        {upcoming.length > 0 && (
          <div>
            <SectionHeader icon={CalendarDays} label="Upcoming" count={upcoming.length} accent="bg-blue-500/10" />
            <div className="grid gap-2">
              {upcoming.map((task: any) => (
                <TaskRow key={task.id} task={task} onClick={() => setSelectedTask(task)} />
              ))}
            </div>
          </div>
        )}

        {noDueDate.length > 0 && (
          <div>
            <SectionHeader icon={ListTodo} label="No Due Date" count={noDueDate.length} accent="bg-slate-500/10" />
            <div className="grid gap-2">
              {noDueDate.map((task: any) => (
                <TaskRow key={task.id} task={task} onClick={() => setSelectedTask(task)} />
              ))}
            </div>
          </div>
        )}

        {completed.length > 0 && (
          <div>
            <SectionHeader icon={CheckCircle2} label="Completed" count={completed.length} accent="bg-emerald-500/10" />
            <div className="grid gap-2">
              {completed.map((task: any) => (
                <TaskRow key={task.id} task={task} onClick={() => setSelectedTask(task)} />
              ))}
            </div>
          </div>
        )}

        {totalActive === 0 && completed.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-900/50 rounded-lg border-2 border-dashed">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-sm font-semibold mb-1">All caught up!</h3>
            <p className="text-sm text-muted-foreground">No tasks assigned to you right now.</p>
          </div>
        )}
      </div>

      {selectedTask && (
        <TaskDialog
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          workspaceId={activeWorkspaceId || ""}
        />
      )}
    </div>
  );
}
