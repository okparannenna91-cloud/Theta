"use client";

import React, { useState, useEffect } from "react";
import {
  Lock, Shield, AlertTriangle, CheckCircle2, XCircle, Users,
  Search, Clock, FileText, Eye, Slash, UserCheck, UserX,
  ArrowRight, Info, Ban, Siren
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PermissionMatrix {
  role: string;
  description: string;
  grants: Record<string, string[]>;
}

interface SecurityConfig {
  permissionMatrix: PermissionMatrix[];
  sensitiveActions: string[];
  aiRules: string[];
  auditRequirements: string[];
  priorityOrder: string[];
}

export function SecurityConsole() {
  const [config, setConfig] = useState<SecurityConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"matrix" | "rules" | "audit">("matrix");

  useEffect(() => {
    fetch("/api/ai/constitution?section=18")
      .then(r => r.json())
      .then(data => {
        const d = data?.data;
        setConfig({
          permissionMatrix: d?.permissionMatrix || [],
          sensitiveActions: d?.sensitiveActions || d?.sensitiveActions || [],
          aiRules: d?.aiRules || d?.aiSecurityRules || [],
          auditRequirements: d?.auditRequirements || d?.auditLoggingRequirements || [],
          priorityOrder: d?.priorityOrder || [],
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 animate-pulse mx-auto" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Security Console</p>
        </div>
      </div>
    );
  }

  const ROLE_COLORS: Record<string, string> = {
    owner: "from-rose-500/10 to-rose-600/5 border-rose-500/20 text-rose-400",
    admin: "from-amber-500/10 to-amber-600/5 border-amber-500/20 text-amber-400",
    member: "from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-400",
    guest: "from-slate-500/10 to-slate-600/5 border-slate-500/20 text-slate-400",
  };

  const allResources = [...new Set(
    config?.permissionMatrix.flatMap(m => Object.keys(m.grants)) || []
  )];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-wider">Security Console</h1>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Section 18 — Security Rules & Permissions</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["matrix", "rules", "audit"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all",
              activeTab === tab
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                : "bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-300"
            )}
          >
            {tab === "matrix" ? "Permission Matrix" : tab === "rules" ? "Security Rules" : "Audit Requirements"}
          </button>
        ))}
      </div>

      {activeTab === "matrix" && (
        <div className="space-y-6">
          {/* Role Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {config?.permissionMatrix.map((role, i) => {
              const colors = ROLE_COLORS[role.role] || "from-slate-500/10 to-slate-600/5 border-slate-500/20";
              return (
                <div
                  key={i}
                  onClick={() => setSelectedRole(selectedRole === role.role ? null : role.role)}
                  className={cn(
                    "rounded-2xl border p-4 bg-gradient-to-br cursor-pointer transition-all hover:scale-[1.02] space-y-3",
                    colors,
                    selectedRole === role.role && "ring-2 ring-rose-500/30"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-center">
                      {role.role === "owner" ? <UserCheck className="w-4 h-4" /> :
                       role.role === "admin" ? <Shield className="w-4 h-4" /> :
                       role.role === "member" ? <Users className="w-4 h-4" /> :
                       <Eye className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-xs font-black text-white uppercase tracking-wider">{role.role}</p>
                      <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest capitalize">
                        {Object.values(role.grants).flat().length} granted actions
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed min-h-[2.5em]">
                    {role.description.split(".")[0]}.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(role.grants).map(([res, actions]) => {
                      if (actions.length === 0) return null;
                      return (
                        <span key={res} className="text-[7px] font-bold px-1.5 py-0.5 rounded bg-slate-900/60 text-slate-500 uppercase">
                          {res}:{actions.join("/")}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Matrix Grid */}
          {selectedRole && (() => {
            const role = config?.permissionMatrix.find(r => r.role === selectedRole);
            if (!role) return null;
            return (
              <div className="space-y-3 animate-in fade-in duration-200">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  {role.role.toUpperCase()} — Detailed Permissions
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allResources.map(res => {
                    const actions = role.grants[res] || [];
                    return (
                      <div key={res} className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-white uppercase tracking-wider">{res}</span>
                          <span className={cn(
                            "text-[8px] font-black px-2 py-0.5 rounded",
                            actions.length > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-600"
                          )}>
                            {actions.length > 0 ? `${actions.length} actions` : "No access"}
                          </span>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {["read", "write", "delete", "admin", "billing"].map(action => (
                            <span
                              key={action}
                              className={cn(
                                "text-[8px] font-bold px-2 py-0.5 rounded uppercase",
                                actions.includes(action)
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-slate-800/50 text-slate-700 border border-slate-800"
                              )}
                            >
                              {actions.includes(action) ? <CheckCircle2 className="w-2.5 h-2.5 inline mr-0.5" /> : <XCircle className="w-2.5 h-2.5 inline mr-0.5" />}
                              {action}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === "rules" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sensitive Actions */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              Sensitive Actions (Require Confirmation)
            </h3>
            <div className="space-y-2">
              {config?.sensitiveActions.map((action, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                  <Ban className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="text-xs text-slate-300 font-medium">{action}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Security Rules */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" />
              AI Security Rules
            </h3>
            <div className="space-y-2">
              {config?.aiRules.map((rule, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                  <Siren className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs text-slate-300 font-medium">{rule}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Priority Order */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Security Priority Order</h3>
            <div className="flex gap-2">
              {config?.priorityOrder.map((item, i) => (
                <div key={i} className="flex-1 p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-center">
                  <span className="text-[9px] font-black text-slate-500 block">{i + 1}</span>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-600 font-medium text-center mt-2">
              Security always wins over convenience.
            </p>
          </div>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Audit Logging Requirements</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {config?.auditRequirements.map((req, i) => (
                <div key={i} className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex items-center gap-3">
                  <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="text-xs text-slate-300 font-medium">{req}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Log Preview */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Recent Audit Events (Simulated)</h3>
            <div className="space-y-2">
              {[
                { action: "USER_LOGGED_IN", user: "alice@theta.dev", time: "2 min ago", type: "auth" },
                { action: "TASK_CREATED", user: "bob@theta.dev", time: "15 min ago", type: "task" },
                { action: "WORKSPACE_CONFIG_CHANGED", user: "admin@theta.dev", time: "1 hr ago", type: "config" },
                { action: "MEMBER_INVITED", user: "carol@theta.dev", time: "3 hrs ago", type: "member" },
              ].map((event, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-900/30 border border-slate-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-wider bg-indigo-500/5 px-2 py-1 rounded">
                      {event.type}
                    </span>
                    <span className="text-xs font-bold text-white">{event.action}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    <span>{event.user}</span>
                    <span>{event.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
