"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckCircle2, XCircle, Clock, AlertTriangle, Star,
  Hash, Mail, Phone, MapPin, Globe, Link as LinkIcon,
  ThumbsUp, ThumbsDown, FileText, CheckSquare,
  User, CalendarDays, Flag, Tag, ListChecks, GripVertical
} from "lucide-react";

export type ColumnType =
  | "text" | "number" | "date" | "status" | "people" | "timeline"
  | "connectBoard" | "mirror" | "priority" | "tags"
  | "checkbox" | "link" | "email" | "phone" | "files"
  | "location" | "country" | "worldClock" | "rating" | "vote"
  | "dropdown" | "autoNumber" | "formula" | "dependencies"
  | "progress" | "timeTracking" | "button" | "week" | "colorPicker"
  | "aiSummary" | "aiText" | "aiSentiment" | "aiLabel"
  | "aiExtraction" | "aiPrioritization" | "aiWriting" | "aiTranslation"
  | "combo";

export interface ColumnDef {
  id: string;
  name: string;
  columnType: ColumnType;
  order: number;
  width?: number;
  visible?: boolean;
  pinned?: boolean;
  color?: string;
  settings?: Record<string, any>;
}

export const COLUMN_TYPE_CATEGORIES = {
  essential: {
    label: "Essential",
    description: "Core columns for any table",
    columns: [
      { type: "status" as ColumnType, icon: CheckCircle2, color: "text-emerald-500" },
      { type: "people" as ColumnType, icon: User, color: "text-blue-500" },
      { type: "timeline" as ColumnType, icon: Clock, color: "text-purple-500" },
      { type: "date" as ColumnType, icon: CalendarDays, color: "text-orange-500" },
      { type: "number" as ColumnType, icon: Hash, color: "text-cyan-500" },
      { type: "text" as ColumnType, icon: FileText, color: "text-slate-500" },
      { type: "connectBoard" as ColumnType, icon: LinkIcon, color: "text-indigo-500" },
      { type: "mirror" as ColumnType, icon: GripVertical, color: "text-violet-500" },
      { type: "priority" as ColumnType, icon: Flag, color: "text-red-500" },
      { type: "tags" as ColumnType, icon: Tag, color: "text-amber-500" },
    ]
  },
  utility: {
    label: "Utility",
    description: "Extra data columns",
    columns: [
      { type: "checkbox" as ColumnType, icon: CheckSquare, color: "text-emerald-500" },
      { type: "link" as ColumnType, icon: LinkIcon, color: "text-sky-500" },
      { type: "email" as ColumnType, icon: Mail, color: "text-red-500" },
      { type: "phone" as ColumnType, icon: Phone, color: "text-green-500" },
      { type: "files" as ColumnType, icon: FileText, color: "text-amber-500" },
      { type: "location" as ColumnType, icon: MapPin, color: "text-rose-500" },
      { type: "country" as ColumnType, icon: Globe, color: "text-blue-600" },
      { type: "worldClock" as ColumnType, icon: Globe, color: "text-indigo-400" },
      { type: "rating" as ColumnType, icon: Star, color: "text-yellow-500" },
      { type: "vote" as ColumnType, icon: ThumbsUp, color: "text-emerald-500" },
      { type: "dropdown" as ColumnType, icon: ListChecks, color: "text-purple-500" },
      { type: "autoNumber" as ColumnType, icon: Hash, color: "text-slate-600" },
    ]
  },
  advanced: {
    label: "Advanced",
    description: "Powerful computation columns",
    columns: [
      { type: "formula" as ColumnType, icon: Hash, color: "text-cyan-600" },
      { type: "dependencies" as ColumnType, icon: LinkIcon, color: "text-orange-500" },
      { type: "progress" as ColumnType, icon: AlertTriangle, color: "text-emerald-500" },
      { type: "timeTracking" as ColumnType, icon: Clock, color: "text-violet-500" },
      { type: "button" as ColumnType, icon: CheckCircle2, color: "text-indigo-500" },
      { type: "week" as ColumnType, icon: CalendarDays, color: "text-pink-500" },
      { type: "colorPicker" as ColumnType, icon: Star, color: "text-rainbow" },
    ]
  },
  ai: {
    label: "AI",
    description: "AI-powered content columns",
    columns: [
      { type: "aiSummary" as ColumnType, icon: FileText, color: "text-purple-400" },
      { type: "aiText" as ColumnType, icon: FileText, color: "text-indigo-400" },
      { type: "aiSentiment" as ColumnType, icon: ThumbsUp, color: "text-emerald-400" },
      { type: "aiLabel" as ColumnType, icon: Tag, color: "text-amber-400" },
      { type: "aiExtraction" as ColumnType, icon: FileText, color: "text-cyan-400" },
      { type: "aiPrioritization" as ColumnType, icon: Flag, color: "text-red-400" },
      { type: "aiWriting" as ColumnType, icon: FileText, color: "text-blue-400" },
      { type: "aiTranslation" as ColumnType, icon: Globe, color: "text-green-400" },
    ]
  },
  combo: {
    label: "Combo",
    description: "Combined column types",
    columns: [
      { type: "combo" as ColumnType, icon: ListChecks, color: "text-indigo-500" },
    ]
  }
};

