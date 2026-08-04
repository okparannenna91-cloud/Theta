"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Plus, Zap, CheckCircle2, ArrowRight, ArrowRightLeft, UserPlus, Flag,
  Clock, FolderPlus, Play, FileText, FileEdit, Mail, Bell, Trash2, Pencil,
  Activity, Send, Users, Gauge, TrendingUp, ListChecks, CircleDashed,
  Loader2, Sparkles, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useStatuses, getStatusValue, getStatusDisplayName, FALLBACK_STATUSES } from "@/hooks/use-statuses";
import { useWorkspaceMembers } from "@/hooks/use-workspace-members";

// ──────────────────────────────────────────────
//  DEFINITIONS
// ──────────────────────────────────────────────

interface TriggerDef {
  label: string;
  description: string;
  icon: any;
  color: string;
}

const TRIGGER_DEFS: Record<string, TriggerDef> = {
  TASK_CREATED: { label: "Task Created", description: "When a task is added", icon: Plus, color: "text-blue-500" },
  TASK_STATUS_UPDATED: { label: "Status Changed", description: "When a task's status changes", icon: ArrowRightLeft, color: "text-violet-500" },
  TASK_COMPLETED: { label: "Task Completed", description: "When a task is marked done", icon: CheckCircle2, color: "text-emerald-500" },
  TASK_ASSIGNED: { label: "Task Assigned", description: "When someone is assigned to a task", icon: UserPlus, color: "text-purple-500" },
  TASK_PRIORITY_CHANGED: { label: "Priority Changed", description: "When a task's priority changes", icon: Flag, color: "text-amber-500" },
  DUE_DATE_PASSED: { label: "Due Date Passed", description: "When a task goes past its due date", icon: Clock, color: "text-orange-500" },
  PROJECT_CREATED: { label: "Project Created", description: "When a new project is created", icon: FolderPlus, color: "text-sky-500" },
  SPRINT_STARTED: { label: "Sprint Started", description: "When a sprint begins", icon: Play, color: "text-amber-500" },
  SPRINT_COMPLETED: { label: "Sprint Completed", description: "When a sprint ends", icon: CheckCircle2, color: "text-purple-500" },
  FORM_SUBMITTED: { label: "Form Submitted", description: "When a form is submitted", icon: FileText, color: "text-cyan-500" },
  DOCUMENT_UPDATED: { label: "Document Updated", description: "When a document changes", icon: FileEdit, color: "text-indigo-500" },
  USER_INVITED: { label: "User Invited", description: "When someone is invited", icon: Mail, color: "text-pink-500" },
  MEMBER_ADDED: { label: "Member Added", description: "When a member joins the workspace", icon: UserPlus, color: "text-pink-500" },
};

const TRIGGER_CATEGORIES: Array<{ id: string; label: string; triggers: string[] }> = [
  {
    id: "task",
    label: "Tasks",
    triggers: ["TASK_CREATED", "TASK_STATUS_UPDATED", "TASK_COMPLETED", "TASK_ASSIGNED", "TASK_PRIORITY_CHANGED", "DUE_DATE_PASSED"],
  },
  { id: "sprint", label: "Sprints", triggers: ["SPRINT_STARTED", "SPRINT_COMPLETED"] },
  { id: "project", label: "Projects", triggers: ["PROJECT_CREATED"] },
  { id: "other", label: "Other", triggers: ["FORM_SUBMITTED", "DOCUMENT_UPDATED", "USER_INVITED", "MEMBER_ADDED"] },
];

type ActionKind = "priority" | "status" | "member" | "message" | "task-title" | "project-name" | "none";

interface ActionDef {
  label: string;
  description: string;
  icon: any;
  color: string;
  kind: ActionKind;
  prompt: string;
}

