"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MapViewProps {
  tasks: any[];
  columns: any[];
  onSelectTask?: (task: any) => void;
}

const KNOWN_COORDINATES: Record<string, { lat: number; lng: number }> = {
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

const dynamicCoordsRef: Record<string, { lat: number; lng: number }> = {};

const LeafletMap = dynamic(
  () => import("@/components/boards/leaflet-map"),
  { ssr: false }
);

export default function MapView({ tasks, columns, onSelectTask }: MapViewProps) {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const fetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unknown = tasks
      .filter((t: any) => t.location && t.location.trim())
      .map((t: any) => t.location.trim().toLowerCase())
      .filter((key: string) => {
        const base = key.split(",")[0]?.trim();
        return !KNOWN_COORDINATES[key] && !KNOWN_COORDINATES[base] && !dynamicCoordsRef[key] && !fetchedRef.current.has(key);
      });

    if (unknown.length === 0) return;

    setGeocoding(true);
    const uniqueKeys = [...new Set(unknown)];

    Promise.allSettled(
      uniqueKeys.map(async (key: string) => {
        fetchedRef.current.add(key);
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(key)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.lat && data.lng) {
          dynamicCoordsRef[key] = { lat: data.lat, lng: data.lng };
        }
      })
    ).finally(() => setGeocoding(false));
  }, [tasks]);

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
        const coord = KNOWN_COORDINATES[key] || KNOWN_COORDINATES[key.split(",")[0]?.trim()] || dynamicCoordsRef[key];
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
  }, [tasks, geocoding]);

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
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        <div className="flex-1 relative rounded-2xl border overflow-hidden">
          <LeafletMap
            locations={locations}
            selectedLocation={selectedLocation}
            onSelectLocation={setSelectedLocation}
          />
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
