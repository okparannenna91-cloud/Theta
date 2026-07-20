"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/hooks/use-workspace";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Play,
  CheckCircle2,
  MoreHorizontal,
  Plus,
  TrendingUp,
  Clock,
  Target,
  AlertCircle,
  ListTodo,
  Loader2,
  ChevronRight,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, parseISO } from "date-fns";
import { AISprintPlanDialog } from "./ai-sprint-plan-dialog";
import { AIInlineButton } from "@/components/ai/ai-inline-button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SprintWithStats {
  id: string;
  name: string;
  projectId: string;
  startDate: string;
  endDate: string;
  goal: string | null;
  status: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  completionRate: number;
  estimatedHours: number;
  actualHours: number;
  daysRemaining: number;
  _count?: { tasks: number };
}

interface BurndownPoint {
  date: string;
  ideal: number;
  actual: number;
}

interface VelocityData {
  sprintId: string;
  sprintName: string;
  committed: number;
  completed: number;
  velocity: number;
}

interface RetroTask {
  id: string;
  title: string;
  completedAt?: string;
  status?: string;
}

interface RetrospectiveData {
  sprint: SprintWithStats;
  burndown: BurndownPoint[];
  velocity: VelocityData[];
  completedTasks: RetroTask[];
  incompleteTasks: RetroTask[];
}

interface SprintBoardProps {
  projectId: string;
  workspaceId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/25";
    case "completed":
      return "bg-sky-500/15 text-sky-400 border-sky-500/25";
    default:
      return "bg-slate-500/15 text-slate-400 border-slate-500/25";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "active":
      return "Active";
    case "completed":
      return "Completed";
    default:
      return "Planned";
  }
}

// ---------------------------------------------------------------------------
// Loading Skeletons
// ---------------------------------------------------------------------------

function ActiveSprintSkeleton() {
  return (
    <Card className="border-slate-700/50 bg-slate-800/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48 bg-slate-700" />
          <Skeleton className="h-6 w-20 bg-slate-700 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-72 bg-slate-700" />
        <Skeleton className="h-3 w-full bg-slate-700 rounded-full" />
        <div className="flex gap-6">
          <Skeleton className="h-4 w-28 bg-slate-700" />
          <Skeleton className="h-4 w-28 bg-slate-700" />
          <Skeleton className="h-4 w-28 bg-slate-700" />
        </div>
      </CardContent>
    </Card>
  );
}

function SprintListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="border-slate-700/50 bg-slate-800/50">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-36 bg-slate-700" />
              <Skeleton className="h-5 w-16 bg-slate-700 rounded-full" />
            </div>
            <Skeleton className="h-3 w-24 bg-slate-700" />
            <Skeleton className="h-2 w-full bg-slate-700 rounded-full" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-20 bg-slate-700" />
              <Skeleton className="h-3 w-12 bg-slate-700" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function BurndownSkeleton() {
  return (
    <Card className="border-slate-700/50 bg-slate-800/50">
      <CardHeader>
        <Skeleton className="h-5 w-40 bg-slate-700" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-48 w-full bg-slate-700 rounded-lg" />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Burndown Chart (pure SVG)
// ---------------------------------------------------------------------------

function BurndownChart({ data }: { data: BurndownPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        No burndown data available
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => Math.max(d.ideal, d.actual)), 1);
  const padding = { top: 20, right: 20, bottom: 32, left: 40 };
  const width = 600;
  const height = 220;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const toX = (i: number) => padding.left + (i / (data.length - 1 || 1)) * chartW;
  const toY = (v: number) => padding.top + chartH - (v / maxVal) * chartH;

  const idealPath = data.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(d.ideal)}`).join(" ");
  const actualPath = data.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(d.actual)}`).join(" ");

  const tickCount = Math.min(data.length, 6);
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const idx = Math.round((i / (tickCount - 1 || 1)) * (data.length - 1));
    return { idx, label: format(parseISO(data[idx].date), "MMM d") };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Sprint burndown chart">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
        <line
          key={frac}
          x1={padding.left}
          y1={toY(frac * maxVal)}
          x2={width - padding.right}
          y2={toY(frac * maxVal)}
          stroke="#334155"
          strokeWidth={0.5}
          strokeDasharray="4 4"
        />
      ))}

      {/* Ideal line */}
      <path d={idealPath} fill="none" stroke="#6366f1" strokeWidth={2} strokeDasharray="6 4" opacity={0.6} />

      {/* Actual line */}
      <path d={actualPath} fill="none" stroke="#a78bfa" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points on actual */}
      {data.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(d.actual)} r={3} fill="#a78bfa" />
      ))}

      {/* X-axis labels */}
      {ticks.map(({ idx, label }) => (
        <text key={idx} x={toX(idx)} y={height - 8} textAnchor="middle" fontSize={10} fill="#94a3b8">
          {label}
        </text>
      ))}

      {/* Y-axis labels */}
      {[0, 0.5, 1].map((frac) => (
        <text
          key={frac}
          x={padding.left - 8}
          y={toY(frac * maxVal) + 3}
          textAnchor="end"
          fontSize={10}
          fill="#94a3b8"
        >
          {Math.round(frac * maxVal)}
        </text>
      ))}

      {/* Legend */}
      <line x1={width - 180} y1={12} x2={width - 156} y2={12} stroke="#6366f1" strokeWidth={2} strokeDasharray="6 4" opacity={0.6} />
      <text x={width - 152} y={15} fontSize={10} fill="#94a3b8">Ideal</text>
      <line x1={width - 110} y1={12} x2={width - 86} y2={12} stroke="#a78bfa" strokeWidth={2.5} />
      <text x={width - 82} y={15} fontSize={10} fill="#94a3b8">Actual</text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Velocity Display
// ---------------------------------------------------------------------------

