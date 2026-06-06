"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Layout, Pin, Save, Copy, Star, Layers, GitBranch,
  Table2, Grid3X3, FunctionSquare, Beaker, Lightbulb,
  Archive, Bookmark, Box, Columns3, ListChecks,
  ArrowUpDown, Filter, Plus, Trash2, Eye, Lock, Unlock,
  ChevronDown, ChevronRight, Check, Download, Upload,
  Settings, GanttChart, Link2, Zap, Globe
} from "lucide-react";

interface AdvancedFeaturesPanelProps {
  workspaceId: string;
  boardId: string;
}

type FeatureTab = "pinning" | "templates" | "rollups" | "formula" | "crossBoard" | "crossWs";

const TABS: { id: FeatureTab; label: string; icon: any }[] = [
  { id: "pinning", label: "Column Pinning", icon: Pin },
  { id: "templates", label: "Templates", icon: Bookmark },
  { id: "rollups", label: "Rollups", icon: Layers },
  { id: "formula", label: "Formula Logic", icon: FunctionSquare },
  { id: "crossBoard", label: "Cross-Board", icon: GitBranch },
  { id: "crossWs", label: "Cross-Workspace", icon: GanttChart },
];

const COLUMN_TEMPLATES = [
  { id: "ct-1", name: "Status Pipeline", desc: "Todo → In Progress → Done", columns: ["To Do", "In Progress", "Review", "Done"], color: "#6366f1" },
  { id: "ct-2", name: "Sprint Board", desc: "Backlog → This Sprint → Completed", columns: ["Backlog", "This Sprint", "In Progress", "Completed"], color: "#10b981" },
  { id: "ct-3", name: "Content Workflow", desc: "Idea → Writing → Editing → Published", columns: ["Idea", "Writing", "Editing", "Published"], color: "#f59e0b" },
  { id: "ct-4", name: "Support Pipeline", desc: "New → Assigned → In Progress → Resolved", columns: ["New", "Assigned", "In Progress", "Resolved"], color: "#ef4444" },
  { id: "ct-5", name: "Sales CRM", desc: "Lead → Contacted → Qualified → Closed", columns: ["Lead", "Contacted", "Qualified", "Closed Won", "Closed Lost"], color: "#8b5cf6" },
];

const BOARD_TEMPLATES = [
  { id: "bt-1", name: "Project Management", desc: "Full project tracking with milestones", icon: Layout, tasks: 24, columns: 4 },
  { id: "bt-2", name: "Bug Tracker", desc: "Issue tracking with priority and severity", icon: Beaker, tasks: 18, columns: 3 },
  { id: "bt-3", name: "Content Calendar", desc: "Editorial calendar for content teams", icon: Grid3X3, tasks: 30, columns: 5 },
  { id: "bt-4", name: "CRM Pipeline", desc: "Sales pipeline with deal tracking", icon: Table2, tasks: 15, columns: 5 },
  { id: "bt-5", name: "HR Onboarding", desc: "Employee onboarding checklist", icon: ListChecks, tasks: 12, columns: 3 },
];

const FORMULA_EXAMPLES = [
  { name: "Days Until Due", formula: "DATEDIFF(dueDate, NOW())", result: "14", desc: "Calculates days remaining until due date" },
  { name: "Completion %", formula: "COUNTIF(subtasks, completed=true) / COUNT(subtasks) * 100", result: "75%", desc: "Percentage of completed subtasks" },
  { name: "Priority Score", formula: "IF(priority='high', 3, IF(priority='medium', 2, 1))", result: "3", desc: "Numeric priority weighting" },
  { name: "Overdue Flag", formula: "IF(AND(dueDate < NOW(), status != 'done'), '⚠️ Overdue', '✅ On Track')", result: "✅ On Track", desc: "Flags overdue items" },
  { name: "Task Complexity", formula: "estimatedHours * subtaskCount * priorityWeight", result: "12", desc: "Weighted complexity metric" },
];

