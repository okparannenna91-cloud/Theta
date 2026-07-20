"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Calendar,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  Trash2,
  Pencil,
  CircleDot,
  Link as LinkIcon,
  X,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface KeyResult {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string | null;
  progress: number;
  taskCount: number;
  completedTaskCount: number;
}

interface Goal {
  id: string;
  title: string;
  description: string | null;
  type: string;
  ownerId: string;
  ownerName: string | null;
  projectId: string | null;
  projectName: string | null;
  startDate: string;
  endDate: string;
  status: string;
  progress: number;
  keyResults: KeyResult[];
  daysRemaining: number;
}

interface DashboardData {
  goals: Goal[];
  totalGoals: number;
  averageProgress: number;
  atRiskCount: number;
  completedCount: number;
  activeCount: number;
  byType: { type: string; count: number; averageProgress: number }[];
}

interface WorkspaceMember {
  id: string;
  name: string | null;
  email: string;
  imageUrl: string | null;
  role: string;
}

interface WorkspaceProject {
  id: string;
  name: string;
}

interface GoalDashboardProps {
  workspaceId: string;
}

type GoalType = "okr" | "milestone" | "target";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysRemainingColor(days: number): string {
  if (days < 0) return "text-red-400";
  if (days < 7) return "text-red-400";
  if (days <= 14) return "text-yellow-400";
  return "text-emerald-400";
}

function daysRemainingLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  return `${days}d left`;
}

function typeBadgeStyle(type: string): string {
  switch (type) {
    case "okr":
      return "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
    case "milestone":
      return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    case "target":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    default:
      return "bg-slate-500/20 text-slate-300 border-slate-500/30";
  }
}

function statusBadgeStyle(status: string): string {
  switch (status) {
    case "active":
      return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    case "completed":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    case "cancelled":
      return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    default:
      return "bg-slate-500/20 text-slate-300 border-slate-500/30";
  }
}

function progressColorClass(pct: number): string {
  if (pct >= 75) return "bg-emerald-500";
  if (pct >= 40) return "bg-indigo-500";
  if (pct >= 20) return "bg-amber-500";
  return "bg-red-500";
}

// ─── Skeleton Loaders ──────────────────────────────────────────────────────

function SummaryCardSkeleton() {
  return (
    <Card className="bg-slate-800/50 border-slate-700/50">
      <CardContent className="p-6">
        <Skeleton variant="text" width={120} height={16} className="mb-3" />
        <Skeleton variant="text" width={80} height={32} />
      </CardContent>
    </Card>
  );
}

function GoalCardSkeleton() {
  return (
    <Card className="bg-slate-800/50 border-slate-700/50">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <Skeleton variant="text" width={200} height={20} className="mb-2" />
            <Skeleton variant="text" width={120} height={14} />
          </div>
          <Skeleton variant="text" width={60} height={24} />
        </div>
        <Skeleton variant="text" width={200} height={8} className="mb-3" />
        <div className="flex gap-2">
          <Skeleton variant="text" width={80} height={14} />
          <Skeleton variant="text" width={60} height={14} />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  icon: Icon,
  accent,
  sub,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  accent: string;
  sub?: string;
}) {
  return (
    <Card className="bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-400">{label}</span>
          <div className={`p-2 rounded-lg ${accent}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-white">{value}</div>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function KeyResultRow({
  kr,
  goalId,
  onUpdateValue,
}: {
  kr: KeyResult;
  goalId: string;
  onUpdateValue: (goalId: string, krId: string, value: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(kr.currentValue.toString());

  const handleSave = () => {
    const num = parseFloat(inputValue);
    if (!isNaN(num) && num >= 0) {
      onUpdateValue(goalId, kr.id, num);
    }
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-3 py-2 group/kr">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-300 truncate">{kr.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${progressColorClass(kr.progress)}`}
              style={{ width: `${Math.min(kr.progress, 100)}%` }}
            />
          </div>
          <span className="text-xs text-slate-500 w-10 text-right">
            {kr.progress}%
          </span>
        </div>
      </div>
      {editing ? (
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") setEditing(false);
            }}
            className="h-7 w-20 text-xs bg-slate-700 border-slate-600 text-white"
            autoFocus
            min={0}
          />
          {kr.unit && (
            <span className="text-xs text-slate-500">{kr.unit}</span>
          )}
        </div>
      ) : (
        <button
          onClick={() => {
            setInputValue(kr.currentValue.toString());
            setEditing(true);
          }}
          className="text-xs text-slate-400 hover:text-white cursor-pointer opacity-0 group-hover/kr:opacity-100 transition-opacity"
        >
          {kr.currentValue}
          {kr.unit ? `/${kr.targetValue} ${kr.unit}` : `/${kr.targetValue}`}
        </button>
      )}
      {kr.taskCount > 0 && (
        <Tooltip content={`${kr.completedTaskCount}/${kr.taskCount} tasks`}>
          <TooltipTrigger>
            <LinkIcon className="h-3 w-3 text-slate-500" />
          </TooltipTrigger>
        </Tooltip>
      )}
    </div>
  );
}

