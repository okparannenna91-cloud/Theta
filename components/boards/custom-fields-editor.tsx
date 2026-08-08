"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Trash2,
  Edit,
  GripVertical,
  Settings,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Type,
  Hash,
  Calendar,
  Users,
  Link,
  Mail,
  Phone,
  List,
  Star,
  ThumbsUp,
  File,
  MapPin,
  Palette,
  CheckSquare,
  BarChart3,
  Timer,
  Calculator,
  TrendingUp,
  CircleDot,
  Globe,
  Search,
  X,
  Pin,
  PinOff,
} from "lucide-react";

type FieldType =
  | "text"
  | "number"
  | "date"
  | "status"
  | "people"
  | "checkbox"
  | "link"
  | "email"
  | "phone"
  | "dropdown"
  | "rating"
  | "vote"
  | "files"
  | "location"
  | "autoNumber"
  | "formula"
  | "progress"
  | "timeTracking"
  | "colorPicker";

type FieldWidth = "narrow" | "medium" | "wide";

const WIDTH_PRESETS: { label: FieldWidth; value: number }[] = [
  { label: "narrow", value: 120 },
  { label: "medium", value: 200 },
  { label: "wide", value: 320 },
];

interface DropdownOption {
  id: string;
  label: string;
  color?: string;
}

interface StatusOption {
  id: string;
  label: string;
  color: string;
}

interface FieldSettings {
  options?: DropdownOption[];
  statusOptions?: StatusOption[];
  min?: number;
  max?: number;
  decimals?: number;
  maxStars?: number;
  formula?: string;
  defaultValue?: string;
  required?: boolean;
  pinned?: boolean;
}

interface CustomField {
  id: string;
  name: string;
  type: FieldType;
  boardId: string;
  settings?: FieldSettings;
  order: number;
  width: number;
  color?: string;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FieldTypeConfig {
  type: FieldType;
  label: string;
  icon: React.ReactNode;
  description: string;
  category: "basic" | "selection" | "people-links" | "advanced";
}

const FIELD_TYPES: FieldTypeConfig[] = [
  {
    type: "text",
    label: "Text",
    icon: <Type className="h-4 w-4" />,
    description: "Single or multi-line text",
    category: "basic",
  },
  {
    type: "number",
    label: "Number",
    icon: <Hash className="h-4 w-4" />,
    description: "Numeric values",
    category: "basic",
  },
  {
    type: "date",
    label: "Date",
    icon: <Calendar className="h-4 w-4" />,
    description: "Date picker",
    category: "basic",
  },
  {
    type: "dropdown",
    label: "Dropdown",
    icon: <List className="h-4 w-4" />,
    description: "Single select from options",
    category: "selection",
  },
  {
    type: "checkbox",
    label: "Checkbox",
    icon: <CheckSquare className="h-4 w-4" />,
    description: "True/false toggle",
    category: "selection",
  },
  {
    type: "status",
    label: "Status",
    icon: <CircleDot className="h-4 w-4" />,
    description: "Status with color coding",
    category: "selection",
  },
  {
    type: "people",
    label: "People",
    icon: <Users className="h-4 w-4" />,
    description: "Assign team members",
    category: "people-links",
  },
  {
    type: "link",
    label: "Link",
    icon: <Link className="h-4 w-4" />,
    description: "URL links",
    category: "people-links",
  },
  {
    type: "email",
    label: "Email",
    icon: <Mail className="h-4 w-4" />,
    description: "Email addresses",
    category: "people-links",
  },
  {
    type: "phone",
    label: "Phone",
    icon: <Phone className="h-4 w-4" />,
    description: "Phone numbers",
    category: "people-links",
  },
  {
    type: "files",
    label: "Files",
    icon: <File className="h-4 w-4" />,
    description: "File attachments",
    category: "advanced",
  },
  {
    type: "location",
    label: "Location",
    icon: <MapPin className="h-4 w-4" />,
    description: "Location data",
    category: "advanced",
  },
  {
    type: "rating",
    label: "Rating",
    icon: <Star className="h-4 w-4" />,
    description: "Star rating",
    category: "advanced",
  },
  {
    type: "vote",
    label: "Vote",
    icon: <ThumbsUp className="h-4 w-4" />,
    description: "Upvote/downvote",
    category: "advanced",
  },
  {
    type: "colorPicker",
    label: "Color",
    icon: <Palette className="h-4 w-4" />,
    description: "Color picker",
    category: "advanced",
  },
  {
    type: "autoNumber",
    label: "Auto Number",
    icon: <TrendingUp className="h-4 w-4" />,
    description: "Auto-incrementing number",
    category: "advanced",
  },
  {
    type: "formula",
    label: "Formula",
    icon: <Calculator className="h-4 w-4" />,
    description: "Calculated value",
    category: "advanced",
  },
  {
    type: "progress",
    label: "Progress",
    icon: <BarChart3 className="h-4 w-4" />,
    description: "Progress bar (0-100%)",
    category: "advanced",
  },
  {
    type: "timeTracking",
    label: "Time Tracking",
    icon: <Timer className="h-4 w-4" />,
    description: "Track time spent",
    category: "advanced",
  },
];

const PRESET_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6b7280",
];