const ACTION_DEFS: Record<string, ActionDef> = {
  SET_PRIORITY: { label: "Set Priority", description: "Change the task's priority", icon: Flag, color: "text-red-500", kind: "priority", prompt: "Set priority to" },
  UPDATE_STATUS: { label: "Update Status", description: "Move the task to a status", icon: ArrowRightLeft, color: "text-violet-500", kind: "status", prompt: "Move the task to" },
  SET_STATUS: { label: "Set Status", description: "Move the task to a status", icon: ArrowRight, color: "text-cyan-500", kind: "status", prompt: "Move the task to" },
  ASSIGN_USER: { label: "Assign User", description: "Assign the task to someone", icon: UserPlus, color: "text-purple-500", kind: "member", prompt: "Assign to" },
  SET_ASSIGNEE: { label: "Set Assignee", description: "Assign the task to someone", icon: Users, color: "text-purple-500", kind: "member", prompt: "Assign to" },
  SEND_NOTIFICATION: { label: "Send Notification", description: "Notify a member", icon: Bell, color: "text-amber-500", kind: "message", prompt: "Notification message" },
  NOTIFY_TEAM: { label: "Notify Team", description: "Send a message to the team", icon: Users, color: "text-amber-500", kind: "message", prompt: "Team message" },
  NOTIFY_CHANNEL: { label: "Notify Channel", description: "Post to a channel", icon: Send, color: "text-cyan-500", kind: "message", prompt: "Channel message" },
  SEND_EMAIL: { label: "Send Email", description: "Email the team", icon: Mail, color: "text-blue-500", kind: "none", prompt: "" },
  CREATE_TASK: { label: "Create Task", description: "Create a new task", icon: Plus, color: "text-emerald-500", kind: "task-title", prompt: "Task title" },
  CREATE_PROJECT: { label: "Create Project", description: "Create a new project", icon: FolderPlus, color: "text-sky-500", kind: "project-name", prompt: "Project name" },
  GENERATE_REPORT: { label: "Generate Report", description: "Generate a project report", icon: TrendingUp, color: "text-pink-500", kind: "none", prompt: "" },
};

const CONDITION_FIELDS = [
  { value: "taskStatus", label: "Status" },
  { value: "taskPriority", label: "Priority" },
  { value: "taskTitle", label: "Title" },
  { value: "assigneeId", label: "Assignee" },
];

const OPERATORS = [
  { value: "equals", label: "is" },
  { value: "not_equals", label: "is not" },
  { value: "contains", label: "contains" },
  { value: "in", label: "is any of" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

interface Condition {
  field: string;
  operator: string;
  value: string;
}

interface Automation {
  id: string;
  name: string;
  trigger: string;
  condition: string | null;
  action: string;
  actionValue: string | null;
  workspaceId: string;
  projectId: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AutomationLog {
  id: string;
  automationId: string;
  result: string;
  error: string | null;
  createdAt: string;
}

// ──────────────────────────────────────────────
//  HELPERS
// ──────────────────────────────────────────────

function parseConditions(raw: string | null): Condition[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((c) => ({
      field: String(c.field || "taskStatus"),
      operator: String(c.operator || "equals"),
      value: String(c.value ?? ""),
    }));
  } catch {
    return [];
  }
}

function describeConditions(conditions: Condition[]): string {
  if (conditions.length === 0) return "";
  return conditions
    .map((c) => {
      const f = CONDITION_FIELDS.find((x) => x.value === c.field)?.label || c.field;
      const op = OPERATORS.find((x) => x.value === c.operator)?.label || c.operator;
      return `${f.toLowerCase()} ${op} "${c.value}"`;
    })
    .join(" · ");
}

function parseActionValue(action: string, raw: string | null): { display: string; data: string } {
  if (!raw) return { display: "", data: "" };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const title = parsed.title || parsed.message || parsed.name || parsed.value;
      const display =
        action === "CREATE_TASK"
          ? `"${parsed.title ?? ""}"${parsed.status ? ` → ${getStatusDisplayName(parsed.status)}` : ""}`
          : String(title ?? "");
      return { display, data: raw };
    }
  } catch {
    // scalar value
  }
  return { display: raw, data: raw };
}

