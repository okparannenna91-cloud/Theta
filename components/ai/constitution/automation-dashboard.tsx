"use client";

import React, { useState, useEffect } from "react";
import {
  Workflow, Zap, AlertTriangle, Search, ArrowRight, Info,
  Shield, GitBranch, Play, Clock, CheckCircle2, Bell, Mail, UserPlus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TriggerDef {
  trigger: string;
  description: string;
}

interface ActionDef {
  action: string;
  description: string;
}

interface AutomationSectionData {
  triggers: TriggerDef[];
  actions: ActionDef[];
  safetyRules: string[];
}

const TRIGGER_ICONS: Record<string, React.ElementType> = {
  TASK_CREATED: Play,
  TASK_COMPLETED: CheckCircle2,
  SPRINT_STARTED: Clock,
  SPRINT_COMPLETED: Clock,
  FORM_SUBMITTED: Info,
  DOCUMENT_UPDATED: Info,
  USER_INVITED: UserPlus,
  TASK_OVERDUE: AlertTriangle,
  MEMBER_ADDED: UserPlus,
};

const TRIGGER_COLORS: Record<string, string> = {
  TASK_CREATED: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  TASK_COMPLETED: "text-green-500 bg-green-500/10 border-green-500/20",
  SPRINT_STARTED: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
  SPRINT_COMPLETED: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  FORM_SUBMITTED: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  DOCUMENT_UPDATED: "text-violet-500 bg-violet-500/10 border-violet-500/20",
  USER_INVITED: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
  TASK_OVERDUE: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  MEMBER_ADDED: "text-pink-500 bg-pink-500/10 border-pink-500/20",
};

const ACTION_ICONS: Record<string, React.ElementType> = {
  CREATE_TASK: Play,
  ASSIGN_USER: UserPlus,
  SEND_EMAIL: Mail,
  UPDATE_STATUS: GitBranch,
  GENERATE_REPORT: Info,
  NOTIFY_TEAM: Bell,
  CREATE_PROJECT: Workflow,
  SEND_NOTIFICATION: Bell,
  NOTIFY_CHANNEL: Bell,
  SET_ASSIGNEE: UserPlus,
};

export function AutomationDashboard() {
  const [data, setData] = useState<AutomationSectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"triggers" | "actions" | "safety">("triggers");
  const [selectedTrigger, setSelectedTrigger] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai/constitution?section=12")
      .then(r => r.json())
      .then(d => {
        const s = d?.data;
        setData({
          triggers: s?.triggers || [],
          actions: s?.actions || [],
          safetyRules: s?.safetyRules || [],
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="space-y-4 text-center">
          <Skeleton className="h-10 w-10 rounded-lg mx-auto" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Workflow className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Automation Intelligence</h1>
          <p className="text-sm text-muted-foreground">Section 12 — Nova Automation Capabilities</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["triggers", "actions", "safety"] as const).map(tab => (
          <Badge
            key={tab}
            variant={activeTab === tab ? "default" : "outline"}
            className="cursor-pointer text-xs rounded-md px-3 py-1 flex items-center gap-1.5"
            onClick={() => setActiveTab(tab)}
          >
            {tab === "triggers" && <Play className="w-3 h-3" />}
            {tab === "actions" && <Zap className="w-3 h-3" />}
            {tab === "safety" && <Shield className="w-3 h-3" />}
            {tab}
          </Badge>
        ))}
      </div>

      {activeTab === "triggers" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.triggers.map((t, i) => {
            const Icon = TRIGGER_ICONS[t.trigger] || Zap;
            const colorClass = TRIGGER_COLORS[t.trigger] || "text-muted-foreground bg-muted border-border";
            return (
              <Card
                key={i}
                className={cn(
                  "border shadow-sm hover:border-primary/30 transition-colors cursor-pointer",
                  selectedTrigger === t.trigger && "ring-2 ring-primary/40"
                )}
                onClick={() => setSelectedTrigger(selectedTrigger === t.trigger ? null : t.trigger)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center border", colorClass)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-sm font-semibold">{t.trigger.replace(/_/g, " ")}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {activeTab === "actions" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.actions.map((a, i) => {
            const Icon = ACTION_ICONS[a.action] || Zap;
            return (
              <Card
                key={i}
                className={cn(
                  "border shadow-sm hover:border-primary/30 transition-colors cursor-pointer",
                  selectedAction === a.action && "ring-2 ring-primary/40"
                )}
                onClick={() => setSelectedAction(selectedAction === a.action ? null : a.action)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center text-primary">
                      <Icon className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-sm font-semibold">{a.action.replace(/_/g, " ")}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{a.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {activeTab === "safety" && (
        <div className="space-y-3">
          {data?.safetyRules.map((rule, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 bg-muted border border-border rounded-lg">
              <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span className="text-sm text-foreground/80">{rule}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
