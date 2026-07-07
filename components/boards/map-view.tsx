"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  MapPin, Globe, Navigation, ZoomIn, ZoomOut, Crosshair
} from "lucide-react";

interface MapViewProps {
  tasks: any[];
  columns: any[];
  onSelectTask?: (task: any) => void;
}

const COORDINATES: Record<string, { lat: number; lng: number }> = {
  "new york": { lat: 40.7128, lng: -74.006 },
  "london": { lat: 51.5074, lng: -0.1278 },
  "tokyo": { lat: 35.6762, lng: 139.6503 },
  "sydney": { lat: -33.8688, lng: 151.2093 },
  "berlin": { lat: 52.52, lng: 13.405 },
  "paris": { lat: 48.8566, lng: 2.3522 },
  "mumbai": { lat: 19.076, lng: 72.8777 },
  "shanghai": { lat: 31.2304, lng: 121.4737 },
  "san francisco": { lat: 37.7749, lng: -122.4194 },
  "los angeles": { lat: 34.0522, lng: -118.2437 },
  "chicago": { lat: 41.8781, lng: -87.6298 },
  "seattle": { lat: 47.6062, lng: -122.3321 },
  "austin": { lat: 30.2672, lng: -97.7431 },
  "toronto": { lat: 43.6532, lng: -79.3832 },
  "vancouver": { lat: 49.2827, lng: -123.1207 },
  "dubai": { lat: 25.2048, lng: 55.2708 },
  "singapore": { lat: 1.3521, lng: 103.8198 },
  "amsterdam": { lat: 52.3676, lng: 4.9041 },
  "barcelona": { lat: 41.3874, lng: 2.1686 },
  "rome": { lat: 41.9028, lng: 12.4964 },
  "beijing": { lat: 39.9042, lng: 116.4074 },
  "seoul": { lat: 37.5665, lng: 126.978 },
  "mexico city": { lat: 19.4326, lng: -99.1332 },
  "sao paulo": { lat: -23.5505, lng: -46.6333 },
  "delhi": { lat: 28.7041, lng: 77.1025 },
  "bangalore": { lat: 12.9716, lng: 77.5946 },
  "hong kong": { lat: 22.3193, lng: 114.1694 },
  "kuala lumpur": { lat: 3.139, lng: 101.6869 },
  "cape town": { lat: -33.9249, lng: 18.4241 },
  "lagos": { lat: 6.5244, lng: 3.3792 },
  "nairobi": { lat: -1.2921, lng: 36.8219 },
};

const MARKER_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
  "#14b8a6", "#84cc16", "#d946ef", "#0ea5e9",
];

export default function MapView({ tasks, columns, onSelectTask }: MapViewProps) {
  const [zoom, setZoom] = useState(1);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  const locations = useMemo(() => {
    const grouped = new Map<string, any[]>();
    tasks
      .filter((t: any) => t.location && t.location.trim())
      .forEach((t: any) => {
        const key = t.location.trim().toLowerCase();
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(t);
      });

    let colorIdx = 0;
    return Array.from(grouped.entries())
      .map(([key, taskList]) => {
        const coord = COORDINATES[key] || COORDINATES[key.split(",")[0]?.trim()];
        if (!coord) return null;
        const color = MARKER_COLORS[colorIdx++ % MARKER_COLORS.length];
        return {
          name: taskList[0].location.trim(),
          lat: coord.lat,
          lng: coord.lng,
          tasks: taskList,
          count: taskList.length,
          color,
        };
      })
      .filter(Boolean) as Array<{
        name: string;
        lat: number;
        lng: number;
        tasks: any[];
        count: number;
        color: string;
      }>;
  }, [tasks]);

  const unlocatedCount = tasks.filter((t: any) => !t.location || !t.location.trim()).length;
  const totalLocated = locations.reduce((sum, l) => sum + l.count, 0);

  const selectedTasks = selectedLocation
    ? locations.find((l) => l.name === selectedLocation)?.tasks || []
    : [];

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold">Map</h3>
          <p className="text-xs text-muted-foreground">
            {totalLocated} task{totalLocated !== 1 ? "s" : ""} across {locations.length} location{locations.length !== 1 ? "s" : ""}
            {unlocatedCount > 0 && ` (${unlocatedCount} unlocated)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded" onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}>
              <ZoomIn className="h-3 w-3" />
            </Button>
            <span className="flex items-center text-[10px] font-bold px-1">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded" onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}>
              <ZoomOut className="h-3 w-3" />
            </Button>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(1)}>
            <Crosshair className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        <div className="flex-1 relative rounded-2xl border bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 overflow-hidden">
          <div
            className="absolute inset-0 transition-transform duration-300"
            style={{ transform: `scale(${zoom})` }}
          >
            <div className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='%236366f1' stroke-width='0.5'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)'/%3E%3C/svg%3E")`,
              }}
            />

            {locations.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Globe className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">No tasks with locations</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Add a location to a task to see it on the map</p>
                </div>
              </div>
            )}

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
                      <span className="text-[9px] font-bold bg-card px-2 py-0.5 rounded-full shadow-sm border">
                        {loc.name} · {loc.count}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-card/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border shadow-sm">
              <Globe className="h-3 w-3" />
              Global View
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-card/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border shadow-sm">
              <MapPin className="h-3 w-3" />
              {totalLocated} located
            </div>
          </div>
        </div>

        <div className="w-72 flex-shrink-0 space-y-3 overflow-y-auto">
          <div className="text-[10px] font-bold text-muted-foreground mb-3">
            {selectedLocation ? "Tasks" : "Locations"}
          </div>
          {selectedLocation ? (
            selectedTasks.map((task: any) => (
              <Card key={task.id} className="p-3 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => onSelectTask?.(task)}>
                <p className="text-xs font-medium truncate">{task.title}</p>
                {task.dueDate && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(task.dueDate).toLocaleDateString()}
                  </p>
                )}
              </Card>
            ))
          ) : (
            locations.map((loc, i) => (
              <div
                key={i}
                className={cn(
                  "p-3 rounded-xl border transition-all cursor-pointer",
                  selectedLocation === loc.name
                    ? "border-primary bg-muted/50 dark:bg-primary/10"
                    : "hover:border-muted-foreground/20"
                )}
                onClick={() => setSelectedLocation(selectedLocation === loc.name ? null : loc.name)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: loc.color }} />
                    <span className="text-xs font-medium">{loc.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{loc.count} tasks</Badge>
                </div>
                <p className="text-[9px] text-muted-foreground">{loc.lat.toFixed(2)}, {loc.lng.toFixed(2)}</p>
              </div>
            ))
          )}
          {locations.length === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No locations found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
