"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Loader2, Sparkles, AlertTriangle, CheckCircle2, Clock, Zap } from "lucide-react";
import { toast } from "sonner";

interface SprintPlanTask {
  taskId: string;
  title: string;
  assigneeId?: string;
  estimatedHours: number | null;
  priority: string;
  reason: string;
}

interface SprintPlan {
  tasks: SprintPlanTask[];
  totalHours: number;
  capacityUtilization: number;
  predictedVelocity: number;
  riskLevel: "low" | "medium" | "high";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  workspaceId: string;
  onPlanGenerated?: (plan: SprintPlan) => void;
}

const RISK_COLORS = {
  low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  high: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export function AISprintPlanDialog({ open, onOpenChange, projectId, workspaceId, onPlanGenerated }: Props) {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<SprintPlan | null>(null);
  const [duration, setDuration] = useState(14);

  const generatePlan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sprints/ai-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, projectId, sprintDurationDays: duration }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate plan");
      }

      const result: SprintPlan = await res.json();
      setPlan(result);
      toast.success(`Generated plan with ${result.tasks.length} tasks`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, projectId, duration]);

  const handleApply = () => {
    if (plan) {
      onPlanGenerated?.(plan);
      onOpenChange(false);
      setPlan(null);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setPlan(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 sm:max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            AI Sprint Planning
          </DialogTitle>
        </DialogHeader>

        {!plan ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Nova will analyze your backlog, team velocity, and capacity to generate an optimal sprint plan.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Sprint Duration (days)</label>
              <div className="flex gap-2">
                {[7, 14, 21].map((d) => (
                  <Button
                    key={d}
                    variant={duration === d ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDuration(d)}
                    className={duration === d ? "bg-indigo-600 hover:bg-indigo-500" : "border-slate-600 text-slate-300"}
                  >
                    {d} days
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-900/50 p-3 border border-slate-700/50">
                  <div className="text-xs text-slate-500 mb-1">Tasks Selected</div>
                  <div className="text-lg font-bold text-slate-100">{plan.tasks.length}</div>
                </div>
                <div className="rounded-lg bg-slate-900/50 p-3 border border-slate-700/50">
                  <div className="text-xs text-slate-500 mb-1">Total Hours</div>
                  <div className="text-lg font-bold text-slate-100">{plan.totalHours}h</div>
                </div>
                <div className="rounded-lg bg-slate-900/50 p-3 border border-slate-700/50">
                  <div className="text-xs text-slate-500 mb-1">Capacity</div>
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-bold text-slate-100">{plan.capacityUtilization}%</div>
                    <Progress value={plan.capacityUtilization} className="h-1.5 flex-1 bg-slate-700" />
                  </div>
                </div>
                <div className="rounded-lg bg-slate-900/50 p-3 border border-slate-700/50">
                  <div className="text-xs text-slate-500 mb-1">Risk Level</div>
                  <Badge className={`text-xs border ${RISK_COLORS[plan.riskLevel]}`}>
                    {plan.riskLevel === "low" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                    {plan.riskLevel === "medium" && <Clock className="mr-1 h-3 w-3" />}
                    {plan.riskLevel === "high" && <AlertTriangle className="mr-1 h-3 w-3" />}
                    {plan.riskLevel}
                  </Badge>
                </div>
              </div>

              <Separator className="bg-slate-700/50" />

              {/* Task list */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Selected Tasks</h4>
                {plan.tasks.map((task, i) => (
                  <div
                    key={task.taskId}
                    className="flex items-start gap-3 rounded-lg bg-slate-900/30 p-3 border border-slate-700/30"
                  >
                    <span className="text-xs text-slate-600 font-mono mt-0.5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-200 truncate">{task.title}</span>
                        <Badge className={`text-[10px] border ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium}`}>
                          {task.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{task.reason}</p>
                      {task.estimatedHours && (
                        <span className="text-[10px] text-slate-600 mt-1 inline-block">
                          <Clock className="inline h-2.5 w-2.5 mr-0.5" />{task.estimatedHours}h
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} className="text-slate-400 hover:text-slate-200">
            {plan ? "Discard" : "Cancel"}
          </Button>
          {!plan ? (
            <Button onClick={generatePlan} disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {loading ? "Analyzing backlog..." : "Generate Plan"}
            </Button>
          ) : (
            <Button onClick={handleApply} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              <Zap className="mr-2 h-4 w-4" />
              Use This Plan
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
