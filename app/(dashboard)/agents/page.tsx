"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/hooks/use-workspace";
import { Bot, Activity, AlertTriangle, CheckCircle2, Clock, Zap, Settings, Play, Pause } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  lastRunAt: string | null;
  runCount: number;
  config: any;
}

interface AgentAction {
  id: string;
  action: string;
  targetType: string | null;
  summary: string;
  createdAt: string;
}

export default function AgentsPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [filter, setFilter] = useState<"all" | "active" | "paused">("all");

  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: ["agents", activeWorkspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/agents?workspaceId=${activeWorkspaceId}`);
      if (!res.ok) throw new Error("Failed to fetch agents");
      return res.json();
    },
    enabled: !!activeWorkspaceId,
  });

  const { data: actions, isLoading: actionsLoading } = useQuery({
    queryKey: ["agent-actions", activeWorkspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/agents/actions?workspaceId=${activeWorkspaceId}`);
      if (!res.ok) throw new Error("Failed to fetch actions");
      return res.json();
    },
    enabled: !!activeWorkspaceId,
  });

  const filteredAgents = agents?.filter((a: Agent) =>
    filter === "all" ? true : a.status === filter
  ) || [];

  const stats = {
    total: agents?.length || 0,
    active: agents?.filter((a: Agent) => a.status === "active").length || 0,
    totalActions: actions?.length || 0,
    recentActions: actions?.filter((a: AgentAction) => {
      const d = new Date(a.createdAt);
      return Date.now() - d.getTime() < 24 * 60 * 60 * 1000;
    }).length || 0,
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-3">
            <Bot className="h-6 w-6 text-primary" />
            Nova Agents
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Autonomous AI agents working in the background for your workspace
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {stats.active} active
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Agents", value: stats.total, icon: Bot, color: "text-primary" },
          { label: "Active", value: stats.active, icon: Play, color: "text-emerald-500" },
          { label: "Actions Today", value: stats.recentActions, icon: Zap, color: "text-amber-500" },
          { label: "Total Actions", value: stats.totalActions, icon: Activity, color: "text-violet-500" },
        ].map((stat, i) => (
          <Card key={i} className="border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Agents List */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Agents</CardTitle>
            <div className="flex gap-2">
              {(["all", "active", "paused"] as const).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {agentsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))
          ) : filteredAgents.length > 0 ? (
            filteredAgents.map((agent: Agent) => (
              <div key={agent.id} className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{agent.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {agent.type} agent &middot; {agent.runCount} runs
                      {agent.lastRunAt && ` \u00b7 Last: ${new Date(agent.lastRunAt).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={agent.status === "active" ? "default" : "secondary"} className="text-[10px]">
                    {agent.status === "active" ? (
                      <><CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Active</>
                    ) : (
                      <><Pause className="h-2.5 w-2.5 mr-1" /> Paused</>
                    )}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <Bot className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No agents configured yet</p>
              <p className="text-xs text-muted-foreground mt-1">Agents will appear here once background monitoring is active</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Actions */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Recent Agent Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {actionsLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))
          ) : actions?.length > 0 ? (
            actions.slice(0, 20).map((action: AgentAction) => (
              <div key={action.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {action.action.includes("insight") ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  ) : action.action.includes("created") || action.action.includes("labeled") ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Zap className="h-3.5 w-3.5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{action.summary}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {action.action} &middot; {new Date(action.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No actions yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
