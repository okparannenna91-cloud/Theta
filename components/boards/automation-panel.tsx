"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Zap, Bell, ArrowRight, Clock, Repeat, CheckCircle2,
  Sparkles, Link2, GitBranch, Plus, Trash2, Settings,
  BrainCircuit, CalendarClock, GanttChart, MessageSquare,
  UserPlus, ListChecks, Webhook, RefreshCcw, Play,
  AlertTriangle, ToggleLeft, Workflow, Flag
} from "lucide-react";

interface AutomationPanelProps {
  workspaceId: string;
  boardId: string;
}

type AutomationTrigger =
  | "TASK_STATUS_CHANGED"
  | "TASK_CREATED"
  | "TASK_COMPLETED"
  | "DUE_DATE_ARRIVES"
  | "ITEM_CREATED"
  | "RECURRING_SCHEDULE"
  | "DEADLINE_REMINDER"
  | "APPROVAL_REQUESTED"
  | "APPROVAL_APPROVED"
  | "APPROVAL_REJECTED"
  | "AI_SUMMARIZE"
  | "AI_PRIORITIZE";

type AutomationAction =
  | "SEND_NOTIFICATION"
  | "SET_STATUS"
  | "SET_PRIORITY"
  | "ASSIGN_OWNER"
  | "MOVE_GROUP"
  | "CREATE_TASK"
  | "SYNC_BOARD"
  | "SEND_SLACK"
  | "RUN_WEBHOOK"
  | "AI_GENERATE_UPDATE";

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  action: AutomationAction;
  actionValue: string;
  conditions: Record<string, any>;
  active: boolean;
  category: "trigger" | "crossBoard" | "time" | "approval" | "ai";
  createdAt: string;
}

const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  TASK_STATUS_CHANGED: "When status changes",
  TASK_CREATED: "When task is created",
  TASK_COMPLETED: "When task is completed",
  DUE_DATE_ARRIVES: "When due date arrives",
  ITEM_CREATED: "When item is created",
  RECURRING_SCHEDULE: "Recurring schedule",
  DEADLINE_REMINDER: "Deadline reminder",
  APPROVAL_REQUESTED: "Approval requested",
  APPROVAL_APPROVED: "Approval approved",
  APPROVAL_REJECTED: "Approval rejected",
  AI_SUMMARIZE: "AI auto-summarize",
  AI_PRIORITIZE: "AI auto-prioritize",
};

const ACTION_LABELS: Record<AutomationAction, string> = {
  SEND_NOTIFICATION: "Send notification",
  SET_STATUS: "Set status",
  SET_PRIORITY: "Set priority",
  ASSIGN_OWNER: "Assign owner",
  MOVE_GROUP: "Move to group",
  CREATE_TASK: "Create task",
  SYNC_BOARD: "Sync to board",
  SEND_SLACK: "Send to Slack",
  RUN_WEBHOOK: "Run webhook",
  AI_GENERATE_UPDATE: "AI generate update",
};