const STATUS_COLORS = [
  "#22c55e",
  "#eab308",
  "#f97316",
  "#ef4444",
  "#3b82f6",
  "#8b5cf6",
  "#6b7280",
  "#06b6d4",
];

interface CustomFieldsEditorProps {
  boardId: string;
  workspaceId: string;
}

function getFieldTypeConfig(type: FieldType): FieldTypeConfig {
  return (
    FIELD_TYPES.find((ft) => ft.type === type) ?? {
      type,
      label: type,
      icon: <Settings className="h-4 w-4" />,
      description: "",
      category: "basic",
    }
  );
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export default function CustomFieldsEditor({
  boardId,
  workspaceId,
}: CustomFieldsEditorProps) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState<FieldType>("text");
  const [fieldColor, setFieldColor] = useState<string>("#6366f1");
  const [fieldWidth, setFieldWidth] = useState<number>(200);
  const [fieldVisible, setFieldVisible] = useState(true);
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldPinned, setFieldPinned] = useState(false);
  const [fieldDefaultValue, setFieldDefaultValue] = useState("");

  const [dropdownOptions, setDropdownOptions] = useState<DropdownOption[]>([]);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [numberMin, setNumberMin] = useState<string>("");
  const [numberMax, setNumberMax] = useState<string>("");
  const [numberDecimals, setNumberDecimals] = useState<string>("0");
  const [maxStars, setMaxStars] = useState<string>("5");
  const [formula, setFormula] = useState("");

  const fetchFields = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/custom-fields?boardId=${boardId}`);
      if (res.ok) {
        const data = await res.json();
        setFields(data);
      }
    } catch {
      console.error("Failed to fetch custom fields");
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const resetForm = () => {
    setFieldName("");
    setFieldType("text");
    setFieldColor("#6366f1");
    setFieldWidth(200);
    setFieldVisible(true);
    setFieldRequired(false);
    setFieldPinned(false);
    setFieldDefaultValue("");
    setDropdownOptions([]);
    setStatusOptions([]);
    setNumberMin("");
    setNumberMax("");
    setNumberDecimals("0");
    setMaxStars("5");
    setFormula("");
  };

  const openCreateDialog = () => {
    resetForm();
    setEditingField(null);
    setCreateOpen(true);
  };

  const openEditDialog = (field: CustomField) => {
    setEditingField(field);
    setFieldName(field.name);
    setFieldType(field.type);
    setFieldColor(field.color ?? "#6366f1");
    setFieldWidth(field.width ?? 200);
    setFieldVisible(field.visible);
    setFieldRequired(field.settings?.required ?? false);
    setFieldPinned(field.settings?.pinned ?? false);
    setFieldDefaultValue(field.settings?.defaultValue ?? "");
    setDropdownOptions(field.settings?.options ?? []);
    setStatusOptions(field.settings?.statusOptions ?? []);
    setNumberMin(field.settings?.min?.toString() ?? "");
    setNumberMax(field.settings?.max?.toString() ?? "");
    setNumberDecimals(field.settings?.decimals?.toString() ?? "0");
    setMaxStars(field.settings?.maxStars?.toString() ?? "5");
    setFormula(field.settings?.formula ?? "");
    setCreateOpen(true);
  };

  const buildSettings = (): FieldSettings => {
    const settings: FieldSettings = {};
    if (fieldRequired) settings.required = true;
    if (fieldPinned) settings.pinned = true;
    if (fieldDefaultValue) settings.defaultValue = fieldDefaultValue;

    if (fieldType === "dropdown") {
      settings.options = dropdownOptions;
    } else if (fieldType === "status") {
      settings.statusOptions = statusOptions;
    } else if (fieldType === "number") {
      if (numberMin) settings.min = Number(numberMin);
      if (numberMax) settings.max = Number(numberMax);
      settings.decimals = Number(numberDecimals);
    } else if (fieldType === "rating") {
      settings.maxStars = Number(maxStars);
    } else if (fieldType === "formula") {
      settings.formula = formula;
    }

    return settings;
  };

  const handleSave = async () => {
    if (!fieldName.trim()) return;

    const payload = {
      name: fieldName.trim(),
      boardId,
      type: fieldType,
      settings: buildSettings(),
      order: editingField?.order ?? fields.length,
      width: fieldWidth,
      color: fieldColor,
      visible: fieldVisible,
    };

    try {
      if (editingField) {
        const res = await fetch(`/api/custom-fields/${editingField.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated = await res.json();
          setFields((prev) =>
            prev.map((f) => (f.id === updated.id ? updated : f))
          );
        }
      } else {
        const res = await fetch("/api/custom-fields", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created = await res.json();
          setFields((prev) => [...prev, created]);
        }
      }
      setCreateOpen(false);
      resetForm();
      setEditingField(null);
    } catch {
      console.error("Failed to save field");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/custom-fields/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setFields((prev) => prev.filter((f) => f.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } catch {
      console.error("Failed to delete field");
    }
    setDeleteConfirmId(null);
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await fetch(`/api/custom-fields/${id}`, { method: "DELETE" });
    }
    setFields((prev) => prev.filter((f) => !selectedIds.has(f.id)));
    setSelectedIds(new Set());
  };

  const handleBulkVisibility = async (visible: boolean) => {
    for (const id of selectedIds) {
      await fetch(`/api/custom-fields/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible }),
      });
    }
    setFields((prev) =>
      prev.map((f) =>
        selectedIds.has(f.id) ? { ...f, visible } : f
      )
    );
  };

  const moveField = async (id: string, direction: "up" | "down") => {
    const idx = fields.findIndex((f) => f.id === id);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= fields.length) return;

    const reordered = [...fields];
    [reordered[idx], reordered[targetIdx]] = [
      reordered[targetIdx],
      reordered[idx],
    ];
    reordered.forEach((f, i) => (f.order = i));
    setFields(reordered);

    try {
      for (const f of reordered) {
        await fetch(`/api/custom-fields/${f.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: f.order }),
        });
      }
    } catch {
      fetchFields();
    }
  };

  const toggleFieldVisibility = async (field: CustomField) => {
    const newVisible = !field.visible;
    setFields((prev) =>
      prev.map((f) => (f.id === field.id ? { ...f, visible: newVisible } : f))
    );
    try {
      await fetch(`/api/custom-fields/${field.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: newVisible }),
      });
    } catch {
      fetchFields();
    }
  };

  const sortedFields = useMemo(
    () =>
      [...fields].sort(
        (a, b) =>
          Number(b.settings?.pinned ?? false) - Number(a.settings?.pinned ?? false) ||
          a.order - b.order
      ),
    [fields]
  );

  const filteredFields = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedFields;
    return sortedFields.filter((f) => f.name.toLowerCase().includes(q));
  }, [sortedFields, search]);

  const pinnedCount = fields.filter((f) => f.settings?.pinned).length;
  const hiddenCount = fields.filter((f) => !f.visible).length;

  const toggleFieldPinned = async (field: CustomField) => {
    const next = !(field.settings?.pinned ?? false);
    setFields((prev) =>
      prev.map((f) =>
        f.id === field.id ? { ...f, settings: { ...f.settings, pinned: next } } : f
      )
    );
    try {
      await fetch(`/api/custom-fields/${field.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { ...field.settings, pinned: next } }),
      });
    } catch {
      fetchFields();
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === fields.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(fields.map((f) => f.id)));
    }
  };

  const addDropdownOption = () => {
    setDropdownOptions((prev) => [
      ...prev,
      { id: generateId(), label: "", color: PRESET_COLORS[prev.length % PRESET_COLORS.length] },
    ]);
  };

  const updateDropdownOption = (
    id: string,
    updates: Partial<DropdownOption>
  ) => {
    setDropdownOptions((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...updates } : o))
    );
  };

  const removeDropdownOption = (id: string) => {
    setDropdownOptions((prev) => prev.filter((o) => o.id !== id));
  };

  const addStatusOption = () => {
    setStatusOptions((prev) => [
      ...prev,
      {
        id: generateId(),
        label: "",
        color: STATUS_COLORS[prev.length % STATUS_COLORS.length],
      },
    ]);
  };

  const updateStatusOption = (
    id: string,
    updates: Partial<StatusOption>
  ) => {
    setStatusOptions((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...updates } : o))
    );
  };

  const removeStatusOption = (id: string) => {
    setStatusOptions((prev) => prev.filter((o) => o.id !== id));
  };

  const showTypeSettings =
    fieldType === "dropdown" ||
    fieldType === "status" ||
    fieldType === "number" ||
    fieldType === "rating" ||
    fieldType === "formula";

  const categories: { key: string; label: string; types: FieldTypeConfig[] }[] =
    [
      {
        key: "basic",
        label: "Basic",
        types: FIELD_TYPES.filter((t) => t.category === "basic"),
      },
      {
        key: "selection",
        label: "Selection",
        types: FIELD_TYPES.filter((t) => t.category === "selection"),
      },
      {
        key: "people-links",
        label: "People & Links",
        types: FIELD_TYPES.filter((t) => t.category === "people-links"),
      },
      {
        key: "advanced",
        label: "Advanced",
        types: FIELD_TYPES.filter((t) => t.category === "advanced"),
      },
    ];

  if (loading) {
    return (
      <Card className="border-border/40">
        <CardHeader>
          <Skeleton className="h-6 w-48 bg-muted" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full bg-muted" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="border-border/40">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-foreground text-lg font-semibold">
            Custom Fields
            <Badge variant="secondary" className="ml-2 bg-muted text-muted-foreground">
              {fields.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search fields…"
                className="h-8 w-44 pl-8 pr-7 text-xs bg-muted border-border placeholder:text-muted-foreground/60"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button
              size="sm"
              onClick={openCreateDialog}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Field
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Settings className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">No custom fields yet</p>
              <Button
                variant="link"
                size="sm"
                onClick={openCreateDialog}
                className="mt-1 text-primary hover:text-primary/80"
              >
                Create your first field
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                <span className="text-[11px] text-muted-foreground/70 font-medium">
                  {sortedFields.length} field{sortedFields.length !== 1 && "s"}
                </span>
                {pinnedCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground border-border/60 gap-0.5">
                    <Pin className="h-2.5 w-2.5" />
                    {pinnedCount} pinned
                  </Badge>
                )}
                {hiddenCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground/70 border-border/60 gap-0.5">
                    <EyeOff className="h-2.5 w-2.5" />
                    {hiddenCount} hidden
                  </Badge>
                )}
                <span className="text-[11px] text-muted-foreground/40">·</span>
                <span className="text-[11px] text-muted-foreground/70">
                  Pinned fields sort to the top
                </span>
              </div>

              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-muted/60 border border-border/50">
                  <span className="text-xs text-muted-foreground">
                    {selectedIds.size} selected
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-foreground hover:text-foreground"
                    onClick={() => handleBulkVisibility(true)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Show
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-foreground hover:text-foreground"
                    onClick={() => handleBulkVisibility(false)}
                  >
                    <EyeOff className="h-3 w-3 mr-1" />
                    Hide
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:text-destructive/80"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground ml-auto"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Clear
                  </Button>
                </div>
              )}

              {filteredFields.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Search className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">No fields match “{search}”</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setSearch("")}
                    className="mt-1 text-primary hover:text-primary/80"
                  >
                    Clear search
                  </Button>
                </div>
              ) : (
                <ScrollArea className="max-h-[480px]">
                  <div className="space-y-1">
                    {filteredFields.map((field) => {
                    const config = getFieldTypeConfig(field.type);
                    return (
                      <div
                        key={field.id}
                        className={`flex items-center gap-2 p-2 rounded-lg transition-colors group ${
                          selectedIds.has(field.id)
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted/60 border border-transparent"
                        }`}
                      >
                        <Checkbox
                          checked={selectedIds.has(field.id)}
                          onCheckedChange={() => toggleSelect(field.id)}
                          className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="cursor-grab text-muted-foreground/70 hover:text-foreground"
                              disabled
                            >
                              <GripVertical className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Drag to reorder</TooltipContent>
                        </Tooltip>

                        <div
                          className="w-1 h-8 rounded-full flex-shrink-0"
                          style={{ backgroundColor: field.color ?? "#6366f1" }}
                        />

                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-muted-foreground flex-shrink-0">
                            {config.icon}
                          </span>
                          <span className="text-sm text-foreground truncate">
                            {field.name}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-muted text-muted-foreground border-border/60 flex-shrink-0"
                          >
                            {config.label}
                          </Badge>
                          {field.settings?.pinned && (
                            <Pin className="h-3 w-3 text-primary flex-shrink-0" />
                          )}
                          {!field.visible && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] bg-muted text-muted-foreground/70 border-border/60 flex-shrink-0"
                            >
                              Hidden
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => moveField(field.id, "up")}
                                disabled={fields.indexOf(field) === 0}
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Move up</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => moveField(field.id, "down")}
                                disabled={
                                  fields.indexOf(field) === fields.length - 1
                                }
                              >
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Move down</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => toggleFieldVisibility(field)}
                              >
                                {field.visible ? (
                                  <Eye className="h-3 w-3" />
                                ) : (
                                  <EyeOff className="h-3 w-3" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {field.visible ? "Hide column" : "Show column"}
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-7 w-7 ${
                                  field.settings?.pinned
                                    ? "text-primary hover:text-primary/80"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                                onClick={() => toggleFieldPinned(field)}
                              >
                                {field.settings?.pinned ? (
                                  <Pin className="h-3 w-3" />
                                ) : (
                                  <PinOff className="h-3 w-3" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {field.settings?.pinned ? "Unpin" : "Pin to top"}
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => openEditDialog(field)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit field</TooltipContent>
                          </Tooltip>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              >
                                <Settings className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="border-border/40"
                            >
                              <DropdownMenuItem
                                className="text-foreground focus:bg-muted"
                                onClick={() => openEditDialog(field)}
                              >
                                <Edit className="h-3 w-3 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:bg-destructive/10"
                                onClick={() => setDeleteConfirmId(field.id)}
                              >
                                <Trash2 className="h-3 w-3 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </ScrollArea>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Sheet
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            resetForm();
            setEditingField(null);
          }
        }}
      >
        <SheetContent
          side="right"
          className="fixed left-auto right-0 top-0 translate-x-0 translate-y-0 h-[100dvh] w-full sm:w-[95vw] md:w-[85vw] lg:w-[680px] sm:max-w-none p-0 border-l bg-background shadow-2xl rounded-none sm:rounded-l-xl overflow-hidden flex flex-col"
        >
          <SheetHeader className="px-6 pr-14 pt-5 pb-4 border-b border-border/60">
            <SheetTitle className="text-foreground flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {getFieldTypeConfig(fieldType).icon}
              </span>
              {editingField ? "Edit Field" : "Create Custom Field"}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground/70">
              {editingField
                ? `Update the settings for “${editingField.name}”.`
                : "Add a new column to your board — it will show up across all views."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
            <div className="space-y-7 px-6 py-5">
              {/* Field name */}
              <div className="space-y-1.5">
                <Label className="text-foreground text-[13px] font-medium">
                  Field name
                </Label>
                <Input
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  placeholder="e.g. Priority, Sprint, Budget"
                  autoFocus
                  className="h-9 bg-muted/40 border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary"
                />
              </div>

              {/* Field type */}
              <div className="space-y-4">
                <Label className="text-foreground text-[13px] font-medium">
                  Field type
                </Label>
                {categories.map((cat) => (
                  <div key={cat.key} className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                      {cat.label}
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {cat.types.map((ft) => (
                        <button
                          key={ft.type}
                          type="button"
                          onClick={() => {
                            setFieldType(ft.type);
                            if (ft.type === "dropdown" && dropdownOptions.length === 0) {
                              addDropdownOption();
                            }
                            if (ft.type === "status" && statusOptions.length === 0) {
                              addStatusOption();
                            }
                          }}
                          className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-all ${
                            fieldType === ft.type
                              ? "border-primary/60 bg-primary/5 text-foreground ring-1 ring-primary/30"
                              : "border-border/60 bg-muted/30 text-muted-foreground hover:border-primary/30 hover:bg-muted/60 hover:text-foreground"
                          }`}
                        >
                          <span
                            className={`shrink-0 ${
                              fieldType === ft.type
                                ? "text-primary"
                                : "text-muted-foreground/70"
                            }`}
                          >
                            {ft.icon}
                          </span>
                          <span className="text-xs font-medium truncate">
                            {ft.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Selected type summary */}
                <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
                  <span className="mt-0.5 text-primary shrink-0">
                    {getFieldTypeConfig(fieldType).icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">
                      {getFieldTypeConfig(fieldType).label}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70">
                      {getFieldTypeConfig(fieldType).description}
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="bg-border" />

              {/* Appearance */}
              <div className="space-y-4">
                <Label className="text-foreground text-[13px] font-medium">
                  Appearance
                </Label>

                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFieldColor(color)}
                        aria-label={`Select color ${color}`}
                        className={`h-6 w-6 rounded-full transition-all ${
                          fieldColor === color
                            ? "ring-2 ring-foreground/70 ring-offset-2 ring-offset-background scale-110"
                            : "hover:scale-110"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">Column width</Label>
                  <div className="inline-flex rounded-lg border border-border/60 bg-muted/40 p-0.5">
                    {WIDTH_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setFieldWidth(preset.value)}
                        className={`rounded-md px-3.5 py-1.5 text-xs font-medium capitalize transition-colors ${
                          fieldWidth === preset.value
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Separator className="bg-border" />

              {/* Type-specific settings */}
              {showTypeSettings && (
                <div className="space-y-3">
                  <Label className="text-foreground text-[13px] font-medium">
                    Field settings
                  </Label>

                  <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                    {fieldType === "dropdown" && (
                      <>
                        {dropdownOptions.map((opt, idx) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground/50 w-5 text-center shrink-0">
                              {idx + 1}
                            </span>
                            <button
                              type="button"
                              aria-label="Cycle option color"
                              className="h-3.5 w-3.5 rounded-full shrink-0 border border-black/10 transition-transform hover:scale-110"
                              style={{ backgroundColor: opt.color }}
                              onClick={() => {
                                const nextColor =
                                  PRESET_COLORS[
                                    (PRESET_COLORS.indexOf(opt.color ?? "#6366f1") +
                                      1) %
                                      PRESET_COLORS.length
                                  ];
                                updateDropdownOption(opt.id, { color: nextColor });
                              }}
                            />
                            <Input
                              value={opt.label}
                              onChange={(e) =>
                                updateDropdownOption(opt.id, {
                                  label: e.target.value,
                                })
                              }
                              placeholder="Option label"
                              className="h-8 bg-background border-border text-foreground text-sm placeholder:text-muted-foreground/50"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground/60 hover:text-destructive flex-shrink-0"
                              onClick={() => removeDropdownOption(opt.id)}
                              disabled={dropdownOptions.length <= 1}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={addDropdownOption}
                          className="h-8 text-primary hover:text-primary/80 text-xs"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add option
                        </Button>
                      </>
                    )}

                    {fieldType === "status" && (
                      <>
                        {statusOptions.map((opt) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <button
                              type="button"
                              aria-label="Cycle status color"
                              className="h-3.5 w-3.5 rounded-full shrink-0 border border-black/10 transition-transform hover:scale-110"
                              style={{ backgroundColor: opt.color }}
                              onClick={() => {
                                const nextColor =
                                  STATUS_COLORS[
                                    (STATUS_COLORS.indexOf(opt.color) + 1) %
                                      STATUS_COLORS.length
                                  ];
                                updateStatusOption(opt.id, { color: nextColor });
                              }}
                            />
                            <Input
                              value={opt.label}
                              onChange={(e) =>
                                updateStatusOption(opt.id, {
                                  label: e.target.value,
                                })
                              }
                              placeholder="Status label"
                              className="h-8 bg-background border-border text-foreground text-sm placeholder:text-muted-foreground/50"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground/60 hover:text-destructive flex-shrink-0"
                              onClick={() => removeStatusOption(opt.id)}
                              disabled={statusOptions.length <= 1}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={addStatusOption}
                          className="h-8 text-primary hover:text-primary/80 text-xs"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add status
                        </Button>
                      </>
                    )}

                    {fieldType === "number" && (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">Min</Label>
                          <Input
                            type="number"
                            value={numberMin}
                            onChange={(e) => setNumberMin(e.target.value)}
                            placeholder="No min"
                            className="h-8 bg-background border-border text-foreground text-sm placeholder:text-muted-foreground/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">Max</Label>
                          <Input
                            type="number"
                            value={numberMax}
                            onChange={(e) => setNumberMax(e.target.value)}
                            placeholder="No max"
                            className="h-8 bg-background border-border text-foreground text-sm placeholder:text-muted-foreground/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-xs">
                            Decimals
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            max={10}
                            value={numberDecimals}
                            onChange={(e) => setNumberDecimals(e.target.value)}
                            className="h-8 bg-background border-border text-foreground text-sm"
                          />
                        </div>
                      </div>
                    )}

                    {fieldType === "rating" && (
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">
                          Max stars
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={maxStars}
                          onChange={(e) => setMaxStars(e.target.value)}
                          className="h-8 bg-background border-border text-foreground text-sm w-24"
                        />
                      </div>
                    )}

                    {fieldType === "formula" && (
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">Formula</Label>
                        <Textarea
                          value={formula}
                          onChange={(e) => setFormula(e.target.value)}
                          placeholder="e.g. field1 + field2 * 0.1"
                          rows={3}
                          className="bg-background border-border text-foreground text-sm placeholder:text-muted-foreground/50 resize-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Separator className="bg-border" />

              {/* Options */}
              <div className="space-y-3">
                <Label className="text-foreground text-[13px] font-medium">
                  Options
                </Label>

                <div className="space-y-2.5 rounded-lg border border-border/60 bg-muted/20 p-3">
                  <div className="flex items-center justify-between">
                    <div className="pr-4">
                      <Label className="text-muted-foreground text-xs font-medium">Visible</Label>
                      <p className="text-[10px] text-muted-foreground/60">Show this column on boards and tables</p>
                    </div>
                    <Switch
                      checked={fieldVisible}
                      onCheckedChange={setFieldVisible}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="pr-4">
                      <Label className="text-muted-foreground text-xs font-medium">Required</Label>
                      <p className="text-[10px] text-muted-foreground/60">Block saving tasks with an empty value</p>
                    </div>
                    <Switch
                      checked={fieldRequired}
                      onCheckedChange={setFieldRequired}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="pr-4">
                      <Label className="text-muted-foreground text-xs font-medium">Pinned</Label>
                      <p className="text-[10px] text-muted-foreground/60">Keep this column visible when you scroll</p>
                    </div>
                    <Switch
                      checked={fieldPinned}
                      onCheckedChange={setFieldPinned}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">Default value</Label>
                  <Input
                    value={fieldDefaultValue}
                    onChange={(e) => setFieldDefaultValue(e.target.value)}
                    placeholder="Optional default"
                    className="h-8 bg-muted/40 border-border text-foreground text-sm placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-6 py-4 border-t border-border/60 bg-muted/10">
            <p className="text-[11px] text-muted-foreground/60 hidden sm:block">
              {fieldName.trim()
                ? `${editingField ? "Saving" : "Creating"} “${fieldName.trim()}” as a ${getFieldTypeConfig(fieldType).label.toLowerCase()} field`
                : "Fields appear as columns on your board"}
            </p>
            <div className="flex justify-end gap-2 ml-auto">
              <Button
                variant="ghost"
                onClick={() => {
                  setCreateOpen(false);
                  resetForm();
                  setEditingField(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!fieldName.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
              >
                {editingField ? "Save Changes" : "Create Field"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null);
        }}
      >
        <DialogContent className="border-border/40 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Delete Field</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this field? This action cannot be
            undone and all associated data will be lost.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteConfirmId(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
