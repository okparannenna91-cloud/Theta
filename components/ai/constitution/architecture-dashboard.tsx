"use client";

import React, { useState, useEffect } from "react";
import {
  Layers, Database, Lock, Zap, Mail, CreditCard, HardDrive,
  Brain, Clock, Cpu, Globe, CheckCircle2, XCircle, AlertTriangle,
  Search, ArrowRight, Server, Cloud, Wifi, Wallet
} from "lucide-react";
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
  database: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-400",
  auth: "from-rose-500/10 to-rose-600/5 border-rose-500/20 text-rose-400",
  realtime: "from-cyan-500/10 to-cyan-600/5 border-cyan-500/20 text-cyan-400",
  memory: "from-violet-500/10 to-violet-600/5 border-violet-500/20 text-violet-400",
  cache: "from-amber-500/10 to-amber-600/5 border-amber-500/20 text-amber-400",
  ai: "from-indigo-500/10 to-indigo-600/5 border-indigo-500/20 text-indigo-400",
  storage: "from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-400",
  email: "from-pink-500/10 to-pink-600/5 border-pink-500/20 text-pink-400",
  payments: "from-green-500/10 to-green-600/5 border-green-500/20 text-green-400",
  queue: "from-orange-500/10 to-orange-600/5 border-orange-500/20 text-orange-400",
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
      <div className="flex items-center justify-center h-[60vh]">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 animate-pulse mx-auto" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Infrastructure Map</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Server className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-wider">Architecture</h1>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Service Registry — {services.length} Services</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-48 pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
            />
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCategory(null)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all",
            !filterCategory
              ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
              : "bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-300"
          )}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all flex items-center gap-1.5",
              filterCategory === cat
                ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                : "bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-300"
            )}
          >
            {React.createElement(CATEGORY_ICONS[cat] || Globe, { className: "w-3 h-3" })}
            {cat}
          </button>
        ))}
      </div>

      {/* Service Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((service, i) => {
          const Icon = CATEGORY_ICONS[service.category] || Globe;
          const colorClass = CATEGORY_COLORS[service.category] || "from-slate-500/10 to-slate-600/5 border-slate-500/20 text-slate-400";
          return (
            <div
              key={i}
              className={cn(
                "rounded-2xl border p-5 bg-gradient-to-br space-y-4 transition-all hover:scale-[1.02] group",
                colorClass
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">{service.name}</h3>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{service.provider}</p>
                  </div>
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-slate-900/60 border border-slate-800 text-slate-500">
                  {service.category}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{service.purpose}</p>

              <div className="space-y-1.5">
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Responsibilities</span>
                {service.responsibilities.map((r, j) => (
                  <div key={j} className="flex items-center gap-2 text-[11px] text-slate-400">
                    <ArrowRight className="w-2.5 h-2.5 text-slate-600 shrink-0" />
                    <span className="font-medium">{r}</span>
                  </div>
                ))}
              </div>

              {service.fallback && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="text-[10px] font-bold text-amber-400">Fallback: {service.fallback}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <p className="text-xs font-bold text-slate-600">No services match your filter.</p>
        </div>
      )}
    </div>
  );
}
