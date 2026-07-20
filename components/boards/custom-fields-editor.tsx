"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  width: FieldWidth;
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

  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState<FieldType>("text");
  const [fieldColor, setFieldColor] = useState<string>("#6366f1");
  const [fieldWidth, setFieldWidth] = useState<FieldWidth>("medium");
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
    setFieldWidth("medium");
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
    setFieldWidth(field.width);
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
      <Card className="bg-slate-900 border-slate-700/50">
        <CardHeader>
          <Skeleton className="h-6 w-48 bg-slate-800" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full bg-slate-800" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="bg-slate-900 border-slate-700/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-slate-100 text-lg font-semibold">
            Custom Fields
            <Badge variant="secondary" className="ml-2 bg-slate-700 text-slate-300">
              {fields.length}
            </Badge>
          </CardTitle>
          <Button
            size="sm"
            onClick={openCreateDialog}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Field
          </Button>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Settings className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">No custom fields yet</p>
              <Button
                variant="link"
                size="sm"
                onClick={openCreateDialog}
                className="mt-1 text-indigo-400 hover:text-indigo-300"
              >
                Create your first field
              </Button>
            </div>
          ) : (
            <>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                  <span className="text-xs text-slate-400">
                    {selectedIds.size} selected
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-slate-300 hover:text-slate-100"
                    onClick={() => handleBulkVisibility(true)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Show
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-slate-300 hover:text-slate-100"
                    onClick={() => handleBulkVisibility(false)}
                  >
                    <EyeOff className="h-3 w-3 mr-1" />
                    Hide
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-red-400 hover:text-red-300"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-slate-400 ml-auto"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Clear
                  </Button>
                </div>
              )}

              <ScrollArea className="max-h-[480px]">
                <div className="space-y-1">
                  {fields.map((field) => {
                    const config = getFieldTypeConfig(field.type);
                    return (
                      <div
                        key={field.id}
                        className={`flex items-center gap-2 p-2 rounded-lg transition-colors group ${
                          selectedIds.has(field.id)
                            ? "bg-indigo-600/10 border border-indigo-500/30"
                            : "hover:bg-slate-800/60 border border-transparent"
                        }`}
                      >
                        <Checkbox
                          checked={selectedIds.has(field.id)}
                          onCheckedChange={() => toggleSelect(field.id)}
                          className="border-slate-600 data-[state=checked]:bg-indigo-600"
                        />

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="cursor-grab text-slate-500 hover:text-slate-300"
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
                          <span className="text-slate-400 flex-shrink-0">
                            {config.icon}
                          </span>
                          <span className="text-sm text-slate-200 truncate">
                            {field.name}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-slate-800 text-slate-400 border-slate-700 flex-shrink-0"
                          >
                            {config.label}
                          </Badge>
                          {!field.visible && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] bg-slate-800 text-slate-500 border-slate-700 flex-shrink-0"
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
                                className="h-7 w-7 text-slate-400 hover:text-slate-200"
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
                                className="h-7 w-7 text-slate-400 hover:text-slate-200"
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
                                className="h-7 w-7 text-slate-400 hover:text-slate-200"
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
                                className="h-7 w-7 text-slate-400 hover:text-slate-200"
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
                                className="h-7 w-7 text-slate-400 hover:text-slate-200"
                              >
                                <Settings className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="bg-slate-800 border-slate-700"
                            >
                              <DropdownMenuItem
                                className="text-slate-300 focus:bg-slate-700"
                                onClick={() => openEditDialog(field)}
                              >
                                <Edit className="h-3 w-3 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-400 focus:bg-red-500/10"
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            resetForm();
            setEditingField(null);
          }
        }}
      >
        <DialogContent className="bg-slate-900 border-slate-700/50 max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-slate-100">
              {editingField ? "Edit Field" : "Create Custom Field"}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-6 py-2">
              {/* Field Name */}
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">Field Name</Label>
                <Input
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  placeholder="e.g. Priority, Sprint, Budget"
                  className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                />
              </div>

              {/* Field Type Selector */}
              <div className="space-y-3">
                <Label className="text-slate-300 text-sm">Field Type</Label>
                {categories.map((cat) => (
                  <div key={cat.key}>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                      {cat.label}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
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
                          className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                            fieldType === ft.type
                              ? "bg-indigo-600/15 border-indigo-500/50 text-indigo-300"
                              : "bg-slate-800/40 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                          }`}
                        >
                          {ft.icon}
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">
                              {ft.label}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                              {ft.description}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="bg-slate-700/50" />

              {/* Appearance */}
              <div className="space-y-3">
                <Label className="text-slate-300 text-sm">Appearance</Label>

                <div className="space-y-2">
                  <Label className="text-slate-400 text-xs">Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFieldColor(color)}
                        className={`w-7 h-7 rounded-full transition-all ${
                          fieldColor === color
                            ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110"
                            : "hover:scale-110"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-400 text-xs">Width</Label>
                  <div className="flex gap-2">
                    {(["narrow", "medium", "wide"] as FieldWidth[]).map((w) => (
                      <Button
                        key={w}
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => setFieldWidth(w)}
                        className={`capitalize text-xs ${
                          fieldWidth === w
                            ? "border-indigo-500 bg-indigo-600/15 text-indigo-300"
                            : "border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-300"
                        }`}
                      >
                        {w}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <Separator className="bg-slate-700/50" />

              {/* Type-specific settings */}
              {showTypeSettings && (
                <div className="space-y-3">
                  <Label className="text-slate-300 text-sm">
                    Type Settings
                  </Label>

                  {fieldType === "dropdown" && (
                    <div className="space-y-2">
                      {dropdownOptions.map((opt, idx) => (
                        <div key={opt.id} className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 w-5 text-center">
                            {idx + 1}
                          </span>
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0 cursor-pointer"
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
                            className="bg-slate-800 border-slate-700 text-slate-100 text-sm h-8 placeholder:text-slate-600"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-red-400 flex-shrink-0"
                            onClick={() => removeDropdownOption(opt.id)}
                            disabled={dropdownOptions.length <= 1}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={addDropdownOption}
                        className="text-indigo-400 hover:text-indigo-300 text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add option
                      </Button>
                    </div>
                  )}

                  {fieldType === "status" && (
                    <div className="space-y-2">
                      {statusOptions.map((opt) => (
                        <div key={opt.id} className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0 cursor-pointer"
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
                            className="bg-slate-800 border-slate-700 text-slate-100 text-sm h-8 placeholder:text-slate-600"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-red-400 flex-shrink-0"
                            onClick={() => removeStatusOption(opt.id)}
                            disabled={statusOptions.length <= 1}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={addStatusOption}
                        className="text-indigo-400 hover:text-indigo-300 text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add status
                      </Button>
                    </div>
                  )}

                  {fieldType === "number" && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-slate-400 text-xs">Min</Label>
                        <Input
                          type="number"
                          value={numberMin}
                          onChange={(e) => setNumberMin(e.target.value)}
                          placeholder="No min"
                          className="bg-slate-800 border-slate-700 text-slate-100 text-sm h-8 placeholder:text-slate-600"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-slate-400 text-xs">Max</Label>
                        <Input
                          type="number"
                          value={numberMax}
                          onChange={(e) => setNumberMax(e.target.value)}
                          placeholder="No max"
                          className="bg-slate-800 border-slate-700 text-slate-100 text-sm h-8 placeholder:text-slate-600"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-slate-400 text-xs">
                          Decimals
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={10}
                          value={numberDecimals}
                          onChange={(e) => setNumberDecimals(e.target.value)}
                          className="bg-slate-800 border-slate-700 text-slate-100 text-sm h-8"
                        />
                      </div>
                    </div>
                  )}

                  {fieldType === "rating" && (
                    <div className="space-y-1">
                      <Label className="text-slate-400 text-xs">
                        Max Stars
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={maxStars}
                        onChange={(e) => setMaxStars(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-slate-100 text-sm h-8 w-24"
                      />
                    </div>
                  )}

                  {fieldType === "formula" && (
                    <div className="space-y-1">
                      <Label className="text-slate-400 text-xs">Formula</Label>
                      <Textarea
                        value={formula}
                        onChange={(e) => setFormula(e.target.value)}
                        placeholder="e.g. field1 + field2 * 0.1"
                        rows={3}
                        className="bg-slate-800 border-slate-700 text-slate-100 text-sm placeholder:text-slate-600 resize-none"
                      />
                    </div>
                  )}
                </div>
              )}

              <Separator className="bg-slate-700/50" />

              {/* Options */}
              <div className="space-y-3">
                <Label className="text-slate-300 text-sm">Options</Label>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-400 text-xs">Visible</Label>
                    <Switch
                      checked={fieldVisible}
                      onCheckedChange={setFieldVisible}
                      className="data-[state=checked]:bg-indigo-600"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-slate-400 text-xs">Required</Label>
                    <Switch
                      checked={fieldRequired}
                      onCheckedChange={setFieldRequired}
                      className="data-[state=checked]:bg-indigo-600"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-slate-400 text-xs">Pinned</Label>
                    <Switch
                      checked={fieldPinned}
                      onCheckedChange={setFieldPinned}
                      className="data-[state=checked]:bg-indigo-600"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-slate-400 text-xs">Default Value</Label>
                  <Input
                    value={fieldDefaultValue}
                    onChange={(e) => setFieldDefaultValue(e.target.value)}
                    placeholder="Optional default"
                    className="bg-slate-800 border-slate-700 text-slate-100 text-sm h-8 placeholder:text-slate-600"
                  />
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-700/50">
            <Button
              variant="ghost"
              onClick={() => {
                setCreateOpen(false);
                resetForm();
                setEditingField(null);
              }}
              className="text-slate-400 hover:text-slate-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!fieldName.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
            >
              {editingField ? "Save Changes" : "Create Field"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null);
        }}
      >
        <DialogContent className="bg-slate-900 border-slate-700/50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Delete Field</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400">
            Are you sure you want to delete this field? This action cannot be
            undone and all associated data will be lost.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteConfirmId(null)}
              className="text-slate-400 hover:text-slate-200"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-red-600 hover:bg-red-500"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
