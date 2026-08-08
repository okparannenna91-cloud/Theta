"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { Database, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DateField } from "@/components/ui/date-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspaceMembers } from "@/hooks/use-workspace-members";
import { invalidateTaskCaches } from "@/lib/invalidate-task-caches";

type Field = {
  id: string;
  name: string;
  type: string;
  boardId: string;
  settings: Record<string, any> | null;
  order: number;
  width: number;
  visible: boolean;
  pinned: boolean;
};

function normalizeLabel(s: string): string {
  return s.toLowerCase().replace(/[_-]/g, " ").trim();
}

function optionList(raw: unknown): { label: string; color?: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((o) => {
    if (typeof o === "string" || typeof o === "number") return { label: String(o) };
    if (o && typeof o === "object") {
      const rec = o as Record<string, any>;
      return {
        label: String(rec.label ?? rec.name ?? rec.id ?? ""),
        color: typeof rec.color === "string" ? rec.color : undefined,
      };
    }
    return { label: String(o) };
  });
}

function fieldOptions(settings: Record<string, any> | null): { label: string; color?: string }[] {
  const base = optionList(settings?.options).concat(optionList(settings?.statusOptions));
  const seen = new Set<string>();
  return base.filter((o) => {
    const key = normalizeLabel(o.label);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function formatSeconds(sec: number): string {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

export function formatFieldValue(
  field: Field,
  value: any,
  memberMap?: Record<string, any>
): { text: string; color?: string } | null {
  if (value === "" || value == null) return null;
  switch (field.type) {
    case "checkbox":
      return value ? { text: "✓" } : null;
    case "date": {
      const d = new Date(value);
      if (isNaN(d.getTime())) return null;
      return { text: format(d, "MMM d") };
    }
    case "dropdown":
    case "status": {
      const opts = fieldOptions(field.settings);
      const idx = opts.findIndex((o) => normalizeLabel(o.label) === normalizeLabel(String(value)));
      return {
        text: String(value).replace(/[_-]/g, " "),
        color: idx >= 0 ? opts[idx].color : undefined,
      };
    }
    case "people": {
      const ids = Array.isArray(value) ? value : [value];
      const names = ids.slice(0, 2).map((id: string) => memberMap?.[id]?.name || id);
      if (ids.length > 2) names.push(`+${ids.length - 2}`);
      return { text: names.join(", ") };
    }
    case "number":
    case "vote":
    case "autoNumber":
      return { text: String(value) };
    case "rating":
      return { text: "★".repeat(Math.max(1, Math.min(5, Number(value)))) };
    case "progress":
      return { text: `${value}%` };
    case "timeTracking":
      return { text: formatSeconds(Number(value)) };
    case "colorPicker":
      return { text: "", color: String(value) };
    case "files":
      return {
        text: Array.isArray(value)
          ? `${value.length} file${value.length > 1 ? "s" : ""}`
          : String(value),
      };
    case "location": {
      const loc = value as any;
      if (loc && typeof loc.lat === "number" && typeof loc.lng === "number") {
        return { text: `${Number(loc.lat).toFixed(3)}, ${Number(loc.lng).toFixed(3)}` };
      }
      return null;
    }
    case "link":
    case "email":
    case "phone":
    case "text":
    case "formula":
    default:
      return { text: String(value) };
  }
}

export function CustomFieldBadges({
  fields,
  task,
  memberMap,
  limit = 3,
}: {
  fields: Field[];
  task: any;
  memberMap?: Record<string, any>;
  limit?: number;
}) {
  const badges = useMemo(() => {
    const fv = task?.fieldValues || {};
    const withValue = (fields || [])
      .map((f) => ({ f, fmt: formatFieldValue(f, fv[f.id], memberMap) }))
      .filter((x): x is { f: Field; fmt: NonNullable<ReturnType<typeof formatFieldValue>> } => Boolean(x.fmt));
    const sorted = withValue.sort((a, b) => {
      const pa = a.f.pinned ? 0 : 1;
      const pb = b.f.pinned ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return (a.f.order || 0) - (b.f.order || 0);
    });
    return sorted.slice(0, limit);
  }, [fields, task, memberMap, limit]);

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {badges.map(({ f, fmt }) => (
        <span
          key={f.id}
          title={f.name}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium leading-tight border border-border/50 bg-muted/40"
          style={
            fmt.color
              ? { color: fmt.color, borderColor: `${fmt.color}33`, backgroundColor: `${fmt.color}14` }
              : undefined
          }
        >
          {f.type === "colorPicker" && fmt.color ? (
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: fmt.color }} />
          ) : null}
          <span className="max-w-[90px] truncate">{fmt.text || f.name}</span>
        </span>
      ))}
    </div>
  );
}

function CommitInput({
  value,
  onChange,
  type = "text",
  placeholder,
  className,
}: {
  value: any;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState<string>(
    value == null ? "" : typeof value === "string" ? value : String(value)
  );
  useEffect(() => {
    setDraft(value == null ? "" : typeof value === "string" ? value : String(value));
  }, [value]);
  return (
    <Input
      type={type}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onChange(draft)}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      className={cn("h-9 bg-background border rounded-lg text-xs shadow-sm", className)}
    />
  );
}

function ChipToggle({
  label,
  selected,
  color,
  onToggle,
}: {
  label: string;
  selected: boolean;
  color?: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border transition-colors",
        selected ? "border-primary/50 bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/30"
      )}
      style={selected && color ? { borderColor: `${color}55`, backgroundColor: `${color}18` } : undefined}
    >
      {color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
      {label}
    </button>
  );
}

