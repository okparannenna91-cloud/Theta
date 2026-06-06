"use client";

import React, { useState, useEffect } from "react";
import {
  Globe, CheckCircle2, XCircle, AlertTriangle, Search,
  ArrowRight, Info, Shield, Zap, Server, Database, Lock,
  Cpu, HardDrive, Mail, Wallet, Wifi, Cloud, Clock, Brain
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Service {
  name: string;
  provider: string;
  category: string;
  purpose: string;
  responsibilities: string[];
  fallback?: string;
}

interface EvalQuestion {
  question: string;
  description: string;
}

interface IntegrationData {
  approvedInfrastructure: Service[];
  evaluationQuestions: EvalQuestion[];
  disciplineRules: string[];
  totalServices: number;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  database: Database, auth: Lock, realtime: Wifi, memory: Brain,
  cache: Clock, ai: Cpu, storage: HardDrive, email: Mail,
  payments: Wallet, queue: Server,
};

const CATEGORY_COLORS: Record<string, string> = {
  database: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  auth: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  realtime: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
  memory: "text-violet-500 bg-violet-500/10 border-violet-500/20",
  cache: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  ai: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
  storage: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  email: "text-pink-500 bg-pink-500/10 border-pink-500/20",
  payments: "text-green-500 bg-green-500/10 border-green-500/20",
  queue: "text-orange-500 bg-orange-500/10 border-orange-500/20",
};

export function IntegrationManagement() {
  const [data, setData] = useState<IntegrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"infrastructure" | "evaluate" | "rules">("infrastructure");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  // Evaluation form state
  const [serviceName, setServiceName] = useState("");
  const [category, setCategory] = useState("");
  const [purpose, setPurpose] = useState("");
  const [evalResult, setEvalResult] = useState<{ approved: boolean; reason: string; priority: number } | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);

  useEffect(() => {
    fetch("/api/ai/integration")
      .then(r => r.json())
      .then(d => {
        setData({
          approvedInfrastructure: d?.approvedInfrastructure || [],
          evaluationQuestions: d?.evaluationQuestions || [],
          disciplineRules: d?.disciplineRules || [],
          totalServices: d?.totalServices || 0,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleEvaluate = async () => {
    if (!serviceName || !category || !purpose) return;
    setEvalLoading(true);
    setEvalResult(null);
    try {
      const res = await fetch("/api/ai/integration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceName, category, purpose }),
      });
      const result = await res.json();
      setEvalResult(result);
    } catch {
      setEvalResult({ approved: false, reason: "Failed to evaluate integration", priority: 0 });
    }
    setEvalLoading(false);
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

  const categories = [...new Set(data?.approvedInfrastructure.map(s => s.category) || [])];
  const filtered = (data?.approvedInfrastructure || []).filter(s => {
    const matchesFilter = !filterCategory || s.category === filterCategory;
    const matchesSearch = !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.purpose.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Globe className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Integration Rules</h1>
          <p className="text-sm text-muted-foreground">Section 19 — Infrastructure Governance</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["infrastructure", "evaluate", "rules"] as const).map(tab => (
          <Badge
            key={tab}
            variant={activeTab === tab ? "default" : "outline"}
            className="cursor-pointer text-xs rounded-md px-3 py-1"
            onClick={() => setActiveTab(tab)}
          >
            {tab === "infrastructure" && <Server className="w-3 h-3 inline mr-1.5" />}
            {tab === "evaluate" && <Zap className="w-3 h-3 inline mr-1.5" />}
            {tab === "rules" && <Shield className="w-3 h-3 inline mr-1.5" />}
            {tab}
          </Badge>
        ))}
      </div>

      {activeTab === "infrastructure" && (
        <>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search infrastructure..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-9 pl-9 text-xs"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge
                variant={filterCategory === null ? "default" : "outline"}
                className="cursor-pointer text-xs rounded-md px-3 py-1"
                onClick={() => setFilterCategory(null)}
              >
                All
              </Badge>
              {categories.map(cat => (
                <Badge
                  key={cat}
                  variant={filterCategory === cat ? "default" : "outline"}
                  className="cursor-pointer text-xs rounded-md px-3 py-1"
                  onClick={() => setFilterCategory(cat)}
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((svc, i) => {
              const Icon = CATEGORY_ICONS[svc.category] || Globe;
              const colorClass = CATEGORY_COLORS[svc.category] || "text-muted-foreground bg-muted border-border";
              return (
                <Card key={i} className="border shadow-sm hover:border-primary/30 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center border", colorClass)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-semibold">{svc.name}</CardTitle>
                          <CardDescription className="text-xs">{svc.provider}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs rounded-md px-2 py-0 h-5">
                        {svc.category}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground leading-relaxed">{svc.purpose}</p>
                    {svc.fallback && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Fallback: {svc.fallback}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {activeTab === "evaluate" && (
        <div className="max-w-2xl space-y-6">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Evaluate New Integration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Service Name</label>
                <Input
                  type="text"
                  value={serviceName}
                  onChange={e => setServiceName(e.target.value)}
                  placeholder="e.g., Supabase"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Purpose</label>
                <Input
                  type="text"
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  placeholder="e.g., Real-time database for task sync"
                  className="h-9 text-xs"
                />
              </div>
              <button
                onClick={handleEvaluate}
                disabled={!serviceName || !category || !purpose || evalLoading}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 w-full text-xs"
              >
                {evalLoading ? "Evaluating..." : "Evaluate"}
              </button>
            </CardContent>
          </Card>

          {evalResult && (
            <Card className={cn("border shadow-sm", evalResult.approved ? "border-emerald-500/30" : "border-rose-500/30")}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  {evalResult.approved
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    : <XCircle className="w-5 h-5 text-rose-500" />}
                  <span className={cn("text-sm font-semibold", evalResult.approved ? "text-emerald-500" : "text-rose-500")}>
                    {evalResult.approved ? "Approved" : "Rejected"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{evalResult.reason}</p>
                <p className="text-xs text-muted-foreground">Priority Level: {evalResult.priority}</p>
              </CardContent>
            </Card>
          )}

          {data?.evaluationQuestions && data.evaluationQuestions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Evaluation Questions</h3>
              {data.evaluationQuestions.map((q, i) => (
                <Card key={i} className="border shadow-sm hover:border-primary/30 transition-colors">
                  <CardContent className="p-4 flex items-start gap-3">
                    <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{q.question}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{q.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "rules" && (
        <div className="space-y-4">
          {data?.disciplineRules.map((rule, i) => (
            <Card key={i} className="border shadow-sm hover:border-primary/30 transition-colors">
              <CardContent className="p-4 flex items-start gap-3">
                <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">{rule}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
