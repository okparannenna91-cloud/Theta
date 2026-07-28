"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

function formatDate(date: Date, fmt: string) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return fmt.replace("yyyy", String(y)).replace("MM", m).replace("dd", d);
}
import type { Column } from "./types";
import {
  STATUS_OPTIONS, PRIORITY_VALUES, PRIORITY_META,
  MEMBER_COLORS, LABEL_COLORS, COLOR_PALETTE,
} from "./constants";

export function StatusEditor({
  value, onSave, onCancel,
}: {
  value: any; onSave: (v: any) => void; onCancel: () => void;
}) {
  return (
    <div className="p-1 min-w-[140px]">
      <div className="flex flex-col gap-0.5">
        {STATUS_OPTIONS.map(s => (
          <button
            key={s.value}
            onClick={() => onSave(s.value)}
            className={cn(
              "flex items-center gap-3 px-2.5 py-1.5 rounded-md text-xs transition-all text-left",
              value === s.value
                ? "bg-accent font-medium"
                : "hover:bg-accent/50"
            )}
          >
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="capitalize">{s.label}</span>
            {value === s.value && <Check className="h-3 w-3 ml-auto text-foreground/40" strokeWidth={2} />}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PriorityEditor({
  value, onSave, onCancel,
}: {
  value: any; onSave: (v: any) => void; onCancel: () => void;
}) {
  return (
    <div className="p-1 min-w-[120px]">
      <div className="flex flex-col gap-0.5">
        {PRIORITY_VALUES.map(p => {
          const meta = PRIORITY_META[p];
          return (
            <button
              key={p}
              onClick={() => onSave(p)}
              className={cn(
                "flex items-center gap-3 px-2.5 py-1.5 rounded-md text-xs transition-all text-left capitalize",
                meta.text,
                value === p ? "bg-accent font-medium" : "hover:bg-accent/50"
              )}
            >
              <span className={cn("h-2 w-2 rounded-full shrink-0", meta.dot)} />
              <span>{meta.label}</span>
              {value === p && <Check className="h-3 w-3 ml-auto" strokeWidth={2} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AssigneeEditor({
  value, options, onSave, onCancel,
}: {
  value: any; options?: string[]; onSave: (v: any) => void; onCancel: () => void;
}) {
  const allMembers = (options || ["Alice", "Bob", "Charlie", "Diana"]).map(m => ({ id: m, name: m }));
  const [selected, setSelected] = useState<string[]>(Array.isArray(value) ? value : []);

  const toggleMember = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="p-1.5 min-w-[180px]">
      <div className="flex flex-wrap gap-1 mb-2 min-h-[22px]">
        {selected.map((id, i) => (
          <span key={id} className={cn("text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1.5 font-medium", MEMBER_COLORS[i % MEMBER_COLORS.length])}>
            {id}
            <button onClick={() => toggleMember(id)} className="hover:opacity-60 leading-none">✕</button>
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-0.5 max-h-[160px] overflow-auto">
        {allMembers.filter(m => !selected.includes(m.id)).map((m, i) => (
          <button key={m.id} onClick={() => toggleMember(m.id)}
            className={cn("flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs text-left transition-colors hover:bg-accent/50")}>
            <span className="h-5 w-5 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-[8px] font-semibold text-primary shrink-0">
              {m.name[0]?.toUpperCase()}
            </span>
            <span className="font-medium">{m.name}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/50">
        <Button size="sm" className="h-7 text-[11px] px-3 rounded-md" onClick={() => onSave(selected)}>Apply</Button>
        <Button variant="ghost" size="sm" className="h-7 text-[11px] px-3 rounded-md" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

export function DateEditor({
  value, onSave, onCancel,
}: {
  value: any; onSave: (v: any) => void; onCancel: () => void;
}) {
  const [dateStr, setDateStr] = useState(value ? (() => { try { return formatDate(new Date(value), "yyyy-MM-dd"); } catch { return ""; } })() : "");

  return (
    <div className="p-2 min-w-[200px]" onClick={e => e.stopPropagation()}>
      <input
        type="date"
        value={dateStr}
        onChange={e => setDateStr(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" && dateStr) { onSave(new Date(dateStr).toISOString()); }
          if (e.key === "Escape") onCancel();
        }}
        className="h-8 w-full text-xs rounded-md border border-input bg-background px-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        autoFocus
      />
      <div className="flex items-center gap-1.5 mt-2">
        <Button size="sm" className="h-7 text-[11px] px-3 rounded-md" onClick={() => dateStr ? onSave(new Date(dateStr).toISOString()) : onSave(null)}>
          {dateStr ? "Set" : "Clear"}
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-[11px] px-3 rounded-md" onClick={onCancel}>Cancel</Button>
        {value && (
          <Button variant="ghost" size="sm" className="h-7 text-[11px] px-3 rounded-md text-destructive ml-auto" onClick={() => onSave(null)}>
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}

export function LabelsEditor({
  value, options, onSave, onCancel,
}: {
  value: any; options?: string[]; onSave: (v: any) => void; onCancel: () => void;
}) {
  const allLabels = options || ["bug", "feature", "enhancement", "docs", "urgent", "design"];
  const [selected, setSelected] = useState<string[]>(Array.isArray(value) ? value.map(String) : []);

  const toggle = (l: string) => {
    setSelected(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);
  };

  return (
    <div className="p-1.5 min-w-[160px]">
      <div className="flex flex-wrap gap-1 mb-2 min-h-[20px]">
        {selected.map((l, i) => (
          <span key={l} className={cn("text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1.5 font-medium", LABEL_COLORS[i % LABEL_COLORS.length])}>
            {l}
            <button onClick={() => toggle(l)} className="hover:opacity-60 leading-none">✕</button>
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-0.5 max-h-[140px] overflow-auto">
        {allLabels.filter(l => !selected.includes(l)).map((l, i) => (
          <button key={l} onClick={() => toggle(l)}
            className={cn("flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs text-left transition-colors hover:bg-accent/50", LABEL_COLORS[i % LABEL_COLORS.length])}>
            + {l}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/50">
        <Button size="sm" className="h-7 text-[11px] px-3 rounded-md" onClick={() => onSave(selected)}>Apply</Button>
        <Button variant="ghost" size="sm" className="h-7 text-[11px] px-3 rounded-md" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

export function ProjectEditor({
  value, options, onSave, onCancel,
}: {
  value: any; options?: string[]; onSave: (v: any) => void; onCancel: () => void;
}) {
  const projects = (options || ["Marketing", "Engineering", "Design", "Sales", "HR"]).map(p => ({ id: p.toLowerCase().replace(/\s+/g, "-"), name: p }));
  const allProjects = [{ id: "", name: "No Project" }, ...projects];

  return (
    <div className="p-1 min-w-[140px]">
      <div className="flex flex-col gap-0.5 max-h-[180px] overflow-auto">
        {allProjects.map(p => (
          <button key={p.id} onClick={() => onSave(p.id)}
            className={cn("flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs text-left transition-colors hover:bg-accent/50",
              (value === p.id || (!value && !p.id)) && "bg-accent font-medium")}>
            {!p.id ? <span className="text-muted-foreground/30">—</span> : <span className="h-1.5 w-1.5 rounded-full bg-foreground/20" />}
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ProgressEditor({
  value, onSave, onCancel,
}: {
  value: any; onSave: (v: any) => void; onCancel: () => void;
}) {
  const [val, setVal] = useState(value ?? 0);

  return (
    <div className="flex items-center gap-3 p-2 min-w-[160px]">
      <input type="range" min="0" max="100" value={val}
        onChange={e => setVal(parseInt(e.target.value))}
        onMouseUp={() => onSave(val)}
        className="flex-1 h-1 accent-foreground/60 cursor-pointer" />
      <input type="number" min="0" max="100" value={val}
        onChange={e => setVal(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
        onKeyDown={e => { if (e.key === "Enter") onSave(val); if (e.key === "Escape") onCancel(); }}
        className="h-6 w-14 text-xs text-center rounded-md border border-input bg-background px-1 tabular-nums" />
      <span className="text-[11px] font-medium tabular-nums text-muted-foreground/70 w-8 text-right">{val}%</span>
    </div>
  );
}

export function NumberEditor({
  value, onSave, onCancel, inputRef,
}: {
  value: any; onSave: (v: any) => void; onCancel: () => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}) {
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef || localRef;
  const [val, setVal] = useState(value ?? "");

  useEffect(() => { setTimeout(() => ref.current?.focus(), 0); }, [ref]);

  return (
    <input ref={ref} type="number" value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => onSave(val === "" ? 0 : Number(val))}
      onKeyDown={e => {
        if (e.key === "Enter") onSave(val === "" ? 0 : Number(val));
        if (e.key === "Escape") onCancel();
      }}
      className="h-7 w-full text-xs bg-transparent border-b-2 border-foreground/20 outline-none px-1 text-center tabular-nums focus:border-foreground/40" />
  );
}

export function TextEditor({
  value, onSave, onCancel, inputRef,
}: {
  value: any; onSave: (v: any) => void; onCancel: () => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}) {
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef || localRef;
  const [val, setVal] = useState(value ?? "");

  useEffect(() => { setTimeout(() => ref.current?.focus(), 0); }, [ref]);

  return (
    <input ref={ref} type="text" value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => { if (val !== value) onSave(val); else onCancel(); }}
      onKeyDown={e => {
        if (e.key === "Enter") onSave(val);
        if (e.key === "Escape") onCancel();
        if (e.key === "Tab") { e.preventDefault(); onSave(val); }
      }}
      className="h-7 w-full text-xs bg-transparent border-b-2 border-foreground/20 outline-none px-1 focus:border-foreground/40" />
  );
}

export function BooleanEditor({
  value, onSave, onCancel,
}: {
  value: any; onSave: (v: any) => void; onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 p-1.5">
      <button onClick={() => onSave(!value)}
        className={cn("h-5 w-9 rounded-full transition-colors relative", value ? "bg-foreground/30" : "bg-muted")}>
        <div className={cn("h-4 w-4 rounded-full bg-white shadow-sm transition-all absolute top-0.5", value ? "left-[18px]" : "left-0.5")} />
      </button>
      <span className="text-[11px] text-muted-foreground/60">{value ? "Yes" : "No"}</span>
    </div>
  );
}

export function ColorEditor({
  value, onSave, onCancel,
}: {
  value: any; onSave: (v: any) => void; onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 p-1.5 min-w-[140px]">
      <div className="flex flex-wrap gap-1.5">
        {COLOR_PALETTE.map(c => (
          <button key={c || "none"} onClick={() => onSave(c)}
            className={cn("h-5 w-5 rounded-full border transition-all", value === c ? "ring-2 ring-foreground/30 ring-offset-1 scale-110" : "hover:scale-110")}
            style={c ? { backgroundColor: c } : { background: "linear-gradient(135deg, #e2e8f0 40%, #94a3b8 60%)" }} />
        ))}
      </div>
    </div>
  );
}

export function SprintMilestoneEditor({
  value, options, type, onSave, onCancel,
}: {
  value: any; options?: string[]; type: "sprint" | "milestone"; onSave: (v: any) => void; onCancel: () => void;
}) {
  const items = options || [type === "sprint" ? "Sprint 1" : "Q1 2024", type === "sprint" ? "Sprint 2" : "Q2 2024", "Backlog"];
  const allItems = [{ id: "", name: `No ${type === "sprint" ? "Sprint" : "Milestone"}` }, ...items.map(i => ({ id: i.toLowerCase().replace(/\s+/g, "-"), name: i }))];

  return (
    <div className="p-1 min-w-[140px]">
      <div className="flex flex-col gap-0.5 max-h-[160px] overflow-auto">
        {allItems.map(item => (
          <button key={item.id} onClick={() => onSave(item.id)}
            className={cn("flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs text-left transition-colors hover:bg-accent/50",
              value === item.id && "bg-accent font-medium")}>
            {!item.id ? <span className="text-muted-foreground/30">—</span> : <span className="h-1.5 w-1.5 rounded-full bg-foreground/20" />}
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function getEditorForColumn(col: Column, value: any, onSave: (v: any) => void, onCancel: () => void, inputRef?: React.RefObject<HTMLInputElement>) {
  switch (col.type) {
    case "status": return <StatusEditor value={value} onSave={onSave} onCancel={onCancel} />;
    case "priority": return <PriorityEditor value={value} onSave={onSave} onCancel={onCancel} />;
    case "assignee": return <AssigneeEditor value={value} options={col.options} onSave={onSave} onCancel={onCancel} />;
    case "date": case "dueDate": case "startDate": return <DateEditor value={value} onSave={onSave} onCancel={onCancel} />;
    case "labels": case "tags": return <LabelsEditor value={value} options={col.options} onSave={onSave} onCancel={onCancel} />;
    case "project": return <ProjectEditor value={value} options={col.options} onSave={onSave} onCancel={onCancel} />;
    case "progress": return <ProgressEditor value={value} onSave={onSave} onCancel={onCancel} />;
    case "number": case "estimate": case "storyPoints": return <NumberEditor value={value} onSave={onSave} onCancel={onCancel} inputRef={inputRef} />;
    case "boolean": return <BooleanEditor value={value} onSave={onSave} onCancel={onCancel} />;
    case "color": return <ColorEditor value={value} onSave={onSave} onCancel={onCancel} />;
    case "sprint": return <SprintMilestoneEditor value={value} options={col.options} type="sprint" onSave={onSave} onCancel={onCancel} />;
    case "milestone": return <SprintMilestoneEditor value={value} options={col.options} type="milestone" onSave={onSave} onCancel={onCancel} />;
    default: return <TextEditor value={value} onSave={onSave} onCancel={onCancel} inputRef={inputRef} />;
  }
}