function SingleSelectField({
  value,
  options,
  colors,
  onClearLabel = "—",
  onSelect,
}: {
  value: any;
  options: { label: string; color?: string }[];
  colors?: (string | undefined)[];
  onClearLabel?: string;
  onSelect: (label: string | null) => void;
}) {
  const selected = value ? String(value) : "__clear__";
  return (
    <Select
      value={selected}
      onValueChange={(v) => onSelect(v === "__clear__" ? null : v)}
    >
      <SelectTrigger className="h-9 bg-background border rounded-lg text-xs shadow-sm hover:border-primary/30 transition-colors">
        <SelectValue placeholder="—" />
      </SelectTrigger>
      <SelectContent className="bg-background/95 border rounded-lg p-1">
        <SelectItem value="__clear__" className="rounded-md text-xs p-2 cursor-pointer text-muted-foreground">
          {onClearLabel}
        </SelectItem>
        {options.map((o, i) => (
          <SelectItem
            key={o.label}
            value={o.label}
            className="rounded-md text-xs p-2 cursor-pointer"
          >
            <span className="inline-flex items-center gap-1.5">
              {(colors?.[i] || o.color) && (
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors?.[i] || o.color }} />
              )}
              {o.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function TimeTrackingEditor({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const secs = Number(value) || 0;
  const [draft, setDraft] = useState<string>(secs > 0 ? (secs / 3600).toFixed(1) : "");
  useEffect(() => {
    const s = Number(value) || 0;
    setDraft(s > 0 ? (s / 3600).toFixed(1) : "");
  }, [value]);
  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        step="0.5"
        value={draft}
        placeholder="0.0"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => {
          if (e.target.value.trim() === "") return onChange(null);
          const h = Number(e.target.value);
          if (isNaN(h)) return;
          onChange(Math.round(h * 3600));
        }}
        className="h-9 bg-background border rounded-lg text-xs shadow-sm"
      />
      <span className="text-xs text-muted-foreground">h</span>
    </div>
  );
}

function FieldEditor({
  field,
  value,
  onChange,
  members,
}: {
  field: Field;
  value: any;
  onChange: (value: any) => void;
  members: { id: string; name: string | null }[];
}) {
  const settings = field.settings || {};
  const opts = fieldOptions(field.settings);

  switch (field.type) {
    case "text":
      return settings.multiline ? (
        <Textarea
          value={typeof value === "string" ? value : ""}
          placeholder={settings.placeholder || ""}
          onChange={(e) => {
            if (settings.maxLength > 0 && e.target.value.length > settings.maxLength) return;
            onChange(e.target.value);
          }}
          className="min-h-[60px] bg-background border rounded-lg text-xs shadow-sm resize-y"
        />
      ) : (
        <CommitInput
          value={value}
          onChange={(v) => onChange(v)}
          placeholder={settings.placeholder || ""}
        />
      );
    case "number":
      return (
        <CommitInput
          type="number"
          value={value}
          onChange={(v) => {
            if (v.trim() === "") return onChange(null);
            const n = Number(v);
            return onChange(isNaN(n) ? null : n);
          }}
          placeholder={settings.prefix ? `${settings.prefix}...` : "0"}
        />
      );
    case "date": {
      const d = value && !isNaN(new Date(value).getTime()) ? new Date(value) : null;
      return (
        <DateField
          value={d}
          onChange={(date) => onChange(date ? date.toISOString() : null)}
        />
      );
    }
    case "checkbox":
      return (
        <Switch checked={Boolean(value)} onCheckedChange={(c) => onChange(Boolean(c))} />
      );
    case "dropdown":
    case "status":
      if (settings.multiple) {
        const current = Array.isArray(value) ? value : [];
        return (
          <div className="flex flex-wrap gap-1.5">
            {opts.map((o, i) => (
              <ChipToggle
                key={o.label}
                label={o.label}
                color={o.color}
                selected={current.some((c: any) => normalizeLabel(String(c)) === normalizeLabel(o.label))}
                onToggle={() => {
                  const next = current.some((c: any) => normalizeLabel(String(c)) === normalizeLabel(o.label))
                    ? current.filter((c: any) => normalizeLabel(String(c)) !== normalizeLabel(o.label))
                    : [...current, o.label];
                  onChange(next.length ? next : null);
                }}
              />
            ))}
            {opts.length === 0 && <span className="text-xs text-muted-foreground">No options configured</span>}
          </div>
        );
      }
      return (
        <SingleSelectField
          value={value}
          options={opts}
          colors={opts.map((o) => o.color)}
          onSelect={(label) => onChange(label)}
        />
      );
    case "people":
      if (settings.multiple) {
        const current = Array.isArray(value) ? value : [];
        return (
          <div className="flex flex-wrap gap-1.5">
            {members.map((m) => (
              <ChipToggle
                key={m.id}
                label={m.name || m.id}
                selected={current.includes(m.id)}
                onToggle={() => {
                  const next = current.includes(m.id)
                    ? current.filter((id: string) => id !== m.id)
                    : [...current, m.id];
                  onChange(next.length ? next : null);
                }}
              />
            ))}
            {members.length === 0 && <span className="text-xs text-muted-foreground">No members</span>}
          </div>
        );
      }
      return (
        <SingleSelectField
          value={value}
          options={members.map((m) => ({ label: m.name || m.id }))}
          onSelect={(id) => onChange(id)}
          onClearLabel="No one"
        />
      );
    case "rating": {
      const max = Number(settings.max) || 5;
      const current = Number(value) || 0;
      return (
        <div className="flex items-center gap-1">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(current === n ? null : n)}
              className="transition-transform hover:scale-110"
              aria-label={`Rate ${n}`}
            >
              <Star
                className={cn("h-4 w-4", n <= current ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25")}
              />
            </button>
          ))}
          {current > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[10px] text-muted-foreground"
              onClick={() => onChange(null)}
            >
              Clear
            </Button>
          )}
        </div>
      );
    }
    case "vote": {
      const current = Number(value) || 0;
      return (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className={cn("h-7 px-2 text-xs", current === 1 && "border-primary/50 bg-primary/10 text-primary")}
            onClick={() => onChange(current === 1 ? null : 1)}
          >
            ▲
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn("h-7 px-2 text-xs", current === 0 && "border-primary/50 bg-primary/10 text-primary")}
            onClick={() => onChange(current === 0 ? null : 0)}
          >
            •
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn("h-7 px-2 text-xs", current === -1 && "border-primary/50 bg-primary/10 text-primary")}
            onClick={() => onChange(current === -1 ? null : -1)}
          >
            ▼
          </Button>
        </div>
      );
    }
    case "progress": {
      const min = Number(settings.min) ?? 0;
      const max = Number(settings.max) ?? 100;
      const current = Number(value) ?? 0;
      return (
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={min}
            max={max}
            value={current}
            onChange={(e) => onChange(Number(e.target.value))}
            className="flex-1 h-1.5 accent-primary cursor-pointer"
          />
          <span className="text-xs font-medium w-10 text-right tabular-nums">
            {current}{settings.unit || "%"}
          </span>
        </div>
      );
    }
    case "timeTracking":
      return <TimeTrackingEditor value={value} onChange={onChange} />;
    case "colorPicker":
      return (
        <div className="flex items-center gap-2">
          <Input
            type="color"
            value={typeof value === "string" ? value : "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-14 p-1 bg-background border rounded-lg shadow-sm"
          />
          <span className="text-xs text-muted-foreground">{value || "No color"}</span>
        </div>
      );
    case "link":
      return (
        <CommitInput
          type="url"
          value={value}
          onChange={(v) => onChange(v)}
          placeholder="https://..."
        />
      );
    case "email":
      return (
        <CommitInput
          type="email"
          value={value}
          onChange={(v) => onChange(v)}
          placeholder="name@example.com"
        />
      );
    case "phone":
      return (
        <CommitInput
          type="tel"
          value={value}
          onChange={(v) => onChange(v)}
          placeholder="+1 (555) 000-0000"
        />
      );
    case "location": {
      const loc = (value && typeof value === "object" ? value : {}) as { lat?: number; lng?: number };
      return (
        <div className="grid grid-cols-2 gap-2">
          <CommitInput
            type="number"
            value={loc.lat ?? ""}
            onChange={(v) => onChange({ lat: Number(v) || 0, lng: loc.lng || 0 })}
            placeholder="Latitude"
          />
          <CommitInput
            type="number"
            value={loc.lng ?? ""}
            onChange={(v) => onChange({ lat: loc.lat || 0, lng: Number(v) || 0 })}
            placeholder="Longitude"
          />
        </div>
      );
    }
    case "files": {
      const files = Array.isArray(value) ? value : [];
      if (files.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
      return (
        <div className="space-y-1">
          {files.slice(0, 5).map((f: any, i: number) => (
            <div key={i} className="text-xs text-muted-foreground truncate">
              {f?.name || String(f)}
            </div>
          ))}
          {files.length > 5 && <div className="text-xs text-muted-foreground">+{files.length - 5} more</div>}
        </div>
      );
    }
    case "autoNumber":
    case "formula":
    default:
      return <span className="text-xs text-muted-foreground">{value == null || value === "" ? "—" : String(value)}</span>;
  }
}

