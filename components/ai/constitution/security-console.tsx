"use client";

import React, { useState, useEffect } from "react";
import {
  Lock, Shield, AlertTriangle, CheckCircle2, XCircle, Users,
  Search, Clock, FileText, Eye, Slash, UserCheck, UserX,
  ArrowRight, Info, Ban, Siren
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="space-y-4 text-center">
          <Skeleton className="h-10 w-10 rounded-lg mx-auto" />
          <Skeleton className="h-4 w-44" />
        </div>
      </div>
    );
  }

  const ROLE_COLORS: Record<string, string> = {
    owner: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    admin: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    member: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    guest: "text-slate-500 bg-muted border-border",
  };

  const ROLE_ICONS: Record<string, React.ElementType> = {
    owner: UserCheck,
    admin: Shield,
    member: Users,
    guest: Eye,
  };

  const allResources = [...new Set(
    config?.permissionMatrix.flatMap(m => Object.keys(m.grants)) || []
  )];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Security Console</h1>
            <p className="text-sm text-muted-foreground">Section 18 — Security Rules & Permissions</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["matrix", "rules", "audit"] as const).map(tab => (
          <Badge
            key={tab}
            variant={activeTab === tab ? "default" : "outline"}
            className="cursor-pointer text-xs rounded-md px-3 py-1"
            onClick={() => setActiveTab(tab)}
          >
            {tab === "matrix" ? "Permission Matrix" : tab === "rules" ? "Security Rules" : "Audit Requirements"}
          </Badge>
        ))}
      </div>

      {activeTab === "matrix" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {config?.permissionMatrix.map((role, i) => {
              const colors = ROLE_COLORS[role.role] || "text-muted-foreground bg-muted border-border";
              const Icon = ROLE_ICONS[role.role] || Shield;
              return (
                <Card
                  key={i}
                  className={cn(
                    "border shadow-sm hover:border-primary/30 transition-colors cursor-pointer",
                    selectedRole === role.role && "ring-2 ring-primary/30"
                  )}
                  onClick={() => setSelectedRole(selectedRole === role.role ? null : role.role)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border", colors)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold capitalize">{role.role}</CardTitle>
                        <CardDescription className="text-xs">
                          {Object.values(role.grants).flat().length} granted actions
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {role.description.split(".")[0]}.
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(role.grants).map(([res, actions]) => {
                        if (actions.length === 0) return null;
                        return (
                          <Badge key={res} variant="outline" className="text-[10px] rounded-md px-1.5 py-0 h-5">
                            {res}:{actions.join("/")}
                          </Badge>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {selectedRole && (() => {
            const role = config?.permissionMatrix.find(r => r.role === selectedRole);
            if (!role) return null;
            return (
              <div className="space-y-3 animate-in fade-in duration-200">
                <h3 className="text-sm font-semibold text-foreground">
                  {role.role.charAt(0).toUpperCase() + role.role.slice(1)} — Detailed Permissions
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allResources.map(res => {
                    const actions = role.grants[res] || [];
                    return (
                      <Card key={res} className="border shadow-sm hover:border-primary/30 transition-colors">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold capitalize">{res}</CardTitle>
                            <Badge
                              variant={actions.length > 0 ? "default" : "outline"}
                              className="text-[10px] rounded-md px-2 py-0 h-5"
                            >
                              {actions.length > 0 ? `${actions.length} actions` : "No access"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex gap-1.5 flex-wrap">
                            {["read", "write", "delete", "admin", "billing"].map(action => {
                              const hasAction = actions.includes(action);
                              return (
                                <Badge
                                  key={action}
                                  variant={hasAction ? "default" : "outline"}
                                  className="text-[10px] rounded-md px-2 py-0 h-5"
                                >
                                  {hasAction ? <CheckCircle2 className="w-2.5 h-2.5 inline mr-0.5" /> : <XCircle className="w-2.5 h-2.5 inline mr-0.5" />}
                                  {action}
                                </Badge>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
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
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-rose-500 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Sensitive Actions (Require Confirmation)
            </h3>
            <div className="space-y-2">
              {config?.sensitiveActions.map((action, i) => (
                <Card key={i} className="border shadow-sm hover:border-primary/30 transition-colors">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Ban className="w-4 h-4 text-rose-500 shrink-0" />
                    <span className="text-sm text-muted-foreground">{action}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-amber-500 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              AI Security Rules
            </h3>
            <div className="space-y-2">
              {config?.aiRules.map((rule, i) => (
                <Card key={i} className="border shadow-sm hover:border-primary/30 transition-colors">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Siren className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-sm text-muted-foreground">{rule}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Security Priority Order</h3>
            <div className="flex gap-2">
              {config?.priorityOrder.map((item, i) => (
                <Card key={i} className="flex-1 border shadow-sm hover:border-primary/30 transition-colors">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">{i + 1}</p>
                    <p className="text-sm font-medium text-foreground">{item}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Security always wins over convenience.
            </p>
          </div>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Audit Logging Requirements</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {config?.auditRequirements.map((req, i) => (
                <Card key={i} className="border shadow-sm hover:border-primary/30 transition-colors">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span className="text-sm text-muted-foreground">{req}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Recent Audit Events (Simulated)</h3>
            <div className="space-y-2">
              {[
                { action: "USER_LOGGED_IN", user: "alice@theta.dev", time: "2 min ago", type: "auth" },
                { action: "TASK_CREATED", user: "bob@theta.dev", time: "15 min ago", type: "task" },
                { action: "WORKSPACE_CONFIG_CHANGED", user: "admin@theta.dev", time: "1 hr ago", type: "config" },
                { action: "MEMBER_INVITED", user: "carol@theta.dev", time: "3 hrs ago", type: "member" },
              ].map((event, i) => (
                <Card key={i} className="border shadow-sm hover:border-primary/30 transition-colors">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[10px] rounded-md px-2 py-0 h-5 text-indigo-500 border-indigo-500/20">
                        {event.type}
                      </Badge>
                      <span className="text-sm font-medium text-foreground">{event.action}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{event.user}</span>
                      <span>{event.time}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
