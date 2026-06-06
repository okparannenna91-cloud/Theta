"use client";

import React, { useState, useEffect } from "react";
import {
  Bot, Zap, Target, BarChart3, FileText, Search, Settings,
  Workflow, Lightbulb, Users, Shield, CheckCircle2, ArrowRight,
  Play, Cpu, Globe, Layers
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Agent {
  id: string;
  name: string;
  purpose: string;
  responsibilities: string[];
  tools: string[];
}

const AGENT_ICONS: Record<string, React.ElementType> = {
  "sprint-agent": Zap,
  "task-agent": CheckCircle2,
  "reporting-agent": BarChart3,
  "risk-agent": Shield,
  "documentation-agent": FileText,
  "automation-agent": Workflow,
  "research-agent": Search,
  "executive-agent": Users,
};

const AGENT_COLORS: Record<string, string> = {
  "sprint-agent": "text-amber-500 bg-amber-500/10 border-amber-500/20",
  "task-agent": "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  "reporting-agent": "text-blue-500 bg-blue-500/10 border-blue-500/20",
  "risk-agent": "text-rose-500 bg-rose-500/10 border-rose-500/20",
  "documentation-agent": "text-violet-500 bg-violet-500/10 border-violet-500/20",
  "automation-agent": "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
  "research-agent": "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
  "executive-agent": "text-purple-500 bg-purple-500/10 border-purple-500/20",
};

export function AgentPanel() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai/constitution?section=17")
      .then(r => r.json())
      .then(data => {
        const agentsData = data?.data?.agents || [];
        setAgents(Array.isArray(agentsData) ? agentsData : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="space-y-4 text-center">
          <Skeleton className="h-10 w-10 rounded-lg mx-auto" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Agent List */}
      <div className="w-80 border-r border-border bg-muted/30 flex flex-col shrink-0">
        <div className="p-4 border-b border-border space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Agents</h2>
              <p className="text-xs text-muted-foreground">{agents.length} Specialized Agents</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {agents.map(agent => {
            const Icon = AGENT_ICONS[agent.id] || Bot;
            const color = AGENT_COLORS[agent.id] || "text-muted-foreground bg-muted border-border";
            return (
              <button
                key={agent.id}
                onClick={() => {
                  setSelectedAgent(agent.id);
                  setExpandedAgent(expandedAgent === agent.id ? null : agent.id);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group border",
                  selectedAgent === agent.id
                    ? "bg-primary/10 border-primary/20"
                    : "border-transparent hover:bg-muted hover:border-border"
                )}
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border", color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{agent.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{agent.purpose}</p>
                </div>
                <ArrowRight className={cn(
                  "w-3 h-3 text-muted-foreground transition-transform",
                  expandedAgent === agent.id && "rotate-90 text-primary"
                )} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Agent Detail */}
      <div className="flex-1 overflow-y-auto p-6">
        {selectedAgent ? (
          (() => {
            const agent = agents.find(a => a.id === selectedAgent);
            if (!agent) return null;
            const Icon = AGENT_ICONS[agent.id] || Bot;
            const color = AGENT_COLORS[agent.id] || "text-muted-foreground bg-muted border-border";
            return (
              <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center gap-4">
                  <div className={cn("w-14 h-14 rounded-lg flex items-center justify-center border", color)}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Specialized Agent</p>
                    <h1 className="text-xl font-semibold">{agent.name}</h1>
                    <p className="text-sm text-muted-foreground mt-1">{agent.purpose}</p>
                  </div>
                </div>

                {/* Responsibilities */}
                <div className="space-y-3">
                  <h3 className="text-xs font-medium text-muted-foreground">Responsibilities</h3>
                  <div className="space-y-2">
                    {agent.responsibilities.map((r, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3 bg-muted border border-border rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-sm text-foreground/80">{r}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tools */}
                <div className="space-y-3">
                  <h3 className="text-xs font-medium text-muted-foreground">Available Tools</h3>
                  <div className="flex flex-wrap gap-2">
                    {agent.tools.map((tool, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-lg bg-muted border border-border text-xs text-muted-foreground">
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-3">
                  <h3 className="text-xs font-medium text-muted-foreground">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-left space-y-2 hover:bg-primary/20 transition-all group">
                      <Play className="w-4 h-4 text-primary" />
                      <p className="text-sm font-medium">Execute {agent.name}</p>
                      <p className="text-xs text-muted-foreground">Run this agent on current context</p>
                    </button>
                    <button className="p-4 rounded-lg bg-muted border border-border text-left space-y-2 hover:bg-muted/80 transition-all group">
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm font-medium">Configure</p>
                      <p className="text-xs text-muted-foreground">Adjust agent permissions and tools</p>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">Select an Agent</h3>
              <p className="text-xs text-muted-foreground max-w-md">
                Choose a specialized agent from the sidebar to view its purpose, responsibilities, and available tools.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
