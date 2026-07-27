"use client";

import { useMemo } from "react";

interface BurndownProps {
  totalTasks: number;
  completedTasks: number;
  weeksSinceStart: number;
}

export function BurndownChart({ totalTasks, completedTasks, weeksSinceStart }: BurndownProps) {
  const points = useMemo(() => {
    const w = 240;
    const h = 80;
    const pad = { top: 8, right: 8, bottom: 20, left: 8 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    const maxY = totalTasks || 1;
    const idealSlope = maxY / Math.max(weeksSinceStart, 1);

    const ideal: { x: number; y: number }[] = [];
    const actual: { x: number; y: number }[] = [];

    for (let ww = 0; ww < Math.max(weeksSinceStart, 2); ww++) {
      const x = pad.left + (ww / Math.max(weeksSinceStart - 1, 1)) * cw;
      const idealRemaining = maxY - idealSlope * ww;
      ideal.push({ x, y: pad.top + ch - (idealRemaining / maxY) * ch });

      const simulatedCompleted = ww === 0 ? 0 : Math.min(totalTasks, Math.round((completedTasks / Math.max(weeksSinceStart, 1)) * ww));
      const actualRemaining = maxY - simulatedCompleted;
      actual.push({ x, y: pad.top + ch - (Math.max(0, actualRemaining) / maxY) * ch });
    }

    const idealPath = ideal.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    const actualPath = actual.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

    return { idealPath, actualPath, w, h, pad, cw, ch, maxY, weeksSinceStart, completedTasks };
  }, [totalTasks, completedTasks, weeksSinceStart]);

  return (
    <svg
      viewBox={`0 0 ${points.w} ${points.h}`}
      className="w-full h-full"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = points.pad.top + points.ch - frac * points.ch;
        return (
          <line
            key={frac}
            x1={points.pad.left}
            y1={y}
            x2={points.pad.left + points.cw}
            y2={y}
            stroke="currentColor"
            className="text-border/20"
            strokeWidth="0.5"
          />
        );
      })}

      {/* Ideal line */}
      <path d={points.idealPath} stroke="currentColor" className="text-muted-foreground/20" strokeWidth="1" strokeDasharray="3,3" />

      {/* Actual line */}
      <path d={points.actualPath} stroke="currentColor" className="text-primary" strokeWidth="1.5" />

      {/* Current dot */}
      {(() => {
        const lastX = points.pad.left + points.cw;
        const remaining = Math.max(0, points.maxY - points.completedTasks);
        const lastY = points.pad.top + points.ch - (remaining / points.maxY) * points.ch;
        return (
          <circle cx={lastX} cy={lastY} r="2.5" className="fill-primary" stroke="white" strokeWidth="1.5" />
        );
      })()}

      {/* Axis labels */}
      <text x={points.pad.left} y={points.h - 4} className="fill-muted-foreground/30" fontSize="7" textAnchor="start">
        0
      </text>
      <text x={points.w - points.pad.right} y={points.h - 4} className="fill-muted-foreground/30" fontSize="7" textAnchor="end">
        {Math.max(points.weeksSinceStart, 1)}w
      </text>
      <text x={2} y={points.pad.top + 8} className="fill-muted-foreground/30" fontSize="7" textAnchor="start">
        {points.maxY}
      </text>
      <text x={2} y={points.pad.top + points.ch + 2} className="fill-muted-foreground/30" fontSize="7" textAnchor="start">
        0
      </text>
    </svg>
  );
}