// ──────────────────────────────────────────────
//  COMPONENT
// ──────────────────────────────────────────────

interface Props {
  workspaceId: string;
  projectId: string;
}

export function ProjectAutomations({ workspaceId, projectId }: Props) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing] = useState<Automation | null>(null);

  const { data: statusesData } = useStatuses(workspaceId, projectId);
  const { members } = useWorkspaceMembers(workspaceId);

  const statuses = statusesData && statusesData.length > 0 ? statusesData : FALLBACK_STATUSES;

  const { data, isLoading } = useQuery({
    queryKey: ["automations", workspaceId, projectId],
    queryFn: async () => {
      const res = await fetch(`/api/automations?workspaceId=${workspaceId}&projectId=${projectId}`);
      if (!res.ok) throw new Error("Failed to fetch automations");
      return res.json();
    },
    enabled: !!workspaceId && !!projectId,
  });

  const { data: logsData } = useQuery({
    queryKey: ["automation-logs", workspaceId, projectId],
    queryFn: async () => {
      const res = await fetch(`/api/automations/logs?workspaceId=${workspaceId}&projectId=${projectId}`);
      if (!res.ok) return { logs: [] };
      return res.json();
    },
    enabled: !!workspaceId && !!projectId,
    refetchInterval: 30_000,
  });

  const automations: Automation[] = useMemo(() => (data?.automations || []) as Automation[], [data]);
  const limits = data?.limits;
  const logs: AutomationLog[] = useMemo(() => (logsData?.logs || []) as AutomationLog[], [logsData]);

  const lastRunByAutomation = useMemo(() => {
    const map: Record<string, AutomationLog> = {};
    for (const log of logs) {
      if (!map[log.automationId]) map[log.automationId] = log;
    }
    return map;
  }, [logs]);

  const filtered = useMemo(() => {
    if (filter === "active") return automations.filter((a) => a.active);
    if (filter === "inactive") return automations.filter((a) => !a.active);
    return automations;
  }, [automations, filter]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["automations", workspaceId, projectId] });
    queryClient.invalidateQueries({ queryKey: ["automations"] });
  };

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await fetch(`/api/automations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["automation-logs"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/automations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      toast.success("Automation deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const activeCount = automations.filter((a) => a.active).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Automations
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Automate repetitive workflows — scoped to this project.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {limits && (
            <Badge variant="secondary" className="text-xs font-normal">
              {limits.current}/{limits.max === -1 ? "∞" : limits.max} used
            </Badge>
          )}
          <Button size="sm" className="h-8 gap-1.5" onClick={() => { setEditing(null); setBuilderOpen(true); }}>
            <Plus className="h-3.5 w-3.5" /> New Automation
          </Button>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={ListChecks} label="Total automations" value={automations.length} color="text-sky-500" />
        <StatCard icon={Activity} label="Active" value={activeCount} color="text-emerald-500" />
        <StatCard icon={CircleDashed} label="Inactive" value={automations.length - activeCount} color="text-muted-foreground" />
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-1.5">
        {(["all", "active", "inactive"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize",
              filter === f ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-[76px] w-full rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState hasAny={automations.length > 0} onCreate={() => { setEditing(null); setBuilderOpen(true); }} />
      ) : (
        <div className="space-y-2">
          {filtered.map((auto) => {
            const trigger = TRIGGER_DEFS[auto.trigger];
            const action = ACTION_DEFS[auto.action];
            const TriggerIcon = trigger?.icon || Zap;
            const ActionIcon = action?.icon || ArrowRight;
            const conditions = parseConditions(auto.condition);
            const value = parseActionValue(auto.action, auto.actionValue);
            const lastRun = lastRunByAutomation[auto.id];

            return (
              <div
                key={auto.id}
                className={cn(
                  "group rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md",
                  !auto.active && "opacity-70"
                )}
              >
                <div className="flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0", auto.active ? "" : "opacity-50")}>
                      <TriggerIcon className={cn("h-4 w-4", trigger?.color)} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold truncate">{auto.name}</h3>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <TriggerIcon className={cn("h-3 w-3", trigger?.color)} />
                          {trigger?.label || auto.trigger}
                        </span>
                        {conditions.length > 0 && (
                          <>
                            <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                            <span className="text-foreground/70">{describeConditions(conditions)}</span>
                          </>
                        )}
                        <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                        <span className="flex items-center gap-1">
                          <ActionIcon className={cn("h-3 w-3", action?.color)} />
                          {action?.label || auto.action}
                          {value.display && <span className="text-foreground/80">· {value.display}</span>}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {lastRun && <LastRunBadge log={lastRun} />}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(auto); setBuilderOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => deleteMutation.mutate(auto.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Switch
                      checked={auto.active}
                      onCheckedChange={(val) => toggleMutation.mutate({ id: auto.id, active: val })}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {builderOpen && (
        <AutomationBuilder
          workspaceId={workspaceId}
          projectId={projectId}
          editing={editing}
          statuses={statuses}
          members={members}
          onClose={() => setBuilderOpen(false)}
          onSaved={() => {
            setBuilderOpen(false);
            invalidate();
          }}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
//  SUBCOMPONENTS
// ──────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
        <Icon className={cn("h-4 w-4", color)} />
      </div>
      <div>
        <p className="text-lg font-semibold leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}

function LastRunBadge({ log }: { log: AutomationLog }) {
  const color =
    log.result === "success" ? "text-emerald-500 bg-emerald-500/10" :
    log.result === "skipped" ? "text-amber-500 bg-amber-500/10" :
    "text-red-500 bg-red-500/10";
  const label =
    log.result === "success" ? "Ran" :
    log.result === "skipped" ? "Skipped" :
    "Failed";
  return (
    <Badge variant="secondary" className={cn("text-[10px] font-medium gap-1", color)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label} {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
    </Badge>
  );
}

function EmptyState({ hasAny, onCreate }: { hasAny: boolean; onCreate: () => void }) {
  return (
    <div className="rounded-lg border-2 border-dashed">
      <div className="flex flex-col items-center py-12 text-center px-4">
        <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-sm font-semibold mb-1">
          {hasAny ? "No automations in this view" : "No automations in this project"}
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm mb-4">
          {hasAny
            ? "Try a different filter, or create a new automation for this project."
            : "Set up rules like \"when a task is completed, notify the team\" — they only fire for tasks in this project."}
        </p>
        <Button size="sm" onClick={onCreate}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> New Automation
        </Button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
//  BUILDER
// ──────────────────────────────────────────────

interface BuilderProps {
  workspaceId: string;
  projectId: string;
  editing: Automation | null;
  statuses: Array<{ id: string; name: string; color: string | null }>;
  members: Array<{ id: string; name: string | null; email: string; imageUrl?: string | null }>;
  onClose: () => void;
  onSaved: () => void;
}

function AutomationBuilder({ workspaceId, projectId, editing, statuses, members, onClose, onSaved }: BuilderProps) {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState("task");
  const [name, setName] = useState(editing?.name || "");
  const [trigger, setTrigger] = useState(editing?.trigger || "");
  const [conditions, setConditions] = useState<Condition[]>(() => parseConditions(editing?.condition || null));
  const [action, setAction] = useState(editing?.action || "");
  const [actionValue, setActionValue] = useState<string>(() => {
    if (!editing?.actionValue) return "";
    const parsed = parseActionValue(editing.action, editing.actionValue);
    return parsed.data;
  });
  const [saving, setSaving] = useState(false);

  const currentAction = ACTION_DEFS[action];

  const isEdit = !!editing;

  const addCondition = () => setConditions((c) => [...c, { field: "taskStatus", operator: "equals", value: "" }]);
  const updateCondition = (i: number, patch: Partial<Condition>) =>
    setConditions((c) => c.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const removeCondition = (i: number) => setConditions((c) => c.filter((_, idx) => idx !== i));

  const buildActionValue = (): string | null => {
    const kind = currentAction?.kind || "none";
    if (kind === "none") return null;
    if (action === "CREATE_TASK") {
      const [title, ...statusParts] = actionValue.split("\n");
      return JSON.stringify({ title, status: statusParts[0] || undefined });
    }
    return actionValue || null;
  };

  const handleSave = async () => {
    if (!name.trim() || !trigger || !action) {
      toast.error("Please provide a name, trigger, and action");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        trigger,
        condition: conditions.filter((c) => c.value.trim() !== "").length > 0
          ? JSON.stringify(conditions.filter((c) => c.value.trim() !== ""))
          : null,
        action,
        actionValue: buildActionValue(),
        workspaceId,
        projectId,
      };

      const res = await fetch(isEdit ? `/api/automations/${editing.id}` : "/api/automations", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(typeof err.error === "string" ? err.error : "Failed to save automation");
      }
      toast.success(isEdit ? "Automation updated" : "Automation created");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const canNext = step === 1 ? !!trigger : step === 2 ? true : !!action;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {isEdit ? "Edit Automation" : "New Automation"}
          </DialogTitle>
          <DialogDescription>
            Automations run in the background whenever a matching event happens in this project.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2">
          {["Trigger", "Conditions", "Action"].map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex-1 justify-center",
                  active ? "bg-primary/10 text-primary" : done ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                )}>
                  <span className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center text-[10px]",
                    active ? "bg-primary text-primary-foreground" : done ? "bg-emerald-500 text-white" : "bg-muted-foreground/20"
                  )}>
                    {done ? "✓" : n}
                  </span>
                  {label}
                </div>
                {n < 3 && <div className="h-px flex-1 bg-border" />}
              </div>
            );
          })}
        </div>

        <Separator />

        {/* STEP 1 — Trigger */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-1.5">
              {TRIGGER_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setCategory(c.id); setTrigger(""); }}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    category === c.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[360px] overflow-y-auto pr-1">
              {TRIGGER_CATEGORIES.find((c) => c.id === category)!.triggers.map((t) => {
                const def = TRIGGER_DEFS[t];
                const Icon = def.icon;
                const selected = trigger === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTrigger(t)}
                    className={cn(
                      "text-left rounded-lg border p-3 transition-all",
                      selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/30 hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon className={cn("h-4 w-4", def.color)} />
                      <span className="text-xs font-semibold">{def.label}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">{def.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2 — Conditions */}
        {step === 2 && (
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            <p className="text-xs text-muted-foreground">
              Optional — the automation only runs when all conditions match.
            </p>
            {conditions.length === 0 && (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-xs text-muted-foreground mb-3">No conditions — runs on every matching event.</p>
                <Button size="sm" variant="outline" onClick={addCondition}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Add condition
                </Button>
              </div>
            )}
            {conditions.map((cond, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border bg-card p-2.5">
                <div className="grid grid-cols-[1fr_120px_1.2fr] gap-2 flex-1">
                  <Select value={cond.field} onValueChange={(v) => updateCondition(i, { field: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONDITION_FIELDS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={cond.operator} onValueChange={(v) => updateCondition(i, { operator: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="h-8 text-xs"
                    placeholder="value"
                    value={cond.value}
                    onChange={(e) => updateCondition(i, { value: e.target.value })}
                  />
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeCondition(i)}>
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            ))}
            {conditions.length > 0 && (
              <Button size="sm" variant="outline" onClick={addCondition}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add condition
              </Button>
            )}
          </div>
        )}

        {/* STEP 3 — Action */}
        {step === 3 && (
          <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(ACTION_DEFS).map(([key, def]) => {
                const Icon = def.icon;
                const selected = action === key;
                return (
                  <button
                    key={key}
                    onClick={() => { setAction(key); setActionValue(""); }}
                    className={cn(
                      "text-left rounded-lg border p-3 transition-all",
                      selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/30 hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon className={cn("h-4 w-4", def.color)} />
                      <span className="text-xs font-semibold">{def.label}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">{def.description}</p>
                  </button>
                );
              })}
            </div>

            {currentAction && currentAction.kind !== "none" && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <label className="text-xs font-medium">{currentAction.prompt}</label>
                {currentAction.kind === "priority" && (
                  <Select value={actionValue} onValueChange={setActionValue}>
                    <SelectTrigger className="h-8 text-xs w-full sm:w-56"><SelectValue placeholder="Select priority" /></SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {currentAction.kind === "status" && (
                  <Select value={actionValue} onValueChange={setActionValue}>
                    <SelectTrigger className="h-8 text-xs w-full sm:w-56"><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s.id} value={getStatusValue(s.name)}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {currentAction.kind === "member" && (
                  <Select value={actionValue} onValueChange={setActionValue}>
                    <SelectTrigger className="h-8 text-xs w-full sm:w-56"><SelectValue placeholder="Select member" /></SelectTrigger>
                    <SelectContent>
                      {members.map((m) => {
                        const initials = m.name
                          ? m.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                          : m.email.slice(0, 2).toUpperCase();
                        return (
                          <SelectItem key={m.id} value={m.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={m.imageUrl || undefined} alt={m.name || m.email} />
                                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                              </Avatar>
                              <span>{m.name || m.email}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
                {(currentAction.kind === "message" || currentAction.kind === "project-name") && (
                  <Input
                    className="h-8 text-xs"
                    placeholder={currentAction.kind === "message" ? "Enter message..." : "Enter project name..."}
                    value={actionValue}
                    onChange={(e) => setActionValue(e.target.value)}
                  />
                )}
                {currentAction.kind === "task-title" && (
                  <div className="space-y-2">
                    <Input
                      className="h-8 text-xs"
                      placeholder="Task title"
                      value={actionValue.split("\n")[0] || ""}
                      onChange={(e) => {
                        const status = actionValue.split("\n")[1] || "";
                        setActionValue(e.target.value + (status ? `\n${status}` : ""));
                      }}
                    />
                    <Select
                      value={actionValue.split("\n")[1] || ""}
                      onValueChange={(v) => setActionValue(`${actionValue.split("\n")[0] || ""}\n${v}`)}
                    >
                      <SelectTrigger className="h-8 text-xs w-full sm:w-56"><SelectValue placeholder="Initial status (optional)" /></SelectTrigger>
                      <SelectContent>
                        {statuses.map((s) => (
                          <SelectItem key={s.id} value={getStatusValue(s.name)}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {currentAction && currentAction.kind === "none" && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-[11px] text-muted-foreground">
                  {action === "GENERATE_REPORT"
                    ? "Generates a report for this project when triggered."
                    : "Sends an email to workspace members when triggered."}
                </p>
              </div>
            )}

            <div className="space-y-2 pt-1">
              <label className="text-xs font-medium">Name</label>
              <Input
                className="h-8 text-xs"
                placeholder="e.g. Notify team when a task is completed"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
        )}

        <Separator />

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          {step > 1 && (
            <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>Back</Button>
          )}
          {step < 3 ? (
            <Button size="sm" onClick={() => setStep(step + 1)} disabled={!canNext}>
              Next
            </Button>
          ) : (
            <Button size="sm" onClick={handleSave} disabled={!name.trim() || saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
              {isEdit ? "Save Changes" : "Create Automation"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