export function CustomFieldsSection({ task, workspaceId }: { task: any; workspaceId: string }) {
  const queryClient = useQueryClient();
  const { members, memberMap } = useWorkspaceMembers(workspaceId);

  const { data: board } = useQuery({
    queryKey: ["project-board", task?.projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${task.projectId}/board`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: Boolean(task?.projectId),
  });

  const { data: fields = [], isLoading } = useQuery({
    queryKey: ["custom-fields", board?.id],
    queryFn: async () => {
      const res = await fetch(`/api/custom-fields?boardId=${board.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: Boolean(board?.id),
  });

  const [values, setValues] = useState<Record<string, any>>(() => ({ ...(task?.fieldValues || {}) }));
  const dirtyRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setValues((prev) => {
      const incoming = task?.fieldValues || {};
      const dirty = dirtyRef.current;
      const next = { ...prev };
      let changed = false;
      for (const [k, v] of Object.entries(incoming)) {
        if (!dirty.has(k) && next[k] !== v) {
          next[k] = v;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [task?.fieldValues]);

  const updateMutation = useMutation({
    mutationFn: async ({ fieldId, fieldValue }: { fieldId: string; fieldValue: any }) => {
      const merged = { ...(values), [fieldId]: fieldValue };
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldValues: merged }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update field");
      }
      return res.json();
    },
    onSuccess: (_, { fieldId, fieldValue }) => {
      dirtyRef.current.add(fieldId);
      setValues((prev) => ({ ...prev, [fieldId]: fieldValue }));
      invalidateTaskCaches({ queryClient, workspaceId, projectId: task?.projectId });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update field");
    },
  });

  if (isLoading) return null;
  if (!board || fields.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <Database className="h-3.5 w-3.5 text-primary" />
        <h3 className="text-sm font-semibold tracking-tight">Custom Fields</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {fields.map((field: Field) => (
          <div key={field.id} className="space-y-1.5 min-w-0">
            <Label className="text-[11px] font-medium text-muted-foreground">
              {field.name}
            </Label>
            <FieldEditor
              field={field}
              value={values[field.id]}
              onChange={(v) => updateMutation.mutate({ fieldId: field.id, fieldValue: v })}
              members={members}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
