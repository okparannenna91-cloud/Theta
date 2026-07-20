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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  Plus,
  GripVertical,
  Trash2,
  Copy,
  Eye,
  Edit,
  FileText,
  Settings,
  ArrowUp,
  ArrowDown,
  Link,
  ChevronDown,
  Download,
  BarChart3,
  Globe,
  Lock,
  MoreVertical,
  X,
  Check,
  AlertCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "dropdown"
  | "checkbox"
  | "radio"
  | "file_upload"
  | "email"
  | "phone"
  | "rating"
  | "nps"
  | "section_break";

interface BranchingRule {
  id: string;
  sourceFieldId: string;
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "greater_than"
    | "less_than";
  value: string;
  action: "show" | "hide" | "skip_to";
  targetFieldId: string;
}

interface FieldOption {
  id: string;
  label: string;
  value: string;
}

interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
}

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder: string;
  required: boolean;
  options?: FieldOption[];
  validation?: FieldValidation;
  branchingRules?: BranchingRule[];
}

interface Form {
  id: string;
  title: string;
  description: string;
  workspaceId: string;
  fields: FormField[];
  isPublic: boolean;
  slug?: string;
  responseCount: number;
  createdAt: string;
  updatedAt: string;
}

interface FormResponse {
  id: string;
  formId: string;
  submittedAt: string;
  answers: Record<string, unknown>;
}

type ViewMode = "list" | "builder" | "responses";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FIELD_TYPES: { type: FieldType; label: string; icon: string }[] = [
  { type: "text", label: "Text Input", icon: "T" },
  { type: "textarea", label: "Text Area", icon: "¶" },
  { type: "number", label: "Number", icon: "#" },
  { type: "email", label: "Email", icon: "@" },
  { type: "phone", label: "Phone", icon: "☎" },
  { type: "date", label: "Date", icon: "📅" },
  { type: "dropdown", label: "Dropdown", icon: "▾" },
  { type: "checkbox", label: "Checkbox", icon: "☑" },
  { type: "radio", label: "Radio", icon: "◉" },
  { type: "file_upload", label: "File Upload", icon: "📎" },
  { type: "rating", label: "Rating", icon: "★" },
  { type: "nps", label: "NPS Score", icon: "📊" },
  { type: "section_break", label: "Section Break", icon: "—" },
];

const TEMPLATES: {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
}[] = [
  {
    id: "customer_feedback",
    title: "Customer Feedback",
    description: "Collect customer feedback",
    fields: [
      {
        id: "fb_name",
        type: "text",
        label: "Your Name",
        placeholder: "John Doe",
        required: true,
      },
      {
        id: "fb_email",
        type: "email",
        label: "Email Address",
        placeholder: "john@example.com",
        required: true,
      },
      {
        id: "fb_rating",
        type: "rating",
        label: "Overall Satisfaction",
        placeholder: "",
        required: true,
      },
      {
        id: "fb_feedback",
        type: "textarea",
        label: "Your Feedback",
        placeholder: "Tell us what you think...",
        required: true,
      },
      {
        id: "fb_recommend",
        type: "radio",
        label: "Would you recommend us?",
        placeholder: "",
        required: false,
        options: [
          { id: "opt_1", label: "Yes", value: "yes" },
          { id: "opt_2", label: "No", value: "no" },
          { id: "opt_3", label: "Maybe", value: "maybe" },
        ],
      },
    ],
  },
  {
    id: "bug_report",
    title: "Bug Report",
    description: "Report bugs and issues",
    fields: [
      {
        id: "bug_title",
        type: "text",
        label: "Bug Title",
        placeholder: "Brief description of the bug",
        required: true,
      },
      {
        id: "bug_severity",
        type: "dropdown",
        label: "Severity",
        placeholder: "Select severity",
        required: true,
        options: [
          { id: "opt_low", label: "Low", value: "low" },
          { id: "opt_med", label: "Medium", value: "medium" },
          { id: "opt_high", label: "High", value: "high" },
          { id: "opt_crit", label: "Critical", value: "critical" },
        ],
      },
      {
        id: "bug_steps",
        type: "textarea",
        label: "Steps to Reproduce",
        placeholder: "1. Go to...\n2. Click on...\n3. See error...",
        required: true,
      },
      {
        id: "bug_expected",
        type: "textarea",
        label: "Expected Behavior",
        placeholder: "What should happen?",
        required: true,
      },
      {
        id: "bug_screenshot",
        type: "file_upload",
        label: "Screenshot",
        placeholder: "Upload a screenshot",
        required: false,
      },
    ],
  },
  {
    id: "feature_request",
    title: "Feature Request",
    description: "Request new features",
    fields: [
      {
        id: "feat_name",
        type: "text",
        label: "Feature Name",
        placeholder: "Short feature name",
        required: true,
      },
      {
        id: "feat_desc",
        type: "textarea",
        label: "Description",
        placeholder: "Describe the feature you'd like to see...",
        required: true,
      },
      {
        id: "feat_priority",
        type: "radio",
        label: "Priority",
        placeholder: "",
        required: true,
        options: [
          { id: "opt_n", label: "Nice to have", value: "nice" },
          { id: "opt_i", label: "Important", value: "important" },
          { id: "opt_c", label: "Critical", value: "critical" },
        ],
      },
      {
        id: "feat_use_case",
        type: "textarea",
        label: "Use Case",
        placeholder: "How would you use this feature?",
        required: false,
      },
    ],
  },
  {
    id: "contact_form",
    title: "Contact Form",
    description: "General contact form",
    fields: [
      {
        id: "c_name",
        type: "text",
        label: "Name",
        placeholder: "Your name",
        required: true,
      },
      {
        id: "c_email",
        type: "email",
        label: "Email",
        placeholder: "you@example.com",
        required: true,
      },
      {
        id: "c_phone",
        type: "phone",
        label: "Phone",
        placeholder: "+1 (555) 000-0000",
        required: false,
      },
      {
        id: "c_subject",
        type: "text",
        label: "Subject",
        placeholder: "What is this about?",
        required: true,
      },
      {
        id: "c_message",
        type: "textarea",
        label: "Message",
        placeholder: "Your message...",
        required: true,
      },
    ],
  },
];