const CATEGORIES = [
  { id: "trigger", label: "Trigger-Based", icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
  { id: "crossBoard", label: "Cross-Board", icon: Link2, color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: "time", label: "Time-Based", icon: Clock, color: "text-purple-500", bg: "bg-purple-500/10" },
  { id: "approval", label: "Approval", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { id: "ai", label: "AI Automation", icon: BrainCircuit, color: "text-primary", bg: "bg-primary/10" },
];

const PRESET_RULES: AutomationRule[] = [
  { id: "preset-1", name: "Status Change Notification", description: "Notify team when task status changes", trigger: "TASK_STATUS_CHANGED", action: "SEND_NOTIFICATION", actionValue: "Task status has been updated", conditions: {}, active: true, category: "trigger", createdAt: new Date().toISOString() },
  { id: "preset-2", name: "Auto-assign on Creation", description: "Assign task creator as owner", trigger: "TASK_CREATED", action: "ASSIGN_OWNER", actionValue: "", conditions: {}, active: true, category: "trigger", createdAt: new Date().toISOString() },
  { id: "preset-3", name: "Move Completed Tasks", description: "Move to Done when completed", trigger: "TASK_COMPLETED", action: "MOVE_GROUP", actionValue: "Done", conditions: {}, active: true, category: "trigger", createdAt: new Date().toISOString() },
  { id: "preset-4", name: "Sync CRM to Projects", description: "Create project task from CRM entry", trigger: "TASK_CREATED", action: "SYNC_BOARD", actionValue: "", conditions: { boardId: "" }, active: false, category: "crossBoard", createdAt: new Date().toISOString() },
  { id: "preset-5", name: "Recurring Weekly Task", description: "Create task every Monday", trigger: "RECURRING_SCHEDULE", action: "CREATE_TASK", actionValue: "Weekly Review", conditions: { schedule: "weekly", day: "Monday" }, active: false, category: "time", createdAt: new Date().toISOString() },
  { id: "preset-6", name: "Deadline Reminder", description: "Remind 24h before due date", trigger: "DEADLINE_REMINDER", action: "SEND_NOTIFICATION", actionValue: "Task due in 24 hours!", conditions: { hoursBefore: 24 }, active: true, category: "time", createdAt: new Date().toISOString() },
  { id: "preset-7", name: "Approval Workflow", description: "Request approval on status change to 'Review'", trigger: "TASK_STATUS_CHANGED", action: "SEND_NOTIFICATION", actionValue: "Approval requested", conditions: { statusTo: "review" }, active: false, category: "approval", createdAt: new Date().toISOString() },
  { id: "preset-8", name: "Auto-summarize Tasks", description: "AI generates summary of completed tasks", trigger: "TASK_COMPLETED", action: "AI_GENERATE_UPDATE", actionValue: "Generate summary", conditions: {}, active: false, category: "ai", createdAt: new Date().toISOString() },
  { id: "preset-9", name: "Auto-prioritize High Impact", description: "AI prioritizes tasks based on content", trigger: "TASK_CREATED", action: "SET_PRIORITY", actionValue: "high", conditions: { aiAnalysis: true }, active: false, category: "ai", createdAt: new Date().toISOString() },
];

export default function AutomationPanel({ workspaceId, boardId }: AutomationPanelProps) {
  const [activeCategory, setActiveCategory] = useState<string>("trigger");
  const [isCreating, setIsCreating] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const queryClient = useQueryClient();

  const [formState, setFormState] = useState({
    name: "", trigger: "TASK_STATUS_CHANGED" as AutomationTrigger,
    action: "SEND_NOTIFICATION" as AutomationAction,
    actionValue: "", active: true,
  });

  const { data: rulesData } = useQuery({
    queryKey: ["automations", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/automations?workspaceId=${workspaceId}`);
      if (!res.ok) throw new Error("Failed to fetch automations");
      return res.json();
    },
    enabled: !!workspaceId,
  });

  const rules: AutomationRule[] = Array.isArray(rulesData) ? rulesData : [];

  const allRules = [...PRESET_RULES, ...rules];
  const filteredRules = allRules.filter(r => r.category === activeCategory);
  const activeRules = allRules.filter(r => r.active).length;
  const totalRules = allRules.length;

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, workspaceId }),
      });
      if (!res.ok) throw new Error("Failed to create automation");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      setIsCreating(false);
      toast.success("Automation created");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await fetch(`/api/automations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error("Failed to update automation");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast.success("Automation updated");
    },
  });

  const getCategoryIcon = (catId: string) => {
    const cat = CATEGORIES.find(c => c.id === catId);
    return cat?.icon || Zap;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Automations
            </h3>
            <p className="text-xs text-muted-foreground">
              {activeRules}/{totalRules} rules active
            </p>
          </div>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setIsCreating(true)}>
            <Plus className="h-3 w-3" /> New Rule
          </Button>
        </div>
      </div>

      <div className="flex gap-1 p-3 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const count = allRules.filter(r => r.category === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all whitespace-nowrap",
                activeCategory === cat.id
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <Icon className={cn("h-3 w-3", activeCategory !== cat.id && cat.color)} />
              {cat.label}
              {count > 0 && (
                <span className="ml-1 opacity-60">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {filteredRules.map((rule, i) => {
          const cat = CATEGORIES.find(c => c.id === rule.category);
          const Icon = cat?.icon || Zap;
          const TriggerIcon = getTriggerIcon(rule.trigger);
          const ActionIcon = getActionIcon(rule.action);

          return (
            <Card key={rule.id} className={cn(
              "border shadow-sm hover:shadow-md transition-all",
              !rule.active && "opacity-50"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={cn("h-3.5 w-3.5", cat?.color)} />
                      <h4 className="text-xs font-semibold truncate">{rule.name}</h4>
                      <Badge variant={rule.active ? "default" : "secondary"} className="text-[8px] px-1.5 py-0 h-4">
                        {rule.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-2">{rule.description}</p>
                    <div className="flex items-center gap-2 text-[9px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <TriggerIcon className="h-3 w-3" />
                        {TRIGGER_LABELS[rule.trigger]}
                      </span>
                      <ArrowRight className="h-2.5 w-2.5" />
                      <span className="flex items-center gap-1">
                        <ActionIcon className="h-3 w-3" />
                        {ACTION_LABELS[rule.action]}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Switch
                      checked={rule.active}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: rule.id, active: checked })}
                      className="scale-75"
                    />
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Trash2 className="h-3 w-3 text-slate-400" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredRules.length === 0 && (
          <div className="py-16 text-center text-slate-400">
            <Zap className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No {activeCategory} automations</p>
            <p className="text-xs mt-1">Create an automation rule to streamline your workflow</p>
          </div>
        )}
      </div>

      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Automation Rule</DialogTitle>
            <DialogDescription>Define when and what happens automatically</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500">Rule Name</Label>
              <Input
                placeholder="e.g. Notify on status change"
                value={formState.name}
                onChange={(e) => setFormState(f => ({ ...f, name: e.target.value }))}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500">Trigger</Label>
              <Select
                value={formState.trigger}
                onValueChange={(v) => setFormState(f => ({ ...f, trigger: v as AutomationTrigger }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500">Action</Label>
              <Select
                value={formState.action}
                onValueChange={(v) => setFormState(f => ({ ...f, action: v as AutomationAction }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTION_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500">Action Value / Message</Label>
              <Textarea
                placeholder="Notification message or target value..."
                value={formState.actionValue}
                onChange={(e) => setFormState(f => ({ ...f, actionValue: e.target.value }))}
                className="min-h-[60px] text-sm"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border">
              <div>
                <p className="text-xs font-medium">Enable immediately</p>
                <p className="text-[10px] text-muted-foreground">Rule will start running after creation</p>
              </div>
              <Switch
                checked={formState.active}
                onCheckedChange={(checked) => setFormState(f => ({ ...f, active: checked }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsCreating(false)} size="sm">Cancel</Button>
            <Button
              size="sm"
              disabled={!formState.name || createMutation.isPending}
              onClick={() => createMutation.mutate(formState)}
            >
              {createMutation.isPending ? "Creating..." : "Create Rule"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getTriggerIcon(trigger: AutomationTrigger) {
  switch (trigger) {
    case "TASK_STATUS_CHANGED": return GitBranch;
    case "TASK_CREATED": return Plus;
    case "TASK_COMPLETED": return CheckCircle2;
    case "DUE_DATE_ARRIVES": return CalendarClock;
    case "RECURRING_SCHEDULE": return Repeat;
    case "DEADLINE_REMINDER": return Bell;
    case "APPROVAL_REQUESTED": return UserPlus;
    case "APPROVAL_APPROVED": return CheckCircle2;
    case "APPROVAL_REJECTED": return AlertTriangle;
    case "AI_SUMMARIZE": return BrainCircuit;
    case "AI_PRIORITIZE": return Sparkles;
    default: return Zap;
  }
}

function getActionIcon(action: AutomationAction) {
  switch (action) {
    case "SEND_NOTIFICATION": return Bell;
    case "SET_STATUS": return ToggleLeft;
    case "SET_PRIORITY": return Flag;
    case "ASSIGN_OWNER": return UserPlus;
    case "MOVE_GROUP": return ListChecks;
    case "CREATE_TASK": return Plus;
    case "SYNC_BOARD": return RefreshCcw;
    case "SEND_SLACK": return MessageSquare;
    case "RUN_WEBHOOK": return Webhook;
    case "AI_GENERATE_UPDATE": return BrainCircuit;
    default: return Zap;
  }
}