function VelocityDisplay({ data, currentVelocity }: { data: VelocityData[]; currentVelocity?: number }) {
  const avgVelocity = useMemo(() => {
    if (data.length === 0) return 0;
    return Math.round(data.reduce((s, d) => s + d.velocity, 0) / data.length);
  }, [data]);

  return (
    <Card className="border-slate-700/50 bg-slate-800/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-300">
          <TrendingUp className="h-4 w-4 text-indigo-400" />
          Velocity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold text-slate-100">{currentVelocity ?? avgVelocity}%</span>
          <span className="text-xs text-slate-500 mb-1">avg completion rate</span>
        </div>
        {data.length > 0 && (
          <div className="space-y-2">
            {data.slice(0, 5).map((d) => (
              <div key={d.sprintId} className="flex items-center gap-2">
                <span className="text-xs text-slate-400 truncate w-28" title={d.sprintName}>
                  {d.sprintName}
                </span>
                <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${Math.min(d.velocity, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500 w-8 text-right">{d.velocity}%</span>
              </div>
            ))}
          </div>
        )}
        {data.length === 0 && (
          <p className="text-xs text-slate-500">Complete sprints to see velocity data</p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sprint Task Board (todo / in_progress / completed)
// ---------------------------------------------------------------------------

interface SprintTask {
  id: string;
  title: string;
  status: string;
  estimatedHours?: number | null;
  timeSpent?: number | null;
}

function SprintTasksPanel({
  sprintId,
  sprintStatus,
}: {
  sprintId: string;
  sprintStatus: string;
}) {
  const [tasks, setTasks] = useState<SprintTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSprintTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/sprints/${sprintId}`);
      if (!res.ok) throw new Error("Failed to fetch sprint");
      const data = await res.json();
      // The sprint detail endpoint includes tasks through the service
      setTasks(data.tasks ?? []);
    } catch {
      toast.error("Failed to load sprint tasks");
    } finally {
      setLoading(false);
    }
  }, [sprintId]);

  useEffect(() => {
    fetchSprintTasks();
  }, [fetchSprintTasks]);

  const grouped = useMemo(() => {
    const groups: Record<string, SprintTask[]> = {
      todo: [],
      in_progress: [],
      completed: [],
    };
    for (const t of tasks) {
      const key = t.status === "completed" ? "completed" : t.status === "in_progress" ? "in_progress" : "todo";
      groups[key].push(t);
    }
    return groups;
  }, [tasks]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full bg-slate-700 rounded-lg" />
        ))}
      </div>
    );
  }

  const columns: { key: string; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "todo", label: "To Do", icon: <ListTodo className="h-4 w-4" />, color: "text-slate-400" },
    { key: "in_progress", label: "In Progress", icon: <Loader2 className="h-4 w-4" />, color: "text-amber-400" },
    { key: "completed", label: "Completed", icon: <CheckCircle2 className="h-4 w-4" />, color: "text-emerald-400" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {columns.map((col) => (
        <div key={col.key} className="space-y-2">
          <div className={cn("flex items-center gap-2 text-sm font-medium", col.color)}>
            {col.icon}
            {col.label}
            <Badge variant="outline" className="ml-auto text-xs border-slate-600 text-slate-400">
              {grouped[col.key].length}
            </Badge>
          </div>
          <div className="space-y-1.5">
            {grouped[col.key].length === 0 && (
              <p className="text-xs text-slate-600 py-4 text-center">No tasks</p>
            )}
            {grouped[col.key].map((task) => (
              <div
                key={task.id}
                className="p-2.5 rounded-lg bg-slate-700/40 border border-slate-700/50 hover:border-slate-600/50 transition-colors"
              >
                <p className="text-sm text-slate-200 leading-snug">{task.title}</p>
                {(task.estimatedHours != null || task.timeSpent != null) && (
                  <div className="flex gap-3 mt-1.5">
                    {task.estimatedHours != null && (
                      <span className="text-[10px] text-slate-500">{task.estimatedHours}h est</span>
                    )}
                    {task.timeSpent != null && (
                      <span className="text-[10px] text-slate-500">{Math.round(task.timeSpent / 3600)}h spent</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Retrospective View
// ---------------------------------------------------------------------------

function RetrospectiveView({ data }: { data: RetrospectiveData }) {
  const { sprint, completedTasks, incompleteTasks, velocity } = data;

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-slate-700/30 p-4 border border-slate-700/50">
          <p className="text-xs text-slate-500 mb-1">Completion Rate</p>
          <p className="text-2xl font-bold text-slate-100">{sprint.completionRate}%</p>
          <Progress value={sprint.completionRate} className="mt-2 h-1.5 bg-slate-700" />
        </div>
        <div className="rounded-lg bg-slate-700/30 p-4 border border-slate-700/50">
          <p className="text-xs text-slate-500 mb-1">Tasks Completed</p>
          <p className="text-2xl font-bold text-emerald-400">{sprint.completedTasks}</p>
          <p className="text-xs text-slate-500 mt-1">of {sprint.totalTasks} total</p>
        </div>
        <div className="rounded-lg bg-slate-700/30 p-4 border border-slate-700/50">
          <p className="text-xs text-slate-500 mb-1">Hours Tracked</p>
          <p className="text-2xl font-bold text-slate-100">{sprint.actualHours.toFixed(1)}h</p>
          <p className="text-xs text-slate-500 mt-1">of {sprint.estimatedHours}h estimated</p>
        </div>
      </div>

      {/* Burndown */}
      {data.burndown.length > 0 && (
        <Card className="border-slate-700/50 bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Burndown</CardTitle>
          </CardHeader>
          <CardContent>
            <BurndownChart data={data.burndown} />
          </CardContent>
        </Card>
      )}

      {/* Velocity trend */}
      {velocity.length > 0 && <VelocityDisplay data={velocity} currentVelocity={sprint.completionRate} />}

      {/* Completed tasks */}
      {completedTasks.length > 0 && (
        <Card className="border-slate-700/50 bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Completed ({completedTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-48">
              <ul className="space-y-1.5">
                {completedTasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between text-sm py-1">
                    <span className="text-slate-300">{t.title}</span>
                    {t.completedAt && (
                      <span className="text-xs text-slate-500">
                        {format(parseISO(t.completedAt), "MMM d")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Incomplete tasks */}
      {incompleteTasks.length > 0 && (
        <Card className="border-slate-700/50 bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-amber-400">
              <AlertCircle className="h-4 w-4" />
              Carried Over ({incompleteTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {incompleteTasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between text-sm py-1">
                  <span className="text-slate-300">{t.title}</span>
                  <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">
                    {t.status === "in_progress" ? "In Progress" : "To Do"}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Sprint Dialog
// ---------------------------------------------------------------------------

function CreateSprintDialog({
  open,
  onOpenChange,
  projectId,
  workspaceId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  workspaceId: string;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [goal, setGoal] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setStartDate("");
    setEndDate("");
    setGoal("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/sprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          projectId,
          workspaceId,
          startDate,
          endDate,
          goal: goal.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create sprint");
      }

      toast.success("Sprint created");
      reset();
      onOpenChange(false);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create sprint");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Sprint</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sprint-name">Name</Label>
            <Input
              id="sprint-name"
              placeholder="Sprint 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sprint-start">Start Date</Label>
              <Input
                id="sprint-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-900 border-slate-700 text-slate-100"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sprint-end">End Date</Label>
              <Input
                id="sprint-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-900 border-slate-700 text-slate-100"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sprint-goal">Goal (optional)</Label>
            <Textarea
              id="sprint-goal"
              placeholder="What should this sprint accomplish?"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={2}
              className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500 resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !name.trim() || !startDate || !endDate}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Sprint
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Active Sprint Banner
// ---------------------------------------------------------------------------

function ActiveSprintBanner({
  sprint,
  workspaceId,
  onStart,
  onComplete,
  loading,
}: {
  sprint: SprintWithStats | null;
  workspaceId: string;
  onStart: (id: string) => void;
  onComplete: (id: string) => void;
  loading: boolean;
}) {
  if (loading) return <ActiveSprintSkeleton />;
  if (!sprint) return null;

  const durationDays = differenceInDays(parseISO(sprint.endDate), parseISO(sprint.startDate));
  const elapsedDays = Math.max(0, durationDays - sprint.daysRemaining);
  const progressPct = durationDays > 0 ? Math.round((elapsedDays / durationDays) * 100) : 0;

  return (
    <Card className="border-indigo-500/25 bg-gradient-to-br from-indigo-950/40 to-slate-800/60">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20">
              <Play className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-100">
                {sprint.name}
              </CardTitle>
              <p className="text-xs text-slate-400">
                {format(parseISO(sprint.startDate), "MMM d")} – {format(parseISO(sprint.endDate), "MMM d, yyyy")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs border", statusColor("active"))}>
              Active
            </Badge>
            <AIInlineButton
              workspaceId={workspaceId}
              context={`Sprint: ${sprint.name}, Goal: ${sprint.goal || "none"}, Tasks: ${sprint.completedTasks}/${sprint.totalTasks} done, ${sprint.inProgressTasks} in progress, ${sprint.daysRemaining} days remaining, ${sprint.completionRate}% complete`}
              type="summary"
              onResult={(text) => {
                toast.success("AI Summary", { description: text });
              }}
              size="sm"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-200">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                <DropdownMenuItem
                  onClick={() => onComplete(sprint.id)}
                  className="text-slate-300 focus:bg-slate-700 focus:text-slate-100"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-400" />
                  Complete Sprint
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sprint.goal && (
          <div className="flex items-start gap-2 text-sm">
            <Target className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
            <span className="text-slate-300">{sprint.goal}</span>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{elapsedDays} of {durationDays} days elapsed</span>
            <span>{sprint.daysRemaining}d remaining</span>
          </div>
          <Progress value={progressPct} className="h-2 bg-slate-700" />
        </div>

        <div className="grid grid-cols-3 gap-4 pt-1">
          <div className="text-center">
            <p className="text-lg font-semibold text-slate-100">{sprint.totalTasks}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Total</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-emerald-400">{sprint.completedTasks}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Done</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-amber-400">{sprint.inProgressTasks}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">In Progress</p>
          </div>
        </div>

        {sprint.totalTasks > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Sprint Progress</span>
              <span className="text-slate-300 font-medium">{sprint.completionRate}%</span>
            </div>
            <Progress value={sprint.completionRate} className="h-1.5 bg-slate-700" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sprint Card (for list view)
// ---------------------------------------------------------------------------

function SprintCard({
  sprint,
  isActive,
  onStart,
  onComplete,
  onSelect,
  selectedId,
}: {
  sprint: SprintWithStats;
  isActive: boolean;
  onStart: (id: string) => void;
  onComplete: (id: string) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  const isSelected = selectedId === sprint.id;

  return (
    <Card
      className={cn(
        "border-slate-700/50 bg-slate-800/50 hover:border-slate-600/60 transition-all cursor-pointer",
        isActive && "border-indigo-500/25",
        isSelected && "ring-1 ring-indigo-500/40 border-indigo-500/30"
      )}
      onClick={() => onSelect(sprint.id)}
    >
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5 min-w-0">
            <h3 className="text-sm font-semibold text-slate-100 truncate">{sprint.name}</h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="h-3 w-3" />
              {format(parseISO(sprint.startDate), "MMM d")} – {format(parseISO(sprint.endDate), "MMM d")}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge className={cn("text-[10px] border", statusColor(sprint.status))}>
              {statusLabel(sprint.status)}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-slate-300">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                {sprint.status === "planned" && (
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); onStart(sprint.id); }}
                    className="text-slate-300 focus:bg-slate-700 focus:text-slate-100"
                  >
                    <Play className="mr-2 h-4 w-4 text-indigo-400" />
                    Start Sprint
                  </DropdownMenuItem>
                )}
                {sprint.status === "active" && (
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); onComplete(sprint.id); }}
                    className="text-slate-300 focus:bg-slate-700 focus:text-slate-100"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-400" />
                    Complete Sprint
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {sprint.goal && (
          <p className="text-xs text-slate-500 line-clamp-1">{sprint.goal}</p>
        )}

        <Progress value={sprint.completionRate} className="h-1.5 bg-slate-700" />

        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span>
            {sprint.completedTasks}/{sprint.totalTasks} tasks
          </span>
          <span>{sprint.completionRate}%</span>
        </div>

        {sprint.status === "active" && (
          <div className="flex items-center gap-1 text-[10px] text-amber-400">
            <Clock className="h-3 w-3" />
            {sprint.daysRemaining}d remaining
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function SprintBoard({ projectId, workspaceId }: SprintBoardProps) {
  const { activeWorkspace } = useWorkspace();

  const [sprints, setSprints] = useState<SprintWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [aiPlanOpen, setAiPlanOpen] = useState(false);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [burndownData, setBurndownData] = useState<BurndownPoint[]>([]);
  const [burndownLoading, setBurndownLoading] = useState(false);
  const [velocityData, setVelocityData] = useState<VelocityData[]>([]);

  const [retroData, setRetroData] = useState<RetrospectiveData | null>(null);
  const [retroLoading, setRetroLoading] = useState(false);

  const activeSprint = useMemo(() => sprints.find((s) => s.status === "active") ?? null, [sprints]);

  const effectiveWorkspaceId = workspaceId ?? activeWorkspace?.id;

  // --- Fetch sprints ---
  const fetchSprints = useCallback(async () => {
    if (!effectiveWorkspaceId || !projectId) return;
    try {
      setLoading(true);
      const res = await fetch(
        `/api/sprints?workspaceId=${encodeURIComponent(effectiveWorkspaceId)}&projectId=${encodeURIComponent(projectId)}`
      );
      if (!res.ok) throw new Error("Failed to fetch sprints");
      const data: SprintWithStats[] = await res.json();
      setSprints(data);
    } catch {
      toast.error("Failed to load sprints");
    } finally {
      setLoading(false);
    }
  }, [effectiveWorkspaceId, projectId]);

  useEffect(() => {
    fetchSprints();
  }, [fetchSprints]);

  // --- Fetch burndown for selected sprint ---
  useEffect(() => {
    if (!selectedSprintId) {
      setBurndownData([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setBurndownLoading(true);
        const res = await fetch(`/api/sprints/${selectedSprintId}/burndown`);
        if (!res.ok) throw new Error("Failed to fetch burndown");
        const data: BurndownPoint[] = await res.json();
        if (!cancelled) setBurndownData(data);
      } catch {
        if (!cancelled) toast.error("Failed to load burndown");
      } finally {
        if (!cancelled) setBurndownLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedSprintId]);

  // --- Fetch velocity for project ---
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/sprints?workspaceId=${effectiveWorkspaceId}&projectId=${projectId}`);
        if (!res.ok) return;
        const data: SprintWithStats[] = await res.json();
        const completed = data.filter((s) => s.status === "completed");
        if (completed.length > 0 && !cancelled) {
          setVelocityData(
            completed.map((s) => ({
              sprintId: s.id,
              sprintName: s.name,
              committed: s.totalTasks,
              completed: s.completedTasks,
              velocity: s.completionRate,
            }))
          );
        }
      } catch {
        // silent
      }
    })();
    return () => { cancelled = true; };
  }, [projectId, effectiveWorkspaceId, sprints]);

  // --- Fetch retrospective ---
  useEffect(() => {
    if (!selectedSprintId) {
      setRetroData(null);
      return;
    }
    const sprint = sprints.find((s) => s.id === selectedSprintId);
    if (!sprint || sprint.status !== "completed") {
      setRetroData(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setRetroLoading(true);
        const res = await fetch(`/api/sprints/${selectedSprintId}/retrospective`);
        if (!res.ok) throw new Error("Failed to fetch retrospective");
        const data: RetrospectiveData = await res.json();
        if (!cancelled) setRetroData(data);
      } catch {
        if (!cancelled) toast.error("Failed to load retrospective");
      } finally {
        if (!cancelled) setRetroLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedSprintId, sprints]);

  // --- Actions ---
  const handleStart = useCallback(
    async (id: string) => {
      try {
        setActionLoading(id);
        const res = await fetch(`/api/sprints/${id}/start`, { method: "POST" });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to start sprint");
        }
        toast.success("Sprint started");
        await fetchSprints();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to start sprint");
      } finally {
        setActionLoading(null);
      }
    },
    [fetchSprints]
  );

  const handleComplete = useCallback(
    async (id: string) => {
      try {
        setActionLoading(id);
        const res = await fetch(`/api/sprints/${id}/complete`, { method: "POST" });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to complete sprint");
        }
        toast.success("Sprint completed");
        await fetchSprints();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to complete sprint");
      } finally {
        setActionLoading(null);
      }
    },
    [fetchSprints]
  );

  const selectedSprint = useMemo(
    () => sprints.find((s) => s.id === selectedSprintId) ?? null,
    [sprints, selectedSprintId]
  );

  const selectedIsCompleted = selectedSprint?.status === "completed";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Sprints</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage time-boxed iterations for your project
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => setAiPlanOpen(true)}
            variant="outline"
            className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            AI Plan
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Sprint
          </Button>
        </div>
      </div>

      {/* Active Sprint Banner */}
      <ActiveSprintBanner
        sprint={activeSprint}
        workspaceId={effectiveWorkspaceId ?? ""}
        onStart={handleStart}
        onComplete={handleComplete}
        loading={loading}
      />

      {/* Main content */}
      <Tabs defaultValue="sprints" className="space-y-4">
        <TabsList className="bg-slate-800/80 border border-slate-700/50">
          <TabsTrigger value="sprints" className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100">
            <ListTodo className="mr-1.5 h-3.5 w-3.5" />
            Sprints
          </TabsTrigger>
          <TabsTrigger value="board" className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100">
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
            Board
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100">
            <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Sprint List */}
        <TabsContent value="sprints" className="space-y-4">
          {loading ? (
            <SprintListSkeleton />
          ) : sprints.length === 0 ? (
            <Card className="border-slate-700/50 bg-slate-800/50">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-700/50 mb-4">
                  <Calendar className="h-6 w-6 text-slate-500" />
                </div>
                <h3 className="text-sm font-medium text-slate-300 mb-1">No sprints yet</h3>
                <p className="text-xs text-slate-500 max-w-xs">
                  Create your first sprint to start planning time-boxed iterations for this project.
                </p>
                <Button
                  onClick={() => setCreateOpen(true)}
                  className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white"
                  size="sm"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  New Sprint
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sprints.map((sprint) => (
                <SprintCard
                  key={sprint.id}
                  sprint={sprint}
                  isActive={sprint.status === "active"}
                  onStart={handleStart}
                  onComplete={handleComplete}
                  onSelect={setSelectedSprintId}
                  selectedId={selectedSprintId}
                />
              ))}
            </div>
          )}

          {/* Sprint detail panel */}
          {selectedSprint && (
            <Card className="border-slate-700/50 bg-slate-800/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-200">
                    {selectedSprint.name} — Tasks
                  </CardTitle>
                  <Badge className={cn("text-[10px] border", statusColor(selectedSprint.status))}>
                    {statusLabel(selectedSprint.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <SprintTasksPanel
                  sprintId={selectedSprint.id}
                  sprintStatus={selectedSprint.status}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Board tab — same as sprint detail but persistent */}
        <TabsContent value="board" className="space-y-4">
          {selectedSprint ? (
            <Card className="border-slate-700/50 bg-slate-800/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-200">
                  {selectedSprint.name} — Task Board
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SprintTasksPanel
                  sprintId={selectedSprint.id}
                  sprintStatus={selectedSprint.status}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-700/50 bg-slate-800/50">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <BarChart3 className="h-8 w-8 text-slate-600 mb-3" />
                <p className="text-sm text-slate-500">
                  Select a sprint from the Sprints tab to view its task board
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analytics tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Burndown */}
            {selectedSprint ? (
              burndownLoading ? (
                <BurndownSkeleton />
              ) : (
                <Card className="border-slate-700/50 bg-slate-800/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-slate-300">
                        Burndown — {selectedSprint.name}
                      </CardTitle>
                      <Select
                        value={selectedSprintId ?? ""}
                        onValueChange={(val) => setSelectedSprintId(val || null)}
                      >
                        <SelectTrigger className="w-[160px] h-8 bg-slate-900 border-slate-700 text-xs">
                          <SelectValue placeholder="Select sprint" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {sprints.map((s) => (
                            <SelectItem key={s.id} value={s.id} className="text-xs text-slate-300">
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <BurndownChart data={burndownData} />
                  </CardContent>
                </Card>
              )
            ) : (
              <Card className="border-slate-700/50 bg-slate-800/50">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <BarChart3 className="h-8 w-8 text-slate-600 mb-3" />
                  <p className="text-sm text-slate-500">Select a sprint to view its burndown chart</p>
                </CardContent>
              </Card>
            )}

            {/* Velocity */}
            <VelocityDisplay data={velocityData} currentVelocity={activeSprint?.completionRate} />
          </div>

          {/* Retrospective */}
          {selectedIsCompleted && (
            <>
              <Separator className="bg-slate-700/50" />
              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-4">
                  Retrospective — {selectedSprint?.name}
                </h3>
                {retroLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full bg-slate-700 rounded-lg" />
                    ))}
                  </div>
                ) : retroData ? (
                  <RetrospectiveView data={retroData} />
                ) : (
                  <Card className="border-slate-700/50 bg-slate-800/50">
                    <CardContent className="py-8 text-center">
                      <p className="text-sm text-slate-500">No retrospective data available</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Sprint Dialog */}
      <CreateSprintDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        workspaceId={effectiveWorkspaceId ?? ""}
        onCreated={fetchSprints}
      />

      {/* AI Sprint Planning Dialog */}
      <AISprintPlanDialog
        open={aiPlanOpen}
        onOpenChange={setAiPlanOpen}
        projectId={projectId}
        workspaceId={effectiveWorkspaceId ?? ""}
      />
    </div>
  );
}
