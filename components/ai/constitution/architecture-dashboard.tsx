"use client";

import React, { useState, useEffect } from "react";
import {
  Database, Lock, Zap, Mail, HardDrive,
  Brain, Clock, Cpu, Globe, AlertTriangle,
  Search, ArrowRight, Server, Wifi, Wallet
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

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  database: Database,
  auth: Lock,
  realtime: Wifi,
  memory: Brain,
  cache: Clock,
  ai: Cpu,
  storage: HardDrive,
  email: Mail,
  payments: Wallet,
  queue: Server,
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

export function ArchitectureDashboard() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/ai/constitution?section=5")
      .then(r => r.json())
      .then(data => {
        const servicesData = data?.data?.services || data?.data?.serviceRegistry || [];
        setServices(Array.isArray(servicesData) ? servicesData : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const categories = [...new Set(services.map(s => s.category))];

  const filtered = services.filter(s => {
    const matchesFilter = !filterCategory || s.category === filterCategory;
    const matchesSearch = !searchQuery || 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.purpose.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

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
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Server className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Architecture</h1>
            <p className="text-sm text-muted-foreground">{services.length} registered services</p>
          </div>
        </div>
        <div className="relative w-56">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-9 pl-9 text-xs"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
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
            className="cursor-pointer text-xs rounded-md px-3 py-1 flex items-center gap-1.5"
            onClick={() => setFilterCategory(cat)}
          >
            {React.createElement(CATEGORY_ICONS[cat] || Globe, { className: "w-3 h-3" })}
            {cat}
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((service, i) => {
          const Icon = CATEGORY_ICONS[service.category] || Globe;
          const colorClass = CATEGORY_COLORS[service.category] || "text-muted-foreground bg-muted border-border";
          return (
            <Card key={i} className="border shadow-sm hover:border-primary/30 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center border", colorClass)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">{service.name}</CardTitle>
                      <CardDescription className="text-xs">{service.provider}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs rounded-md px-2 py-0 h-5">
                    {service.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">{service.purpose}</p>
                <div>
                  <p className="text-xs font-medium text-foreground mb-1.5">Responsibilities</p>
                  {service.responsibilities.map((r, j) => (
                    <div key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
                {service.fallback && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Fallback: {service.fallback}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">No services match your filter.</p>
        </div>
      )}
    </div>
  );
}