export default function AdvancedFeaturesPanel({ workspaceId, boardId }: AdvancedFeaturesPanelProps) {
  const [activeTab, setActiveTab] = useState<FeatureTab>("pinning");
  const [pinnedColumns, setPinnedColumns] = useState<string[]>(["Status", "Priority"]);
  const [enabledTemplates, setEnabledTemplates] = useState<string[]>(["ct-1", "ct-3"]);
  const [selectedBoardTemplate, setSelectedBoardTemplate] = useState<string | null>(null);
  const [rollupConfigs, setRollupConfigs] = useState([
    { id: "r-1", name: "Subtask Progress", source: "subtasks", target: "parent", operation: "percentage", active: true },
    { id: "r-2", name: "Total Estimates", source: "subtasks", target: "parent", operation: "sum", active: false },
  ]);
  const [formulaFields, setFormulaFields] = useState([
    { name: "Days Remaining", formula: "DATEDIFF(dueDate, NOW())", active: true },
    { name: "Health Status", formula: "IF(overdue, 'Critical', 'Good')", active: false },
  ]);

  const togglePin = (col: string) => {
    setPinnedColumns(prev =>
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <Beaker className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">Advanced Features</h3>
          <Badge variant="outline" className="text-[8px] h-5 ml-auto border-amber-200 text-amber-600">
            <Lightbulb className="h-2.5 w-2.5 mr-1" /> Hidden Gems
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">Pinning, templates, rollups, formulas & cross-board tools</p>
      </div>

      <div className="flex gap-1 p-3 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all whitespace-nowrap",
                activeTab === tab.id ? "bg-primary text-white" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              )}
            >
              <Icon className="h-3 w-3" /> {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {activeTab === "pinning" && (
          <Card className="border shadow-sm">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Pin className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-semibold">Column Pinning</span>
                <p className="text-[9px] text-muted-foreground ml-auto">Freeze important columns while scrolling</p>
              </div>
              <p className="text-[10px] text-slate-500 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border">
                Pinned columns stay fixed on the left side of the table view. Toggle which columns should be pinned.
              </p>
              <div className="space-y-1">
                {["Status", "Priority", "Task Name", "Assignee", "Due Date", "Tags", "Progress", "Time Tracked"].map((col) => {
                  const pinned = pinnedColumns.includes(col);
                  return (
                    <div key={col} className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                      <div className="flex items-center gap-2">
                        {pinned ? <Lock className="h-3 w-3 text-primary" /> : <Unlock className="h-3 w-3 text-slate-300" />}
                        <span className="text-xs">{col}</span>
                      </div>
                      <Switch checked={pinned} onCheckedChange={() => togglePin(col)} className="scale-75" />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="h-7 text-[10px]"
                  onClick={() => setPinnedColumns(["Status", "Priority", "Task Name"])}>
                  <Pin className="h-3 w-3 mr-1" /> Reset Defaults
                </Button>
                <Button size="sm" className="h-7 text-[10px] bg-primary"
                  onClick={() => toast.success("Pinning settings saved")}>
                  <Save className="h-3 w-3 mr-1" /> Save
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "templates" && (
          <div className="space-y-4">
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-500">Column Templates</h4>
                  <Button size="sm" className="h-7 text-[10px] gap-1">
                    <Save className="h-3 w-3" /> Save Current
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mb-3">Reusable column configurations — apply to any board</p>
                <div className="grid grid-cols-2 gap-2">
                  {COLUMN_TEMPLATES.map((tpl) => {
                    const enabled = enabledTemplates.includes(tpl.id);
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => setEnabledTemplates(prev =>
                          prev.includes(tpl.id) ? prev.filter(t => t !== tpl.id) : [...prev, tpl.id]
                        )}
                        className={cn(
                          "flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all",
                          enabled
                            ? "border-primary bg-muted dark:bg-primary/10"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        )}
                        style={enabled ? { borderColor: tpl.color } : {}}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: tpl.color }} />
                          <span className="text-xs font-semibold">{tpl.name}</span>
                          {enabled && <Check className="h-3 w-3 ml-auto" style={{ color: tpl.color }} />}
                        </div>
                        <p className="text-[9px] text-muted-foreground">{tpl.desc}</p>
                        <div className="flex gap-1 mt-1">
                          {tpl.columns.map((c, i) => (
                            <Badge key={i} variant="outline" className="text-[7px] px-1.5 h-4">{c}</Badge>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-500">Board Templates</h4>
                  <Button size="sm" className="h-7 text-[10px] gap-1">
                    <Download className="h-3 w-3" /> Import
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mb-3">Pre-built board structures with columns and sample data</p>
                <div className="space-y-2">
                  {BOARD_TEMPLATES.map((tpl) => {
                    const Icon = tpl.icon;
                    const selected = selectedBoardTemplate === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => setSelectedBoardTemplate(selected ? null : tpl.id)}
                        className={cn(
                          "flex items-center gap-3 w-full p-3 rounded-xl border text-left transition-all",
                          selected
                            ? "border-primary bg-muted dark:bg-primary/10"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        )}
                      >
                        <Icon className="h-5 w-5 text-slate-400" />
                        <div className="flex-1">
                          <span className="text-xs font-semibold">{tpl.name}</span>
                          <p className="text-[9px] text-muted-foreground">{tpl.desc}</p>
                        </div>
                        <div className="flex gap-2 text-[9px] text-slate-400">
                          <span>{tpl.columns} cols</span>
                          <span>{tpl.tasks} tasks</span>
                        </div>
                        {selected && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    );
                  })}
                </div>
                {selectedBoardTemplate && (
                  <Button className="w-full mt-3 h-8 text-[10px] bg-primary gap-1">
                    <Plus className="h-3 w-3" /> Create Board from Template
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "rollups" && (
          <div className="space-y-4">
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-500">Subitem Rollups</h4>
                  <Button size="sm" className="h-7 text-[10px] gap-1">
                    <Plus className="h-3 w-3" /> Add Rollup
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mb-3">Aggregate data from subtasks into parent items</p>
                {rollupConfigs.map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2.5 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                    <div>
                      <span className="text-xs font-medium">{r.name}</span>
                      <p className="text-[9px] text-muted-foreground">
                        {r.operation} of {r.source} → {r.target}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[8px] h-4">{r.operation}</Badge>
                      <Switch checked={r.active} className="scale-75" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border border-dashed border-slate-200 dark:border-slate-700 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-semibold">Rollup Operations</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { op: "SUM", desc: "Add values", eg: "Total hours" },
                    { op: "AVG", desc: "Average values", eg: "Avg rating" },
                    { op: "COUNT", desc: "Count items", eg: "Subtask count" },
                    { op: "MIN", desc: "Minimum value", eg: "Earliest date" },
                    { op: "MAX", desc: "Maximum value", eg: "Latest date" },
                    { op: "%", desc: "Percentage", eg: "Completion %" },
                  ].map((op) => (
                    <div key={op.op} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border text-center">
                      <span className="text-xs font-bold text-primary">{op.op}</span>
                      <p className="text-[8px] text-slate-500 mt-0.5">{op.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "formula" && (
          <div className="space-y-4">
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-500">Formula Columns</h4>
                  <Button size="sm" className="h-7 text-[10px] gap-1">
                    <Plus className="h-3 w-3" /> New Formula
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mb-3">Spreadsheet-like calculations using column values</p>

                <div className="space-y-3 mb-4">
                  {formulaFields.map((f, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold">{f.name}</span>
                        <Switch checked={f.active} className="scale-75" />
                      </div>
                      <code className="block text-[9px] font-mono bg-white dark:bg-slate-800 px-2 py-1 rounded border">{f.formula}</code>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-[10px]">
                    <FunctionSquare className="h-3 w-3 mr-1" /> Formula Reference
                  </Button>
                  <Button size="sm" className="h-7 text-[10px] bg-primary">
                    <Save className="h-3 w-3 mr-1" /> Save All
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <h4 className="text-xs font-bold text-slate-500 mb-3">Formula Examples</h4>
                <div className="space-y-2">
                  {FORMULA_EXAMPLES.map((ex, i) => (
                    <div key={i} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold">{ex.name}</span>
                        <Badge className="text-[8px] h-4 bg-primary/10 text-primary">{ex.result}</Badge>
                      </div>
                      <code className="block text-[9px] font-mono bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded">{ex.formula}</code>
                      <p className="text-[9px] text-muted-foreground mt-1">{ex.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "crossBoard" && (
          <div className="space-y-4">
            <Card className="border shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-semibold">Cross-Board Automations</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Automations that span multiple boards, syncing data and triggering actions across your workspace.</p>
                {[
                  { name: "CRM → Project Sync", trigger: "Deal Won in CRM", action: "Create Project Task", active: true, boards: "Sales → Engineering" },
                  { name: "Bug → Task Link", trigger: "Bug Reported", action: "Create Task in Dev Board", active: true, boards: "QA → Development" },
                  { name: "Client Update", trigger: "Project Status Change", action: "Notify Client Board", active: false, boards: "Internal → Client Portal" },
                ].map((auto, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium">{auto.name}</span>
                      <p className="text-[9px] text-muted-foreground">{auto.boards} &middot; {auto.trigger} → {auto.action}</p>
                    </div>
                    <Switch checked={auto.active} className="scale-75 ml-3" />
                  </div>
                ))}
                <Button size="sm" className="h-8 text-[10px] w-full gap-1">
                  <Plus className="h-3 w-3" /> Create Cross-Board Automation
                </Button>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-semibold">Connected Boards</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Boards that are linked via cross-board automations</p>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Layout className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-medium">Current Board</span>
                    <p className="text-[9px] text-muted-foreground">ID: {boardId?.slice(0, 12)}...</p>
                  </div>
                  <Zap className="h-4 w-4 text-amber-500" />
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Layout className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <span className="text-xs font-medium">Target Board</span>
                    <p className="text-[9px] text-muted-foreground">Select a board...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "crossWs" && (
          <div className="space-y-4">
            <Card className="border shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <GanttChart className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-semibold">Cross-Workspace Dashboards</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Create dashboards that aggregate data from multiple workspaces into a single view.</p>
                {[
                  { name: "Executive Overview", sources: 3, widgets: 8, lastSync: "5 min ago" },
                  { name: "Multi-Project KPIs", sources: 2, widgets: 6, lastSync: "1 hour ago" },
                  { name: "Client Portfolio", sources: 4, widgets: 12, lastSync: "Never" },
                ].map((dash, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{dash.name}</span>
                        <Badge variant="outline" className="text-[7px] h-4">{dash.sources} workspaces</Badge>
                      </div>
                      <p className="text-[9px] text-muted-foreground">{dash.widgets} widgets &middot; Last sync: {dash.lastSync}</p>
                    </div>
                    <Switch className="scale-75" />
                  </div>
                ))}
                <Button size="sm" className="h-8 text-[10px] w-full gap-1 bg-primary">
                  <Plus className="h-3 w-3" /> Create Cross-Workspace Dashboard
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-dashed border-slate-200 dark:border-slate-700">
              <CardContent className="p-4 text-center py-8">
                <Globe className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-500">Enterprise Feature</p>
                <p className="text-xs text-muted-foreground mt-1">Cross-workspace dashboards are available on Pro and higher plans</p>
                <Button size="sm" className="mt-4 h-8 text-[10px] bg-amber-500 hover:bg-amber-600 text-white">
                  Upgrade Plan
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
