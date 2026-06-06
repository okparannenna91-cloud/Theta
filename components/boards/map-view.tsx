"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  MapPin, Globe, Navigation, Users,
  Search, Filter, ZoomIn, ZoomOut,
  Layers, Crosshair
} from "lucide-react";

interface MapViewProps {
  tasks: any[];
  columns: any[];
}

const MOCK_LOCATIONS = [
  { name: "New York", lat: 40.7128, lng: -74.006, tasks: 12, color: "#6366f1" },
  { name: "London", lat: 51.5074, lng: -0.1278, tasks: 8, color: "#f59e0b" },
  { name: "Tokyo", lat: 35.6762, lng: 139.6503, tasks: 5, color: "#10b981" },
  { name: "Sydney", lat: -33.8688, lng: 151.2093, tasks: 3, color: "#ef4444" },
  { name: "Berlin", lat: 52.52, lng: 13.405, tasks: 6, color: "#8b5cf6" },
  { name: "São Paulo", lat: -23.5505, lng: -46.6333, tasks: 4, color: "#ec4899" },
  { name: "Dubai", lat: 25.2048, lng: 55.2708, tasks: 7, color: "#06b6d4" },
  { name: "Singapore", lat: 1.3521, lng: 103.8198, tasks: 9, color: "#f97316" },
];

export default function MapView({ tasks, columns }: MapViewProps) {
  const [zoom, setZoom] = useState(1);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  const locations = MOCK_LOCATIONS.map(loc => ({
    ...loc,
    tasks: loc.tasks,
  }));

  const totalTasks = locations.reduce((sum, l) => sum + l.tasks, 0);
  const taskLocations = tasks.filter(t => t.location).length;

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold">Map</h3>
          <p className="text-xs text-muted-foreground">{totalTasks} items across {locations.length} locations</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded" onClick={() => setZoom(z => Math.min(z + 0.25, 3))}>
              <ZoomIn className="h-3 w-3" />
            </Button>
            <span className="flex items-center text-[10px] font-bold px-1">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded" onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}>
              <ZoomOut className="h-3 w-3" />
            </Button>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Crosshair className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        <div className="flex-1 relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 overflow-hidden">
          <div
            className="absolute inset-0 transition-transform duration-300"
            style={{ transform: `scale(${zoom})` }}
          >
            <div className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='%236366f1' stroke-width='0.5'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)'/%3E%3C/svg%3E")`,
              }}
            />

            {locations.map((loc, i) => {
              const x = ((loc.lng + 180) / 360) * 100;
              const y = ((90 - loc.lat) / 180) * 100;
              const isSelected = selectedLocation === loc.name;

              return (
                <div
                  key={i}
                  className="absolute cursor-pointer transition-all group"
                  style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
                  onClick={() => setSelectedLocation(isSelected ? null : loc.name)}
                >
                  <div className={cn(
                    "relative flex items-center justify-center transition-all duration-300",
                    isSelected ? "scale-150 z-10" : "hover:scale-125"
                  )}>
                    <div
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900",
                        isSelected ? "ring-4 ring-primary/40" : ""
                      )}
                      style={{ backgroundColor: loc.color + "20" }}
                    >
                      <MapPin className="h-4 w-4" style={{ color: loc.color }} />
                    </div>
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <span className="text-[9px] font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full shadow-sm border border-slate-200 dark:border-slate-800">
                        {loc.name} · {loc.tasks}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border shadow-sm">
              <Globe className="h-3 w-3" />
              Global View
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border shadow-sm">
              <MapPin className="h-3 w-3" />
              {taskLocations} with coordinates
            </div>
          </div>
        </div>

        <div className="w-72 flex-shrink-0 space-y-3 overflow-y-auto">
          <div className="text-[10px] font-bold text-slate-500 mb-3">Locations</div>
          {locations.map((loc, i) => (
            <div
              key={i}
              className={cn(
                "p-3 rounded-xl border transition-all cursor-pointer",
                selectedLocation === loc.name
                  ? "border-primary bg-muted/50 dark:bg-primary/10"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
              )}
              onClick={() => setSelectedLocation(selectedLocation === loc.name ? null : loc.name)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: loc.color }} />
                  <span className="text-xs font-medium">{loc.name}</span>
                </div>
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{loc.tasks} tasks</Badge>
              </div>
              <p className="text-[9px] text-slate-400">{loc.lat.toFixed(2)}, {loc.lng.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