function GoalCard({
  goal,
  onEdit,
  onComplete,
  onCancel,
  onDelete,
  onUpdateValue,
  onAddKeyResult,
}: {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onComplete: (goalId: string) => void;
  onCancel: (goalId: string) => void;
  onDelete: (goalId: string) => void;
  onUpdateValue: (goalId: string, krId: string, value: number) => void;
  onAddKeyResult: (goalId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="bg-slate-800/50 border-slate-700/50 hover:border-slate-600/60 transition-all">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-sm font-semibold text-white truncate">
                {goal.title}
              </h3>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${typeBadgeStyle(goal.type)}`}
              >
                {goal.type}
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${statusBadgeStyle(goal.status)}`}
              >
                {goal.status}
              </span>
            </div>
            {goal.ownerName && (
              <p className="text-xs text-slate-500">
                Owned by {goal.ownerName}
                {goal.projectName && ` · ${goal.projectName}`}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-white"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-slate-800 border-slate-700"
            >
              <DropdownMenuItem
                onClick={() => onEdit(goal)}
                className="text-slate-300 hover:text-white hover:bg-slate-700/50 cursor-pointer"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {goal.status === "active" && (
                <DropdownMenuItem
                  onClick={() => onComplete(goal.id)}
                  className="text-emerald-400 hover:text-emerald-300 hover:bg-slate-700/50 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete
                </DropdownMenuItem>
              )}
              {goal.status === "active" && (
                <DropdownMenuItem
                  onClick={() => onCancel(goal.id)}
                  className="text-amber-400 hover:text-amber-300 hover:bg-slate-700/50 cursor-pointer"
                >
                  <CircleDot className="h-4 w-4 mr-2" />
                  Cancel
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onDelete(goal.id)}
                className="text-red-400 hover:text-red-300 hover:bg-slate-700/50 cursor-pointer"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-400">Progress</span>
            <span className="text-xs font-medium text-white">
              {goal.progress}%
            </span>
          </div>
          <Progress value={goal.progress} className="h-2 bg-slate-700" barClassName={progressColorClass(goal.progress)} />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            <span>
              {formatDate(goal.startDate)} – {formatDate(goal.endDate)}
            </span>
          </div>
          <span className={daysRemainingColor(goal.daysRemaining)}>
            {daysRemainingLabel(goal.daysRemaining)}
          </span>
        </div>

        {goal.keyResults.length > 0 && (
          <div className="border-t border-slate-700/50 pt-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors mb-1"
            >
              {expanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              Key Results ({goal.keyResults.length})
            </button>
            {expanded && (
              <div className="mt-2 space-y-1">
                {goal.keyResults.map((kr) => (
                  <KeyResultRow
                    key={kr.id}
                    kr={kr}
                    goalId={goal.id}
                    onUpdateValue={onUpdateValue}
                  />
                ))}
              </div>
            )}
            {!expanded && (
              <div className="flex gap-1.5 mt-2">
                {goal.keyResults.slice(0, 3).map((kr) => (
                  <div
                    key={kr.id}
                    className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden"
                  >
                    <div
                      className={`h-full rounded-full ${progressColorClass(kr.progress)}`}
                      style={{ width: `${Math.min(kr.progress, 100)}%` }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {goal.keyResults.length === 0 && (
          <div className="border-t border-slate-700/50 pt-3">
            <button
              onClick={() => onAddKeyResult(goal.id)}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              Add Key Result
            </button>
          </div>
        )}

        {goal.keyResults.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => onAddKeyResult(goal.id)}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              Add Key Result
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreateGoalDialog({
  open,
  onOpenChange,
  workspaceId,
  members,
  projects,
  onCreateGoal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  members: WorkspaceMember[];
  projects: WorkspaceProject[];
  onCreateGoal: (data: {
    title: string;
    description: string;
    type: GoalType;
    ownerId: string;
    projectId?: string;
    startDate: string;
    endDate: string;
  }) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<GoalType>("okr");
  const [ownerId, setOwnerId] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setType("okr");
      setOwnerId("");
      setProjectId("");
      setStartDate("");
      setEndDate("");
    }
  }, [open]);

  const canSubmit =
    title.trim() && ownerId && startDate && endDate && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      onCreateGoal({
        title: title.trim(),
        description: description.trim(),
        type,
        ownerId,
        projectId: projectId || undefined,
        startDate,
        endDate,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Create Goal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label className="text-slate-300">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Increase MRR to $50k"
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional goal description..."
              rows={3}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as GoalType)}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="okr" className="text-white focus:bg-slate-700 focus:text-white">
                  OKR
                </SelectItem>
                <SelectItem value="milestone" className="text-white focus:bg-slate-700 focus:text-white">
                  Milestone
                </SelectItem>
                <SelectItem value="target" className="text-white focus:bg-slate-700 focus:text-white">
                  Target
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Owner</Label>
            <Select
              value={ownerId}
              onValueChange={setOwnerId}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-white focus:bg-slate-700 focus:text-white">
                    {m.name || m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {projects.length > 0 && (
            <div className="space-y-2">
              <Label className="text-slate-300">Project (optional)</Label>
              <Select
                value={projectId}
                onValueChange={setProjectId}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="none" className="text-white focus:bg-slate-700 focus:text-white">
                    None
                  </SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-white focus:bg-slate-700 focus:text-white">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Create Goal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditGoalDialog({
  open,
  onOpenChange,
  goal,
  members,
  projects,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal | null;
  members: WorkspaceMember[];
  projects: WorkspaceProject[];
  onSave: (goalId: string, data: {
    title: string;
    description: string;
    type: GoalType;
    projectId?: string;
    startDate: string;
    endDate: string;
  }) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<GoalType>("okr");
  const [projectId, setProjectId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (goal) {
      setTitle(goal.title);
      setDescription(goal.description || "");
      setType(goal.type as GoalType);
      setProjectId(goal.projectId || "");
      setStartDate(goal.startDate.slice(0, 10));
      setEndDate(goal.endDate.slice(0, 10));
    }
  }, [goal]);

  if (!goal) return null;

  const canSubmit = title.trim() && startDate && endDate && !submitting;

  const handleSave = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      onSave(goal.id, {
        title: title.trim(),
        description: description.trim(),
        type,
        projectId: projectId || undefined,
        startDate,
        endDate,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Goal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label className="text-slate-300">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="bg-slate-700 border-slate-600 text-white resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as GoalType)}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="okr" className="text-white focus:bg-slate-700 focus:text-white">
                  OKR
                </SelectItem>
                <SelectItem value="milestone" className="text-white focus:bg-slate-700 focus:text-white">
                  Milestone
                </SelectItem>
                <SelectItem value="target" className="text-white focus:bg-slate-700 focus:text-white">
                  Target
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {projects.length > 0 && (
            <div className="space-y-2">
              <Label className="text-slate-300">Project (optional)</Label>
              <Select
                value={projectId}
                onValueChange={setProjectId}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="none" className="text-white focus:bg-slate-700 focus:text-white">
                    None
                  </SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-white focus:bg-slate-700 focus:text-white">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!canSubmit}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddKeyResultDialog({
  open,
  onOpenChange,
  goalId,
  onCreateKR,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  onCreateKR: (goalId: string, data: { title: string; targetValue: number; unit: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setTargetValue("");
      setUnit("");
    }
  }, [open]);

  const canSubmit = title.trim() && targetValue && parseFloat(targetValue) >= 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      onCreateKR(goalId, {
        title: title.trim(),
        targetValue: parseFloat(targetValue),
        unit: unit.trim(),
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Add Key Result</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label className="text-slate-300">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Acquire 200 new customers"
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Target Value</Label>
              <Input
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="0"
                min={0}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Unit (optional)</Label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="%, count, hrs..."
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Add Key Result
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function GoalDashboard({ workspaceId }: GoalDashboardProps) {
  const { activeWorkspaceId } = useWorkspace();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [addKrGoalId, setAddKrGoalId] = useState<string | null>(null);
  const [addKrDialogOpen, setAddKrDialogOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // ── Fetch ──────────────────────────────────────────────────────────────

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [dashRes, membersRes, projectsRes] = await Promise.all([
        fetch(`/api/goals/dashboard?workspaceId=${workspaceId}`),
        fetch(`/api/workspaces/${workspaceId}/members`),
        fetch(`/api/projects?workspaceId=${workspaceId}`),
      ]);

      if (!dashRes.ok) {
        throw new Error("Failed to load goals dashboard");
      }

      const dashData: DashboardData = await dashRes.json();
      setDashboard(dashData);

      if (membersRes.ok) {
        const memberData: WorkspaceMember[] = await membersRes.json();
        setMembers(memberData);
      }

      if (projectsRes.ok) {
        const projectData: WorkspaceProject[] = await projectsRes.json();
        setProjects(projectData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId) {
      fetchDashboard();
    }
  }, [workspaceId, fetchDashboard]);

  // ── CRUD handlers ──────────────────────────────────────────────────────

  const handleCreateGoal = async (data: {
    title: string;
    description: string;
    type: GoalType;
    ownerId: string;
    projectId?: string;
    startDate: string;
    endDate: string;
  }) => {
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          workspaceId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create goal");
      }

      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create goal");
    }
  };

  const handleEditGoal = async (
    goalId: string,
    data: {
      title: string;
      description: string;
      type: GoalType;
      projectId?: string;
      startDate: string;
      endDate: string;
    }
  ) => {
    try {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error("Failed to update goal");
      }

      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update goal");
    }
  };

  const handleCompleteGoal = async (goalId: string) => {
    try {
      const res = await fetch(`/api/goals/${goalId}/complete`, {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to complete goal");
      }

      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete goal");
    }
  };

  const handleCancelGoal = async (goalId: string) => {
    try {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to cancel goal");
      }

      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel goal");
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete goal");
      }

      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete goal");
    }
  };

  const handleCreateKeyResult = async (
    goalId: string,
    data: { title: string; targetValue: number; unit: string }
  ) => {
    try {
      const res = await fetch(`/api/goals/${goalId}/key-results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          targetValue: data.targetValue,
          unit: data.unit || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create key result");
      }

      await fetchDashboard();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create key result"
      );
    }
  };

  const handleUpdateKRValue = async (
    goalId: string,
    krId: string,
    currentValue: number
  ) => {
    try {
      const res = await fetch(`/api/goals/${goalId}/key-results`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyResultId: krId, currentValue }),
      });

      if (!res.ok) {
        throw new Error("Failed to update key result");
      }

      await fetchDashboard();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update key result"
      );
    }
  };

  // ── Filtered goals ─────────────────────────────────────────────────────

  const filteredGoals = dashboard?.goals.filter((goal) => {
    if (statusFilter !== "all" && goal.status !== statusFilter) return false;
    if (typeFilter !== "all" && goal.type !== typeFilter) return false;
    return true;
  }) ?? [];

  // ── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton variant="text" width={200} height={28} />
          <Skeleton variant="text" width={140} height={36} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SummaryCardSkeleton key={i} />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <GoalCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="bg-slate-800/50 border-red-500/30">
          <CardContent className="p-6 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-300">{error}</p>
              <button
                onClick={fetchDashboard}
                className="text-xs text-slate-400 hover:text-white mt-1"
              >
                Try again
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-400" />
            Goals
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Track objectives, milestones, and key results
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          New Goal
        </Button>
      </div>

      {/* Summary Cards */}
      {dashboard && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            label="Total Goals"
            value={dashboard.totalGoals}
            icon={Target}
            accent="bg-indigo-500/20 text-indigo-400"
            sub={`${dashboard.activeCount} active`}
          />
          <SummaryCard
            label="Avg Progress"
            value={`${dashboard.averageProgress}%`}
            icon={TrendingUp}
            accent="bg-blue-500/20 text-blue-400"
          />
          <SummaryCard
            label="At Risk"
            value={dashboard.atRiskCount}
            icon={AlertTriangle}
            accent="bg-amber-500/20 text-amber-400"
            sub="Deadline approaching with low progress"
          />
          <SummaryCard
            label="Completed"
            value={dashboard.completedCount}
            icon={CheckCircle2}
            accent="bg-emerald-500/20 text-emerald-400"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-9 bg-slate-800 border-slate-700 text-sm text-slate-300">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all" className="text-white focus:bg-slate-700 focus:text-white">
              All Status
            </SelectItem>
            <SelectItem value="active" className="text-white focus:bg-slate-700 focus:text-white">
              Active
            </SelectItem>
            <SelectItem value="completed" className="text-white focus:bg-slate-700 focus:text-white">
              Completed
            </SelectItem>
            <SelectItem value="cancelled" className="text-white focus:bg-slate-700 focus:text-white">
              Cancelled
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px] h-9 bg-slate-800 border-slate-700 text-sm text-slate-300">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all" className="text-white focus:bg-slate-700 focus:text-white">
              All Types
            </SelectItem>
            <SelectItem value="okr" className="text-white focus:bg-slate-700 focus:text-white">
              OKR
            </SelectItem>
            <SelectItem value="milestone" className="text-white focus:bg-slate-700 focus:text-white">
              Milestone
            </SelectItem>
            <SelectItem value="target" className="text-white focus:bg-slate-700 focus:text-white">
              Target
            </SelectItem>
          </SelectContent>
        </Select>
        {(statusFilter !== "all" || typeFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("all");
              setTypeFilter("all");
            }}
            className="text-slate-400 hover:text-white"
          >
            <X className="h-3 w-3 mr-1" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Goals List */}
      {filteredGoals.length === 0 ? (
        <Card className="bg-slate-800/30 border-slate-700/50">
          <CardContent className="p-12 text-center">
            <Target className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400">
              {dashboard && dashboard.totalGoals > 0
                ? "No goals match the current filters"
                : "No goals yet. Create your first goal to get started."}
            </p>
            {dashboard && dashboard.totalGoals === 0 && (
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Create Goal
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={(g) => {
                setEditGoal(g);
                setEditDialogOpen(true);
              }}
              onComplete={handleCompleteGoal}
              onCancel={handleCancelGoal}
              onDelete={handleDeleteGoal}
              onUpdateValue={handleUpdateKRValue}
              onAddKeyResult={(goalId) => {
                setAddKrGoalId(goalId);
                setAddKrDialogOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <CreateGoalDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        workspaceId={workspaceId}
        members={members}
        projects={projects}
        onCreateGoal={handleCreateGoal}
      />

      <EditGoalDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        goal={editGoal}
        members={members}
        projects={projects}
        onSave={handleEditGoal}
      />

      <AddKeyResultDialog
        open={addKrDialogOpen}
        onOpenChange={setAddKrDialogOpen}
        goalId={addKrGoalId ?? ""}
        onCreateKR={handleCreateKeyResult}
      />
    </div>
  );
}
