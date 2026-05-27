"use client";

import React, { useState, useEffect } from "react";
import {
  Bot, Zap, Target, BarChart3, FileText, Search, Settings,
  Workflow, Lightbulb, Users, Shield, CheckCircle2, ArrowRight,
  Play, Cpu, Globe, Layers
} from "lucide-react";
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
  "sprint-agent": "from-amber-500/10 to-amber-600/5 border-amber-500/20",
  "task-agent": "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20",
  "reporting-agent": "from-blue-500/10 to-blue-600/5 border-blue-500/20",
  "risk-agent": "from-rose-500/10 to-rose-600/5 border-rose-500/20",
  "documentation-agent": "from-violet-500/10 to-violet-600/5 border-violet-500/20",
  "automation-agent": "from-cyan-500/10 to-cyan-600/5 border-cyan-500/20",
  "research-agent": "from-indigo-500/10 to-indigo-600/5 border-indigo-500/20",
  "executive-agent": "from-purple-500/10 to-purple-600/5 border-purple-500/20",
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
      <div className="flex items-center justify-center h-[60vh]">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 animate-pulse mx-auto" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Agent Framework</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-9.5rem)] w-[calc(100%+4rem)] -ml-8 -mt-2 overflow-hidden">
      {/* Agent List */}
      <div className="w-80 border-r border-slate-800 bg-slate-950/50 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-xs font-black text-white uppercase tracking-wider">Agents</h2>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{agents.length} Specialized Agents</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {agents.map(agent => {
            const Icon = AGENT_ICONS[agent.id] || Bot;
            const color = AGENT_COLORS[agent.id] || "from-slate-500/10 to-slate-600/5 border-slate-500/20";
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
                    ? "bg-indigo-500/10 border-indigo-500/20"
                    : "border-transparent hover:bg-slate-900/50 hover:border-slate-800"
                )}
              >
                <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center bg-slate-800")}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-white uppercase tracking-wider truncate">{agent.name}</p>
                  <p className="text-[9px] text-slate-500 font-medium truncate">{agent.purpose}</p>
                </div>
                <ArrowRight className={cn(
                  "w-3 h-3 text-slate-600 transition-transform",
                  expandedAgent === agent.id && "rotate-90 text-indigo-400"
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
            return (
              <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">Specialized Agent</p>
                    <h1 className="text-xl font-black text-white uppercase tracking-wider">{agent.name}</h1>
                    <p className="text-sm text-slate-400 font-medium mt-1">{agent.purpose}</p>
                  </div>
                </div>

                {/* Responsibilities */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Responsibilities</h3>
                  <div className="space-y-2">
                    {agent.responsibilities.map((r, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-sm text-slate-300 font-medium">{r}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tools */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Available Tools</h3>
                  <div className="flex flex-wrap gap-2">
                    {agent.tools.map((tool, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-lg bg-slate-900/50 border border-slate-800 text-[10px] font-bold text-slate-400">
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-left space-y-2 hover:bg-indigo-500/20 transition-all group">
                      <Play className="w-4 h-4 text-indigo-400" />
                      <p className="text-xs font-bold text-white">Execute {agent.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Run this agent on current context</p>
                    </button>
                    <button className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-left space-y-2 hover:bg-slate-900/80 transition-all group">
                      <Settings className="w-4 h-4 text-slate-400" />
                      <p className="text-xs font-bold text-white">Configure</p>
                      <p className="text-[10px] text-slate-400 font-medium">Adjust agent permissions and tools</p>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto">
                <Bot className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">Select an Agent</h3>
              <p className="text-xs text-slate-600 font-bold max-w-md">
                Choose a specialized agent from the sidebar to view its purpose, responsibilities, and available tools.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
