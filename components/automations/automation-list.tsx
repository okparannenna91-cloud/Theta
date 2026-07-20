"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Zap, Plus, Trash2, ChevronDown, AlertCircle, Sparkles,
  ArrowRight, Activity, Bell, Mail, UserPlus, BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select";

const TRIGGERS = [
  { value: "TASK_CREATED", label: "Task Created", icon: Plus, color: "text-blue-500" },
  { value: "TASK_COMPLETED", label: "Task Completed", icon: Activity, color: "text-emerald-500" },
  { value: "TASK_OVERDUE", label: "Task Overdue", icon: AlertCircle, color: "text-destructive" },
  { value: "SPRINT_STARTED", label: "Sprint Started", icon: Zap, color: "text-amber-500" },
  { value: "SPRINT_COMPLETED", label: "Sprint Completed", icon: Zap, color: "text-purple-500" },
  { value: "FORM_SUBMITTED", label: "Form Submitted", icon: BarChart3, color: "text-cyan-500" },
  { value: "USER_INVITED", label: "User Invited", icon: UserPlus, color: "text-pink-500" },
  { value: "MEMBER_ADDED", label: "Member Added", icon: UserPlus, color: "text-pink-500" },
];

const ACTIONS = [
  { value: "SEND_NOTIFICATION", label: "Send Notification", icon: Bell, color: "text-amber-500" },
  { value: "SEND_EMAIL", label: "Send Email", icon: Mail, color: "text-blue-500" },
  { value: "CREATE_TASK", label: "Create Task", icon: Plus, color: "text-emerald-500" },
  { value: "ASSIGN_USER", label: "Assign User", icon: UserPlus, color: "text-purple-500" },
  { value: "UPDATE_STATUS", label: "Update Status", icon: ArrowRight, color: "text-cyan-500" },
  { value: "NOTIFY_TEAM", label: "Notify Team", icon: Bell, color: "text-amber-500" },
  { value: "GENERATE_REPORT", label: "Generate Report", icon: BarChart3, color: "text-pink-500" },
  { value: "SET_PRIORITY", label: "Set Priority", icon: AlertCircle, color: "text-red-500" },
];

interface AutomationListProps {
  limit?: number;
}

export function AutomationList({ limit }: AutomationListProps) {
  const { activeWorkspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTrigger, setNewTrigger] = useState("");
  const [newAction, setNewAction] = useState("");
  const [newCondition, setNewCondition] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["automations", activeWorkspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/automations?workspaceId=${activeWorkspaceId}`);
      if (!res.ok) throw new Error("Failed to fetch automations");
      return res.json();
    },
    enabled: !!activeWorkspaceId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          trigger: newTrigger,
          action: newAction,
          condition: newCondition || undefined,
          workspaceId: activeWorkspaceId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      setShowCreate(false);
      setNewName("");
      setNewTrigger("");
      setNewAction("");
      setNewCondition("");
      toast.success("Automation created");
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
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast.success("Automation deleted");
    },
  });

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automations"] }),
  });

  const automations = (data?.automations || []).slice(0, limit);
  const limits = data?.limits;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {limits && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {limits.current}/{limits.max === -1 ? "∞" : limits.max} automations
            </Badge>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-xs gap-1.5">
                <Plus className="h-3.5 w-3.5" /> New Automation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Automation</DialogTitle>
                <DialogDescription>Automate workflows with triggers and actions</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Name *</label>
                  <Input
                    placeholder="Notify team on overdue tasks..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">When this happens (Trigger) *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TRIGGERS.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setNewTrigger(t.value)}
                        className={cn(
                          "flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs transition-all",
                          newTrigger === t.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                        )}
                      >
                        <t.icon className={cn("h-3.5 w-3.5", t.color)} />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Then do this (Action) *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ACTIONS.map((a) => (
                      <button
                        key={a.value}
                        onClick={() => setNewAction(a.value)}
                        className={cn(
                          "flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs transition-all",
                          newAction === a.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                        )}
                      >
                        <a.icon className={cn("h-3.5 w-3.5", a.color)} />
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Condition (optional)</label>
                  <Input
                    placeholder="e.g., priority == 'high'"
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button
                  size="sm"
                  onClick={() => createMutation.mutate()}
                  disabled={!newName || !newTrigger || !newAction || createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {automations.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center py-10 text-center">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold mb-1">No automations</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Create automations to streamline repetitive workflows.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {automations.map((auto: any) => {
            const trigger = TRIGGERS.find((t) => t.value === auto.trigger);
            const action = ACTIONS.find((a) => a.value === auto.action);
            const TriggerIcon = trigger?.icon || Zap;
            const ActionIcon = action?.icon || ArrowRight;

            return (
              <Card key={auto.id} className="border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Zap className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold truncate">{auto.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <TriggerIcon className={cn("h-3 w-3", trigger?.color)} />
                            {trigger?.label || auto.trigger}
                          </span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="flex items-center gap-1">
                            <ActionIcon className={cn("h-3 w-3", action?.color)} />
                            {action?.label || auto.action}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch
                        checked={auto.active}
                        onCheckedChange={(val) => toggleMutation.mutate({ id: auto.id, active: val })}
                      />
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7"
                        onClick={() => deleteMutation.mutate(auto.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