const OPERATORS: { value: BranchingRule["operator"]; label: string }[] = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Does not equal" },
  { value: "contains", label: "Contains" },
  { value: "greater_than", label: "Greater than" },
  { value: "less_than", label: "Less than" },
];

const ITEMS_PER_PAGE = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(): string {
  return Math.random().toString(36).substring(2, 10);
}

function createField(partial?: Partial<FormField>): FormField {
  return {
    id: uid(),
    type: "text",
    label: "New Field",
    placeholder: "",
    required: false,
    options: [],
    validation: {},
    branchingRules: [],
    ...partial,
  };
}

function fieldTypeLabel(t: FieldType): string {
  return FIELD_TYPES.find((f) => f.type === t)?.label ?? t;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// ---------- Field Palette ----------
function FieldPalette({ onAdd }: { onAdd: (type: FieldType) => void }) {
  return (
    <Card className="bg-slate-900 border-slate-700 h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-slate-300">Fields</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="grid grid-cols-1 gap-1.5">
            {FIELD_TYPES.map((ft) => (
              <button
                key={ft.type}
                onClick={() => onAdd(ft.type)}
                className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2 text-left text-sm text-slate-300 transition hover:border-indigo-500 hover:bg-slate-800 hover:text-indigo-300"
              >
                <span className="w-5 text-center text-xs text-slate-500">
                  {ft.icon}
                </span>
                {ft.label}
              </button>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ---------- Field Card ----------
function FieldCard({
  field,
  index,
  total,
  isSelected,
  allFields,
  onSelect,
  onMove,
  onDelete,
  onDuplicate,
}: {
  field: FormField;
  index: number;
  total: number;
  isSelected: boolean;
  allFields: FormField[];
  onSelect: () => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`group relative cursor-pointer rounded-lg border p-3 transition ${
        isSelected
          ? "border-indigo-500 bg-slate-800/80 ring-1 ring-indigo-500/30"
          : "border-slate-700 bg-slate-800/40 hover:border-slate-600"
      }`}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 shrink-0 text-slate-600" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-slate-200">
              {field.label || "Untitled"}
            </span>
            <Badge
              variant="secondary"
              className="shrink-0 text-[10px] bg-slate-700 text-slate-400"
            >
              {fieldTypeLabel(field.type)}
            </Badge>
            {field.required && (
              <Badge className="shrink-0 text-[10px] bg-red-500/20 text-red-400 border-0">
                Required
              </Badge>
            )}
          </div>
          {field.type !== "section_break" && (
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {field.placeholder || "No placeholder"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={index === 0}
            onClick={(e) => {
              e.stopPropagation();
              onMove(-1);
            }}
          >
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={index === total - 1}
            onClick={(e) => {
              e.stopPropagation();
              onMove(1);
            }}
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-red-400 hover:text-red-300"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------- Field Settings Panel ----------
function FieldSettings({
  field,
  allFields,
  onChange,
  onClose,
}: {
  field: FormField;
  allFields: FormField[];
  onChange: (f: FormField) => void;
  onClose: () => void;
}) {
  const update = (patch: Partial<FormField>) =>
    onChange({ ...field, ...patch });

  const addOption = () => {
    const opt: FieldOption = {
      id: uid(),
      label: `Option ${(field.options?.length ?? 0) + 1}`,
      value: `option_${(field.options?.length ?? 0) + 1}`,
    };
    update({ options: [...(field.options ?? []), opt] });
  };

  const updateOption = (idx: number, patch: Partial<FieldOption>) => {
    const opts = [...(field.options ?? [])];
    opts[idx] = { ...opts[idx], ...patch };
    update({ options: opts });
  };

  const removeOption = (idx: number) => {
    update({
      options: (field.options ?? []).filter((_, i) => i !== idx),
    });
  };

  // branching rules
  const addRule = () => {
    const rule: BranchingRule = {
      id: uid(),
      sourceFieldId: allFields.length > 0 ? allFields[0].id : "",
      operator: "equals",
      value: "",
      action: "show",
      targetFieldId: "",
    };
    update({
      branchingRules: [...(field.branchingRules ?? []), rule],
    });
  };

  const updateRule = (idx: number, patch: Partial<BranchingRule>) => {
    const rules = [...(field.branchingRules ?? [])];
    rules[idx] = { ...rules[idx], ...patch };
    update({ branchingRules: rules });
  };

  const removeRule = (idx: number) => {
    update({
      branchingRules: (field.branchingRules ?? []).filter((_, i) => i !== idx),
    });
  };

  const otherFields = allFields.filter((f) => f.id !== field.id);
  const hasOptions = field.type === "dropdown" || field.type === "radio";
  const hasValidation =
    field.type === "text" ||
    field.type === "textarea" ||
    field.type === "email" ||
    field.type === "phone" ||
    field.type === "number";
  const isSectionBreak = field.type === "section_break";

  return (
    <Card className="bg-slate-900 border-slate-700 h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm text-slate-300">Field Settings</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="space-y-4">
            {/* Label */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Label</Label>
              <Input
                value={field.label}
                onChange={(e) => update({ label: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Type</Label>
              <Select
                value={field.type}
                onValueChange={(v) => update({ type: v as FieldType })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {FIELD_TYPES.map((ft) => (
                    <SelectItem
                      key={ft.type}
                      value={ft.type}
                      className="text-slate-200"
                    >
                      {ft.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!isSectionBreak && (
              <>
                {/* Required */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-400">Required</Label>
                  <Switch
                    checked={field.required}
                    onCheckedChange={(c) => update({ required: c })}
                  />
                </div>

                {/* Placeholder */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">Placeholder</Label>
                  <Input
                    value={field.placeholder}
                    onChange={(e) =>
                      update({ placeholder: e.target.value })
                    }
                    className="bg-slate-800 border-slate-700 text-slate-200"
                  />
                </div>
              </>
            )}

            {/* Options editor */}
            {hasOptions && (
              <>
                <Separator className="bg-slate-700" />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-400">Options</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-indigo-400"
                      onClick={addOption}
                    >
                      <Plus className="mr-1 h-3 w-3" /> Add
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    {(field.options ?? []).map((opt, idx) => (
                      <div key={opt.id} className="flex items-center gap-1.5">
                        <Input
                          value={opt.label}
                          onChange={(e) =>
                            updateOption(idx, {
                              label: e.target.value,
                              value: e.target.value
                                .toLowerCase()
                                .replace(/\s+/g, "_"),
                            })
                          }
                          className="h-7 bg-slate-800 border-slate-700 text-slate-200 text-xs"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-red-400"
                          onClick={() => removeOption(idx)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Validation */}
            {hasValidation && (
              <>
                <Separator className="bg-slate-700" />
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Validation</Label>
                  {field.type === "number" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-500">Min</Label>
                        <Input
                          type="number"
                          value={field.validation?.min ?? ""}
                          onChange={(e) =>
                            update({
                              validation: {
                                ...field.validation,
                                min: e.target.value
                                  ? Number(e.target.value)
                                  : undefined,
                              },
                            })
                          }
                          className="h-7 bg-slate-800 border-slate-700 text-slate-200 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-500">Max</Label>
                        <Input
                          type="number"
                          value={field.validation?.max ?? ""}
                          onChange={(e) =>
                            update({
                              validation: {
                                ...field.validation,
                                max: e.target.value
                                  ? Number(e.target.value)
                                  : undefined,
                              },
                            })
                          }
                          className="h-7 bg-slate-800 border-slate-700 text-slate-200 text-xs"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-500">
                          Min Length
                        </Label>
                        <Input
                          type="number"
                          value={field.validation?.minLength ?? ""}
                          onChange={(e) =>
                            update({
                              validation: {
                                ...field.validation,
                                minLength: e.target.value
                                  ? Number(e.target.value)
                                  : undefined,
                              },
                            })
                          }
                          className="h-7 bg-slate-800 border-slate-700 text-slate-200 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-500">
                          Max Length
                        </Label>
                        <Input
                          type="number"
                          value={field.validation?.maxLength ?? ""}
                          onChange={(e) =>
                            update({
                              validation: {
                                ...field.validation,
                                maxLength: e.target.value
                                  ? Number(e.target.value)
                                  : undefined,
                              },
                            })
                          }
                          className="h-7 bg-slate-800 border-slate-700 text-slate-200 text-xs"
                        />
                      </div>
                    </div>
                  )}
                  {field.type !== "number" && (
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-500">
                        Regex Pattern
                      </Label>
                      <Input
                        value={field.validation?.pattern ?? ""}
                        onChange={(e) =>
                          update({
                            validation: {
                              ...field.validation,
                              pattern: e.target.value || undefined,
                            },
                          })
                        }
                        placeholder="^[a-zA-Z]+$"
                        className="bg-slate-800 border-slate-700 text-slate-200 text-xs"
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Branching Logic */}
            {!isSectionBreak && otherFields.length > 0 && (
              <>
                <Separator className="bg-slate-700" />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-400">
                      Branching Rules
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-indigo-400"
                      onClick={addRule}
                    >
                      <Plus className="mr-1 h-3 w-3" /> Add Rule
                    </Button>
                  </div>
                  {(field.branchingRules ?? []).map((rule, idx) => (
                    <div
                      key={rule.id}
                      className="rounded-md border border-slate-700 p-2 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>Rule {idx + 1}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-red-400"
                          onClick={() => removeRule(idx)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-500">
                          When field
                        </Label>
                        <Select
                          value={rule.sourceFieldId}
                          onValueChange={(v) =>
                            updateRule(idx, { sourceFieldId: v })
                          }
                        >
                          <SelectTrigger className="h-7 bg-slate-800 border-slate-700 text-slate-200 text-xs">
                            <SelectValue placeholder="Select field" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {otherFields.map((f) => (
                              <SelectItem
                                key={f.id}
                                value={f.id}
                                className="text-slate-200 text-xs"
                              >
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-slate-500">
                            Operator
                          </Label>
                          <Select
                            value={rule.operator}
                            onValueChange={(v) =>
                              updateRule(idx, {
                                operator: v as BranchingRule["operator"],
                              })
                            }
                          >
                            <SelectTrigger className="h-7 bg-slate-800 border-slate-700 text-slate-200 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              {OPERATORS.map((op) => (
                                <SelectItem
                                  key={op.value}
                                  value={op.value}
                                  className="text-slate-200 text-xs"
                                >
                                  {op.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-slate-500">
                            Value
                          </Label>
                          <Input
                            value={rule.value}
                            onChange={(e) =>
                              updateRule(idx, { value: e.target.value })
                            }
                            className="h-7 bg-slate-800 border-slate-700 text-slate-200 text-xs"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-slate-500">
                            Action
                          </Label>
                          <Select
                            value={rule.action}
                            onValueChange={(v) =>
                              updateRule(idx, {
                                action: v as BranchingRule["action"],
                              })
                            }
                          >
                            <SelectTrigger className="h-7 bg-slate-800 border-slate-700 text-slate-200 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              <SelectItem value="show" className="text-slate-200 text-xs">
                                Show
                              </SelectItem>
                              <SelectItem value="hide" className="text-slate-200 text-xs">
                                Hide
                              </SelectItem>
                              <SelectItem value="skip_to" className="text-slate-200 text-xs">
                                Skip to
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-slate-500">
                            Target Field
                          </Label>
                          <Select
                            value={rule.targetFieldId}
                            onValueChange={(v) =>
                              updateRule(idx, { targetFieldId: v })
                            }
                          >
                            <SelectTrigger className="h-7 bg-slate-800 border-slate-700 text-slate-200 text-xs">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              {otherFields.map((f) => (
                                <SelectItem
                                  key={f.id}
                                  value={f.id}
                                  className="text-slate-200 text-xs"
                                >
                                  {f.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ---------- Field Preview (used in center panel) ----------
function FieldPreview({ field }: { field: FormField }) {
  if (field.type === "section_break") {
    return (
      <div className="border-t border-slate-700 pt-4">
        <h3 className="text-base font-semibold text-slate-200">
          {field.label || "Section"}
        </h3>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-slate-300">
        {field.label || "Untitled"}
        {field.required && <span className="ml-1 text-red-400">*</span>}
      </Label>
      {field.type === "textarea" ? (
        <Textarea
          disabled
          placeholder={field.placeholder}
          className="bg-slate-800 border-slate-700 text-slate-400 min-h-[80px] resize-none"
        />
      ) : field.type === "dropdown" ? (
        <Select disabled>
          <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-400">
            <SelectValue placeholder={field.placeholder || "Select..."} />
          </SelectTrigger>
        </Select>
      ) : field.type === "checkbox" ? (
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border border-slate-600 bg-slate-800" />
          <span className="text-sm text-slate-400">
            {field.placeholder || "Checkbox"}
          </span>
        </div>
      ) : field.type === "radio" ? (
        <div className="space-y-1.5">
          {(field.options ?? []).map((opt) => (
            <div key={opt.id} className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full border border-slate-600 bg-slate-800" />
              <span className="text-sm text-slate-400">{opt.label}</span>
            </div>
          ))}
        </div>
      ) : field.type === "rating" ? (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className="text-xl text-slate-600">
              ★
            </span>
          ))}
        </div>
      ) : field.type === "nps" ? (
        <div className="flex gap-1">
          {Array.from({ length: 11 }, (_, i) => (
            <div
              key={i}
              className="flex h-7 w-7 items-center justify-center rounded border border-slate-700 bg-slate-800 text-xs text-slate-400"
            >
              {i}
            </div>
          ))}
        </div>
      ) : field.type === "file_upload" ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-slate-700 bg-slate-800/50 p-4">
          <Download className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-400">
            {field.placeholder || "Click to upload"}
          </span>
        </div>
      ) : (
        <Input
          disabled
          type={
            field.type === "number"
              ? "number"
              : field.type === "date"
              ? "date"
              : field.type === "email"
              ? "email"
              : field.type === "phone"
              ? "tel"
              : "text"
          }
          placeholder={field.placeholder}
          className="bg-slate-800 border-slate-700 text-slate-400"
        />
      )}
    </div>
  );
}

// ---------- Response Viewer ----------
function ResponseViewer({
  form,
  responses,
  loading,
  page,
  total,
  onPageChange,
  onExport,
}: {
  form: Form;
  responses: FormResponse[];
  loading: boolean;
  page: number;
  total: number;
  onPageChange: (p: number) => void;
  onExport: () => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-200">
            Responses — {form.title}
          </h2>
          <p className="text-sm text-slate-400">
            {total} response{total !== 1 ? "s" : ""} collected
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-slate-700 text-slate-300"
          onClick={onExport}
        >
          <Download className="mr-1.5 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-4 py-3 text-left font-medium text-slate-400">
                    #
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-400">
                    Submitted
                  </th>
                  {form.fields
                    .filter((f) => f.type !== "section_break")
                    .map((f) => (
                      <th
                        key={f.id}
                        className="px-4 py-3 text-left font-medium text-slate-400"
                      >
                        {f.label}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-800">
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-8 bg-slate-800" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-24 bg-slate-800" />
                      </td>
                      {form.fields
                        .filter((f) => f.type !== "section_break")
                        .map((f) => (
                          <td key={f.id} className="px-4 py-3">
                            <Skeleton className="h-4 w-20 bg-slate-800" />
                          </td>
                        ))}
                    </tr>
                  ))
                ) : responses.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2 + form.fields.filter((f) => f.type !== "section_break").length}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      No responses yet.
                    </td>
                  </tr>
                ) : (
                  responses.map((r, idx) => (
                    <tr
                      key={r.id}
                      className="border-b border-slate-800 hover:bg-slate-800/50"
                    >
                      <td className="px-4 py-3 text-slate-400">
                        {(page - 1) * ITEMS_PER_PAGE + idx + 1}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(r.submittedAt).toLocaleDateString()}
                      </td>
                      {form.fields
                        .filter((f) => f.type !== "section_break")
                        .map((f) => (
                          <td key={f.id} className="px-4 py-3 text-slate-300">
                            {String(r.answers[f.id] ?? "—")}
                          </td>
                        ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 text-slate-300"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-400">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 text-slate-300"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------- Template Picker ----------
function TemplatePicker({
  onSelect,
  onBlank,
}: {
  onSelect: (fields: FormField[]) => void;
  onBlank: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <button
        onClick={onBlank}
        className="rounded-lg border border-dashed border-slate-600 p-6 text-left transition hover:border-indigo-500 hover:bg-slate-800/50"
      >
        <FileText className="mb-2 h-8 w-8 text-slate-500" />
        <p className="text-sm font-medium text-slate-200">Blank Form</p>
        <p className="text-xs text-slate-500">Start from scratch</p>
      </button>
      {TEMPLATES.map((t) => (
        <button
          key={t.id}
          onClick={() =>
            onSelect(
              t.fields.map((f) => ({ ...f, id: uid() }))
            )
          }
          className="rounded-lg border border-slate-700 p-6 text-left transition hover:border-indigo-500 hover:bg-slate-800/50"
        >
          <FileText className="mb-2 h-8 w-8 text-indigo-400" />
          <p className="text-sm font-medium text-slate-200">{t.title}</p>
          <p className="text-xs text-slate-500">
            {t.fields.length} fields • {t.description}
          </p>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface FormBuilderProps {
  mode?: "builder" | "responses";
  workspaceId: string;
  formId?: string;
}

export default function FormBuilder({
  mode = "builder",
  workspaceId,
  formId,
}: FormBuilderProps) {
  const { activeWorkspaceId } = useWorkspace();

  // --- State ---
  const [view, setView] = useState<ViewMode>(mode === "responses" ? "responses" : "list");
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFormId, setCurrentFormId] = useState<string | null>(formId ?? null);

  // Builder state
  const [formTitle, setFormTitle] = useState("Untitled Form");
  const [formDescription, setFormDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [slug, setSlug] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  // Response viewer state
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [responseLoading, setResponseLoading] = useState(false);
  const [responsePage, setResponsePage] = useState(1);
  const [responseTotal, setResponseTotal] = useState(0);

  // UI state
  const [showNewFormDialog, setShowNewFormDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // --- Data Fetching ---
  const fetchForms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/forms?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setForms(data);
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const fetchForm = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/forms/${id}`);
      if (res.ok) {
        const data: Form = await res.json();
        setFormTitle(data.title);
        setFormDescription(data.description);
        setIsPublic(data.isPublic);
        setSlug(data.slug ?? "");
        setFields(data.fields);
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchResponses = useCallback(async (id: string, page: number) => {
    try {
      setResponseLoading(true);
      const res = await fetch(
        `/api/forms/${id}/responses?page=${page}&limit=${ITEMS_PER_PAGE}`
      );
      if (res.ok) {
        const data = await res.json();
        setResponses(data.responses ?? data);
        setResponseTotal(data.total ?? data.length);
      }
    } catch {
      // silently handle
    } finally {
      setResponseLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  useEffect(() => {
    if (currentFormId && (view === "builder" || view === "responses")) {
      fetchForm(currentFormId);
      if (view === "responses") {
        fetchResponses(currentFormId, responsePage);
      }
    }
  }, [currentFormId, view, fetchForm, fetchResponses, responsePage]);

  // --- Actions ---
  const handleCreateForm = async (initialFields: FormField[]) => {
    try {
      setSaving(true);
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle || "Untitled Form",
          description: formDescription,
          workspaceId,
          fields: initialFields.length > 0 ? initialFields : fields,
          isPublic,
          slug: slug || undefined,
        }),
      });
      if (res.ok) {
        const data: Form = await res.json();
        setForms((prev) => [data, ...prev]);
        setCurrentFormId(data.id);
        setFormTitle(data.title);
        setFields(data.fields);
        setShowNewFormDialog(false);
        setView("builder");
      }
    } catch {
      // handle error
    } finally {
      setSaving(false);
    }
  };

  const handleSaveForm = async () => {
    if (!currentFormId) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/forms/${currentFormId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription,
          fields,
          isPublic,
          slug: slug || undefined,
        }),
      });
      if (res.ok) {
        const data: Form = await res.json();
        setForms((prev) => prev.map((f) => (f.id === data.id ? data : f)));
      }
    } catch {
      // handle error
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteForm = async (id: string) => {
    try {
      const res = await fetch(`/api/forms/${id}`, { method: "DELETE" });
      if (res.ok) {
        setForms((prev) => prev.filter((f) => f.id !== id));
        if (currentFormId === id) {
          setCurrentFormId(null);
          setView("list");
        }
      }
    } catch {
      // handle error
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleDuplicateForm = async (id: string) => {
    try {
      const res = await fetch(`/api/forms/${id}/duplicate`, {
        method: "POST",
      });
      if (res.ok) {
        const data: Form = await res.json();
        setForms((prev) => [data, ...prev]);
      }
    } catch {
      // handle error
    }
  };

  const handleExport = async (id: string) => {
    window.open(`/api/forms/${id}/export?format=csv`, "_blank");
  };

  // --- Field Operations ---
  const addField = (type: FieldType) => {
    const f = createField({ type });
    if (type === "dropdown" || type === "radio") {
      f.options = [
        { id: uid(), label: "Option 1", value: "option_1" },
        { id: uid(), label: "Option 2", value: "option_2" },
      ];
    }
    setFields((prev) => [...prev, f]);
    setSelectedFieldId(f.id);
  };

  const updateField = (updated: FormField) => {
    setFields((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  };

  const deleteField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const duplicateField = (id: string) => {
    const field = fields.find((f) => f.id === id);
    if (!field) return;
    const dup = { ...field, id: uid(), label: field.label + " (copy)" };
    if (dup.options) {
      dup.options = dup.options.map((o) => ({ ...o, id: uid() }));
    }
    const idx = fields.findIndex((f) => f.id === id);
    const next = [...fields];
    next.splice(idx + 1, 0, dup);
    setFields(next);
    setSelectedFieldId(dup.id);
  };

  const moveField = (id: string, dir: -1 | 1) => {
    const idx = fields.findIndex((f) => f.id === id);
    if (idx === -1) return;
    const target = idx + dir;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[idx], next[target]] = [next[target], next[idx]];
    setFields(next);
  };

  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? null;

  // --- Render ---
  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-3">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-indigo-400" />
          <h1 className="text-lg font-semibold">Forms</h1>
        </div>
        <div className="flex items-center gap-2">
          {view === "builder" && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-700 text-slate-300"
                onClick={() => setShowSettingsDialog(true)}
              >
                <Settings className="mr-1.5 h-4 w-4" /> Settings
              </Button>
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
                onClick={handleSaveForm}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </>
          )}
          {view === "responses" && (
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-300"
              onClick={() => setView("builder")}
            >
              <Edit className="mr-1.5 h-4 w-4" /> Edit Form
            </Button>
          )}
          {view === "list" && (
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
              onClick={() => {
                setFormTitle("Untitled Form");
                setFormDescription("");
                setIsPublic(false);
                setSlug("");
                setFields([]);
                setSelectedFieldId(null);
                setShowNewFormDialog(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" /> New Form
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-6">
        {/* ---- List View ---- */}
        {view === "list" && (
          <div className="space-y-4">
            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card
                    key={i}
                    className="bg-slate-900 border-slate-700"
                  >
                    <CardHeader>
                      <Skeleton className="h-5 w-40 bg-slate-800" />
                      <Skeleton className="h-4 w-24 bg-slate-800" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-32 bg-slate-800" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : forms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <FileText className="mb-4 h-12 w-12 text-slate-700" />
                <h3 className="text-lg font-medium text-slate-300">
                  No forms yet
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Create your first form to start collecting responses.
                </p>
                <Button
                  className="mt-4 bg-indigo-600 hover:bg-indigo-500"
                  onClick={() => {
                    setFormTitle("Untitled Form");
                    setFormDescription("");
                    setIsPublic(false);
                    setSlug("");
                    setFields([]);
                    setSelectedFieldId(null);
                    setShowNewFormDialog(true);
                  }}
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Create Form
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {forms.map((form) => (
                  <Card
                    key={form.id}
                    className="bg-slate-900 border-slate-700 transition hover:border-slate-600"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="truncate text-base text-slate-200">
                            {form.title}
                          </CardTitle>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {form.fields.length} field
                            {form.fields.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-slate-800 border-slate-700"
                          >
                            <DropdownMenuItem
                              className="text-slate-300 cursor-pointer"
                              onClick={() => {
                                setCurrentFormId(form.id);
                                setView("builder");
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-slate-300 cursor-pointer"
                              onClick={() => handleDuplicateForm(form.id)}
                            >
                              <Copy className="mr-2 h-4 w-4" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-slate-300 cursor-pointer"
                              onClick={() => {
                                setCurrentFormId(form.id);
                                setView("responses");
                              }}
                            >
                              <BarChart3 className="mr-2 h-4 w-4" /> Responses
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-slate-300 cursor-pointer"
                              onClick={() => handleExport(form.id)}
                            >
                              <Download className="mr-2 h-4 w-4" /> Export
                            </DropdownMenuItem>
                            <Separator className="bg-slate-700 my-1" />
                            <DropdownMenuItem
                              className="text-red-400 cursor-pointer"
                              onClick={() => setDeleteConfirmId(form.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${
                            form.isPublic
                              ? "bg-green-500/20 text-green-400"
                              : "bg-slate-700 text-slate-400"
                          }`}
                        >
                          {form.isPublic ? (
                            <Globe className="mr-1 h-3 w-3" />
                          ) : (
                            <Lock className="mr-1 h-3 w-3" />
                          )}
                          {form.isPublic ? "Public" : "Private"}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-slate-700 text-slate-400"
                        >
                          {form.responseCount} response
                          {form.responseCount !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-slate-600">
                        Created {new Date(form.createdAt).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---- Builder View ---- */}
        {view === "builder" && (
          <div className="flex h-full gap-4">
            {/* Left: Field Palette */}
            <div className="w-52 shrink-0">
              <FieldPalette onAdd={addField} />
            </div>

            {/* Center: Form Preview / Live Editor */}
            <div className="flex-1 overflow-y-auto">
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader className="pb-4">
                  <Input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Form Title"
                    className="border-0 bg-transparent text-xl font-semibold text-slate-200 focus-visible:ring-0 px-0 h-auto"
                  />
                  <Input
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Form description (optional)"
                    className="border-0 bg-transparent text-sm text-slate-400 focus-visible:ring-0 px-0 h-auto mt-1"
                  />
                </CardHeader>
                <CardContent className="space-y-3">
                  {fields.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 py-16 text-center">
                      <Plus className="mb-2 h-8 w-8 text-slate-600" />
                      <p className="text-sm text-slate-400">
                        Click a field from the palette to add it
                      </p>
                    </div>
                  ) : (
                    fields.map((field, idx) => (
                      <div
                        key={field.id}
                        onClick={() => setSelectedFieldId(field.id)}
                        className={`cursor-pointer rounded-lg border p-4 transition ${
                          selectedFieldId === field.id
                            ? "border-indigo-500 ring-1 ring-indigo-500/30 bg-slate-800/60"
                            : "border-slate-700 hover:border-slate-600 bg-slate-800/30"
                        }`}
                      >
                        <FieldPreview field={field} />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right: Field Settings */}
            <div className="w-72 shrink-0">
              {selectedField ? (
                <FieldSettings
                  field={selectedField}
                  allFields={fields}
                  onChange={updateField}
                  onClose={() => setSelectedFieldId(null)}
                />
              ) : (
                <Card className="bg-slate-900 border-slate-700 h-full">
                  <CardContent className="flex flex-col items-center justify-center h-full text-center">
                    <Settings className="mb-3 h-8 w-8 text-slate-700" />
                    <p className="text-sm text-slate-500">
                      Select a field to edit its settings
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* ---- Responses View ---- */}
        {view === "responses" && currentFormId && (
          <ResponseViewer
            form={
              forms.find((f) => f.id === currentFormId) ?? {
                id: currentFormId,
                title: formTitle,
                description: formDescription,
                workspaceId,
                fields,
                isPublic,
                slug,
                responseCount: responseTotal,
                createdAt: "",
                updatedAt: "",
              }
            }
            responses={responses}
            loading={responseLoading}
            page={responsePage}
            total={responseTotal}
            onPageChange={setResponsePage}
            onExport={() => handleExport(currentFormId)}
          />
        )}
      </div>

      {/* ---- New Form Dialog ---- */}
      <Dialog open={showNewFormDialog} onOpenChange={setShowNewFormDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-200">Create New Form</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Form Title</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="My Form"
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Description</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional description"
                className="bg-slate-800 border-slate-700 text-slate-200 min-h-[60px] resize-none"
              />
            </div>
            <Separator className="bg-slate-700" />
            <div>
              <Label className="text-xs text-slate-400 mb-2 block">
                Choose a template
              </Label>
              <TemplatePicker
                onBlank={() => handleCreateForm([])}
                onSelect={(f) => {
                  setFields(f);
                  handleCreateForm(f);
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Form Settings Dialog ---- */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-200">Form Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Title</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Description</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-200 min-h-[60px] resize-none"
              />
            </div>
            <Separator className="bg-slate-700" />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-slate-300">Public</Label>
                <p className="text-xs text-slate-500">
                  Anyone with the link can submit
                </p>
              </div>
              <Switch
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>
            {isPublic && (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Custom Slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 shrink-0">
                    /forms/
                  </span>
                  <Input
                    value={slug}
                    onChange={(e) =>
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, "-")
                      )
                    }
                    placeholder="my-form"
                    className="bg-slate-800 border-slate-700 text-slate-200"
                  />
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Delete Confirmation Dialog ---- */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null);
        }}
      >
        <DialogContent className="bg-slate-900 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-slate-200">Delete Form</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400">
            Are you sure you want to delete this form? This action cannot be
            undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-300"
              onClick={() => setDeleteConfirmId(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-500 text-white"
              onClick={() => deleteConfirmId && handleDeleteForm(deleteConfirmId)}
            >
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
