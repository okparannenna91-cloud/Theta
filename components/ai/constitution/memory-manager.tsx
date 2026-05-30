"use client";

import React, { useState, useEffect } from "react";
import { Brain, Trash2, RefreshCw, Clock, Database, CheckCircle2, XCircle, Info, AlertTriangle, Settings, ToggleLeft, ToggleRight } from "lucide-react";
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
      <div className="flex items-center justify-center h-[60vh]">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 animate-pulse mx-auto" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Memory System</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-wider">Memory System</h1>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Section 7 — Nova Memory Infrastructure</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMemoryEnabled(!memoryEnabled)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all",
              memoryEnabled
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-slate-900/50 border-slate-800 text-slate-500"
            )}
          >
            {memoryEnabled ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
            {memoryEnabled ? "Enabled" : "Disabled"}
          </button>
          {memories.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-wider hover:bg-red-500/20 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("memories")}
          className={cn(
            "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all",
            activeTab === "memories"
              ? "bg-violet-500/10 border-violet-500/30 text-violet-400"
              : "bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-300"
          )}
        >
          Memories ({memories.length})
        </button>
        <button
          onClick={() => setActiveTab("config")}
          className={cn(
            "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all",
            activeTab === "config"
              ? "bg-violet-500/10 border-violet-500/30 text-violet-400"
              : "bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-300"
          )}
        >
          Configuration
        </button>
      </div>

      {activeTab === "memories" ? (
        <>
          {/* Add Memory */}
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Key</label>
              <input
                type="text"
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                placeholder="e.g., writing_style"
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50"
              />
            </div>
            <div className="flex-[2] space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Value</label>
              <input
                type="text"
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                placeholder="e.g., Use bullet points for task descriptions"
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50"
                onKeyDown={e => e.key === "Enter" && handleAddMemory()}
              />
            </div>
            <button
              onClick={handleAddMemory}
              disabled={!newKey || !newValue}
              className="px-4 py-2 rounded-lg bg-violet-600 text-white text-[9px] font-black uppercase tracking-wider hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Save
            </button>
          </div>

          {/* Memory List */}
          <div className="space-y-2">
            {memories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Brain className="w-8 h-8 text-slate-700 mb-3" />
                <p className="text-xs font-bold text-slate-600">No memories stored yet</p>
                <p className="text-[10px] text-slate-700 mt-1">Add a memory above to help Nova learn your preferences</p>
              </div>
            ) : (
              memories.map((mem, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800 rounded-xl group hover:border-violet-500/20 transition-all">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-violet-400 uppercase tracking-wider">{mem.key}</span>
                      <span className="text-[8px] font-bold text-slate-600 uppercase px-1.5 py-0.5 rounded bg-slate-800">{mem.type}</span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium truncate">{mem.content}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteMemory(mem.key)}
                    className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
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
              <div key={i} className="p-4 bg-slate-900/30 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <stat.icon className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{stat.label}</span>
                </div>
                <p className="text-xs font-bold text-slate-300">{stat.value}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Configuration View */
        <div className="space-y-8">
          {/* Memory Tiers */}
          {config?.tiers && config.tiers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Memory Tiers</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {config.tiers.map((tier, i) => (
                  <div key={i} className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white uppercase tracking-wider">{tier.tier}</span>
                      <span className="text-[8px] font-bold text-slate-600">{tier.storage}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">{tier.purpose}</p>
                    <div className="space-y-1">
                      {tier.examples.map((ex, j) => (
                        <div key={j} className="text-[10px] text-slate-500 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-slate-600" />
                          {ex}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Memory Types */}
          {config?.types && config.types.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Memory Types</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {config.types.map((t, i) => (
                  <div key={i} className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider mb-1">{t.type}</h4>
                    <p className="text-[10px] text-slate-400 font-medium mb-2">{t.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {t.examples.map((ex, j) => (
                        <span key={j} className="text-[8px] font-bold text-slate-500 px-2 py-0.5 rounded-md bg-slate-800/50 border border-slate-800">
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Memory Rules */}
          {config?.rules && config.rules.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Memory Rules</h3>
              <div className="space-y-2">
                {config.rules.map((rule, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-900/30 border border-slate-800/80">
                    <Info className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                    <span className="text-xs text-slate-300 font-medium">{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Controls */}
          {config?.userControls && config.userControls.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">User Controls</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {config.userControls.map((ctrl, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-900/30 border border-slate-800/80">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-xs text-slate-300 font-medium">{ctrl}</span>
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