export function getColumnIcon(type: ColumnType) {
  for (const cat of Object.values(COLUMN_TYPE_CATEGORIES)) {
    const found = cat.columns.find(c => c.type === type);
    if (found) return found;
  }
  return { type, icon: FileText, color: "text-slate-400" };
}

export function ColumnValue({ column, value, task, onChange }: {
  column: ColumnDef;
  value: any;
  task?: any;
  onChange?: (value: any) => void;
}) {
  const icon = getColumnIcon(column.columnType);

  switch (column.columnType) {
    case "status":
      return (
        <Badge className={cn(
          "text-[10px] font-bold px-2 py-0.5 rounded-md border-none",
          value === "done" || value === "completed" ? "bg-emerald-500/10 text-emerald-600" :
          value === "in_progress" || value === "in-progress" ? "bg-amber-500/10 text-amber-600" :
          value === "todo" ? "bg-slate-500/10 text-slate-600" :
          "bg-indigo-500/10 text-indigo-600"
        )}>
          {value || "Todo"}
        </Badge>
      );

    case "priority":
      return (
        <div className="flex items-center gap-1.5">
          <Flag className={cn(
            "h-3 w-3",
            value === "high" ? "text-red-500 fill-red-500" :
            value === "medium" ? "text-amber-500 fill-amber-500" :
            "text-emerald-500 fill-emerald-500"
          )} />
          <span className="text-xs font-bold capitalize">{value || "Medium"}</span>
        </div>
      );

    case "people":
      return (
        <div className="flex -space-x-2">
          {task?.assigneeId ? (
            <Avatar className="h-6 w-6 border-2 border-background">
              <AvatarFallback className="text-[8px] bg-indigo-500 text-white">
                {"U"}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-6 w-6 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center">
              <User className="h-3 w-3 text-slate-400" />
            </div>
          )}
        </div>
      );

    case "date":
      return value ? (
        <div className="flex items-center gap-1.5 text-xs">
          <CalendarDays className="h-3 w-3 text-slate-400" />
          <span>{new Date(value).toLocaleDateString()}</span>
        </div>
      ) : <span className="text-xs text-slate-400">—</span>;

    case "number":
      return <span className="text-xs font-bold tabular-nums">{value ?? "—"}</span>;

    case "text":
      return <span className="text-xs truncate max-w-[200px] block">{value || "—"}</span>;

    case "tags":
      return (
        <div className="flex flex-wrap gap-1">
          {Array.isArray(value) && value.length > 0 ? value.map((tag: any, i: number) => (
            <Badge key={i} className="text-[9px] px-1.5 py-0 font-bold" style={{
              backgroundColor: tag.color ? `${tag.color}20` : undefined,
              color: tag.color || undefined,
              border: "none"
            }}>
              {tag.name || tag}
            </Badge>
          )) : <span className="text-xs text-slate-400">—</span>}
        </div>
      );

    case "checkbox":
      return (
        <div className="flex items-center">
          {value ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <XCircle className="h-4 w-4 text-slate-300 dark:text-slate-600" />
          )}
        </div>
      );

    case "rating":
      return (
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} className={cn(
              "h-3 w-3",
              star <= (value || 0) ? "text-amber-400 fill-amber-400" : "text-slate-300 dark:text-slate-600"
            )} />
          ))}
        </div>
      );

    case "vote":
      return (
        <div className="flex items-center gap-1">
          <ThumbsUp className="h-3 w-3 text-slate-400" />
          <span className="text-xs font-bold">{value || 0}</span>
        </div>
      );

    case "progress":
      return (
        <div className="flex items-center gap-2 w-full max-w-[120px]">
          <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${Math.min(value || 0, 100)}%` }}
            />
          </div>
          <span className="text-[10px] font-bold tabular-nums text-slate-500">{value || 0}%</span>
        </div>
      );

    case "email":
      return value ? (
        <a href={`mailto:${value}`} className="text-xs text-indigo-500 hover:underline truncate max-w-[200px] block">
          <Mail className="h-3 w-3 inline mr-1" />
          {value}
        </a>
      ) : <span className="text-xs text-slate-400">—</span>;

    case "phone":
      return value ? (
        <span className="text-xs flex items-center gap-1">
          <Phone className="h-3 w-3 text-slate-400" />
          {value}
        </span>
      ) : <span className="text-xs text-slate-400">—</span>;

    case "link":
      return value ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:underline truncate max-w-[200px] block">
          <LinkIcon className="h-3 w-3 inline mr-1" />
          {value}
        </a>
      ) : <span className="text-xs text-slate-400">—</span>;

    case "location":
      return value ? (
        <span className="text-xs flex items-center gap-1">
          <MapPin className="h-3 w-3 text-slate-400" />
          {value}
        </span>
      ) : <span className="text-xs text-slate-400">—</span>;

    case "country":
      return value ? (
        <span className="text-xs flex items-center gap-1">
          <Globe className="h-3 w-3 text-slate-400" />
          {value}
        </span>
      ) : <span className="text-xs text-slate-400">—</span>;

    case "timeTracking":
      const hours = Math.floor((value || 0) / 3600);
      const minutes = Math.floor(((value || 0) % 3600) / 60);
      return (
        <span className="text-xs font-mono font-bold">
          {hours}h {minutes}m
        </span>
      );

    case "button":
      return (
        <button
          onClick={() => {}}
          className="text-[10px] font-bold px-3 py-1 rounded-md bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 transition-colors"
        >
          {column.settings?.buttonLabel || "Action"}
        </button>
      );

    case "aiSentiment":
      return (
        <div className="flex items-center gap-1">
          {value === "positive" ? (
            <ThumbsUp className="h-3 w-3 text-emerald-500" />
          ) : value === "negative" ? (
            <ThumbsDown className="h-3 w-3 text-red-500" />
          ) : (
            <span className="text-[8px] font-bold text-slate-400 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
              {value || "Analyzing..."}
            </span>
          )}
        </div>
      );

    case "aiSummary":
    case "aiText":
    case "aiWriting":
      return (
        <span className="text-xs italic text-purple-500/70 truncate max-w-[200px] block">
          {value || "Generate with AI..."}
        </span>
      );

    default:
      return <span className="text-xs truncate max-w-[200px] block">{value ?? "—"}</span>;
  }
}

export function ColumnTypeIcon({ type, className }: { type: ColumnType; className?: string }) {
  const info = getColumnIcon(type);
  const Icon = info.icon;
  return <Icon className={cn("h-4 w-4", info.color, className)} />;
}

export function ColumnTypeLabel({ type }: { type: ColumnType }) {
  const labels: Record<string, string> = {
    text: "Text", number: "Number", date: "Date", status: "Status",
    people: "People", timeline: "Timeline", connectBoard: "Connect Board",
    mirror: "Mirror", priority: "Priority", tags: "Tags",
    checkbox: "Checkbox", link: "Link", email: "Email", phone: "Phone",
    files: "Files", location: "Location", country: "Country",
    worldClock: "World Clock", rating: "Rating", vote: "Vote",
    dropdown: "Dropdown", autoNumber: "Auto Number",
    formula: "Formula", dependencies: "Dependencies", progress: "Progress",
    timeTracking: "Time Tracking", button: "Button", week: "Week",
    colorPicker: "Color Picker", aiSummary: "AI Summary",
    aiText: "AI Text", aiSentiment: "AI Sentiment", aiLabel: "AI Label",
    aiExtraction: "AI Extraction", aiPrioritization: "AI Prioritization",
    aiWriting: "AI Writing", aiTranslation: "AI Translation",
    combo: "Combo Column"
  };
  return <span>{labels[type] || type}</span>;
}
