"use client";

import React, { useState, useEffect } from "react";
import {
  Brain, Trash2, RefreshCw, Clock, Database, CheckCircle2, XCircle, Info, AlertTriangle, Settings, ToggleLeft, ToggleRight
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MemoryEntry {
  key: string;
  content: string;
  type: string;
  updatedAt?: string;
}

interface MemoryConfig {
  tiers: Array<{ tier: string; storage: string; purpose: string; examples: string[] }>;
  types: Array<{ type: string; description: string; examples: string[] }>;
  rules: string[];
  userControls: string[];
}

export function MemoryManager() {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [config, setConfig] = useState<MemoryConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<"memories" | "config">("memories");
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/ai/constitution?section=7").then(r => r.json()),
    ])
      .then(([sectionData]) => {
        const d = sectionData?.data;
        setConfig({
          tiers: d?.tiers || [],
          types: d?.memoryTypes || d?.types || [],
          rules: d?.rules || [],
          userControls: d?.userControls || [],
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleAddMemory = async () => {
    if (!newKey || !newValue) return;
    setMemories(prev => [...prev, { key: newKey, content: newValue, type: "USER" }]);
    setNewKey("");
    setNewValue("");
  };

  const handleDeleteMemory = (key: string) => {
    setMemories(prev => prev.filter(m => m.key !== key));
  };

  const handleClearAll = () => {
    if (confirm("Clear all stored memories?")) {
      setMemories([]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="space-y-4 text-center">
          <Skeleton className="h-10 w-10 rounded-lg mx-auto" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Memory System</h1>
            <p className="text-sm text-muted-foreground">Section 7 — Nova Memory Infrastructure</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMemoryEnabled(!memoryEnabled)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
              memoryEnabled
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                : "bg-muted border-border text-muted-foreground"
            )}
          >
            {memoryEnabled ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
            {memoryEnabled ? "Enabled" : "Disabled"}
          </button>
          {memories.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium hover:bg-red-500/20 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Badge
          variant={activeTab === "memories" ? "default" : "outline"}
          className="cursor-pointer text-xs rounded-md px-3 py-1"
          onClick={() => setActiveTab("memories")}
        >
          Memories ({memories.length})
        </Badge>
        <Badge
          variant={activeTab === "config" ? "default" : "outline"}
          className="cursor-pointer text-xs rounded-md px-3 py-1"
          onClick={() => setActiveTab("config")}
        >
          Configuration
        </Badge>
      </div>

      {activeTab === "memories" ? (
        <>
          {/* Add Memory */}
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Key</label>
              <Input
                type="text"
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                placeholder="e.g., writing_style"
                className="h-9 text-xs"
              />
            </div>
            <div className="flex-[2] space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Value</label>
              <Input
                type="text"
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                placeholder="e.g., Use bullet points for task descriptions"
                className="h-9 text-xs"
                onKeyDown={e => e.key === "Enter" && handleAddMemory()}
              />
            </div>
            <button
              onClick={handleAddMemory}
              disabled={!newKey || !newValue}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Save
            </button>
          </div>

          {/* Memory List */}
          <div className="space-y-2">
            {memories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Brain className="w-8 h-8 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No memories stored yet</p>
                <p className="text-xs text-muted-foreground mt-1">Add a memory above to help Nova learn your preferences</p>
              </div>
            ) : (
              memories.map((mem, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-muted border border-border rounded-lg group hover:border-primary/30 transition-all">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{mem.key}</span>
                      <Badge variant="outline" className="text-[10px] rounded-md px-1.5 py-0 h-4">{mem.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{mem.content}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteMemory(mem.key)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Memory Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Long-Term Storage", value: "Mem0 + Prisma", icon: Database },
              { label: "Short-Term Storage", value: "Redis (24hr TTL)", icon: Clock },
              { label: "Total Memories", value: String(memories.length), icon: Brain },
            ].map((stat, i) => (
              <Card key={i} className="border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <stat.icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        /* Configuration View */
        <div className="space-y-8">
          {/* Memory Tiers */}
          {config?.tiers && config.tiers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Memory Tiers</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {config.tiers.map((tier, i) => (
                  <Card key={i} className="border shadow-sm">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">{tier.tier}</span>
                        <span className="text-xs text-muted-foreground">{tier.storage}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{tier.purpose}</p>
                      <div className="space-y-1">
                        {tier.examples.map((ex, j) => (
                          <div key={j} className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                            {ex}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Memory Types */}
          {config?.types && config.types.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Memory Types</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {config.types.map((t, i) => (
                  <Card key={i} className="border shadow-sm">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold text-foreground mb-1">{t.type}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{t.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {t.examples.map((ex, j) => (
                          <span key={j} className="text-xs text-muted-foreground px-2 py-0.5 rounded-md bg-muted border border-border">
                            {ex}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Memory Rules */}
          {config?.rules && config.rules.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Memory Rules</h3>
              <div className="space-y-2">
                {config.rules.map((rule, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-muted border border-border">
                    <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-sm text-muted-foreground">{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Controls */}
          {config?.userControls && config.userControls.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">User Controls</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {config.userControls.map((ctrl, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-muted border border-border">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="text-sm text-muted-foreground">{ctrl}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
