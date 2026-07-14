"use client";

import { useCallback, useEffect } from "react";
import { ZoomLevel, ZOOM_OPTIONS, GANTT_ZOOM_OPTIONS } from "./types";

interface ZoomControllerProps {
  zoomLevel: ZoomLevel;
  onZoomChange: (level: ZoomLevel) => void;
  variant?: "timeline" | "gantt";
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

export function ZoomController({ zoomLevel, onZoomChange, variant = "timeline", onZoomIn, onZoomOut }: ZoomControllerProps) {
  const options = variant === "gantt" ? GANTT_ZOOM_OPTIONS : ZOOM_OPTIONS;

  const zoomIn = useCallback(() => {
    const idx = options.findIndex(o => o.value === zoomLevel);
    if (idx > 0) onZoomChange(options[idx - 1].value);
  }, [zoomLevel, options, onZoomChange]);

  const zoomOut = useCallback(() => {
    const idx = options.findIndex(o => o.value === zoomLevel);
    if (idx < options.length - 1) onZoomChange(options[idx + 1].value);
  }, [zoomLevel, options, onZoomChange]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "=" || e.key === "+") { e.preventDefault(); zoomIn(); }
        if (e.key === "-") { e.preventDefault(); zoomOut(); }
        if (e.key === "0") { e.preventDefault(); onZoomChange("week"); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [zoomIn, zoomOut, onZoomChange]);

  return (
    <div className="flex bg-muted/50 p-0.5 rounded-md border">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onZoomChange(opt.value)}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            zoomLevel === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
