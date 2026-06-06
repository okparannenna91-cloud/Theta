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
  Code, Terminal, Webhook, Key, Puzzle, AppWindow,
  Globe, Server, GitBranch, Copy, Check, Plus, Trash2,
  Eye, EyeOff, ExternalLink, FileJson, Layout, Play,
  Save, Download, Upload, RefreshCcw, AlertCircle
} from "lucide-react";

interface DeveloperPanelProps {
  workspaceId: string;
  boardId: string;
}

type DevTab = "webhooks" | "apikeys" | "widgets" | "columns" | "graphql";

const TABS: { id: DevTab; label: string; icon: any }[] = [
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "apikeys", label: "API Keys", icon: Key },
  { id: "widgets", label: "Custom Widgets", icon: Puzzle },
  { id: "columns", label: "Column Views", icon: Layout },
  { id: "graphql", label: "GraphQL", icon: FileJson },
];

const COLUMN_VIEW_TEMPLATES = [
  { id: "progress-bar", name: "Progress Bar", desc: "Visual progress indicator for numeric columns", type: "visual", preview: "▰▰▰▰▰▰▰▰▰▰ 90%" },
  { id: "color-dot", name: "Color Dot", desc: "Small colored circle for status columns", type: "visual", preview: "● High" },
  { id: "mini-chart", name: "Mini Chart", desc: "Inline sparkline for trend columns", type: "chart", preview: "📈 +12%" },
  { id: "badge-list", name: "Badge List", desc: "Compact tag/badge display for multi-select", type: "visual", preview: "[Tag1] [Tag2] [Tag3]" },
  { id: "progress-ring", name: "Progress Ring", desc: "Circular progress for completion columns", type: "visual", preview: "◉ 75%" },
  { id: "date-relative", name: "Relative Date", desc: "Shows '2 days ago' instead of full date", type: "text", preview: "2d ago" },
  { id: "avatar-group", name: "Avatar Group", desc: "Stacked avatars for assignee columns", type: "visual", preview: "⊙⊙⊙ +3" },
  { id: "link-preview", name: "Link Preview", desc: "Rich preview for URL columns", type: "rich", preview: "🔗 Open Preview" },
];

const WEBHOOK_PRESETS = [
  { name: "Task Created", desc: "Fires when a new task is created", url: `${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/task-created` },
  { name: "Task Updated", desc: "Fires when a task is modified", url: `${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/task-updated` },
  { name: "Task Deleted", desc: "Fires when a task is removed", url: `${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/task-deleted` },
  { name: "Board Changed", desc: "Fires on board structure changes", url: `${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/board-changed` },
];

export default function DeveloperPanel({ workspaceId, boardId }: DeveloperPanelProps) {
  const [activeTab, setActiveTab] = useState<DevTab>("webhooks");
  const [showApiKey, setShowApiKey] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>(["task.created"]);
  const [graphqlQuery, setGraphqlQuery] = useState(`query {
  tasks(boardId: "${boardId}") {
    id
    title
    status
    priority
    column { name }
  }
}`);

  const [webhooks, setWebhooks] = useState<{ id: string; url: string; events: string[]; active: boolean }[]>([
    { id: "wh-1", url: "https://api.thetaplatform.com/webhooks/task-events", events: ["task.created", "task.updated"], active: true },
  ]);

  const [columnViews, setColumnViews] = useState<string[]>([]);

  const toggleColumnView = (id: string) => {
    setColumnViews(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <Code className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">Developer</h3>
          <Badge variant="outline" className="text-[8px] h-5 ml-auto border-primary/20 text-primary">
            <Terminal className="h-2.5 w-2.5 mr-1" /> API
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">Webhooks, API keys, custom views & widgets</p>
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
        {activeTab === "webhooks" && (
          <>
            <Card className="border shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-500">Webhook Endpoints</h4>
                  <span className="text-[10px] text-slate-400">{webhooks.length} active</span>
                </div>

                {webhooks.map((wh) => (
                  <div key={wh.id} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <code className="text-[9px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded block truncate">{wh.url}</code>
                      <div className="flex gap-1 mt-1">
                        {wh.events.map(e => (
                          <Badge key={e} variant="outline" className="text-[7px] px-1.5 h-4">{e}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <Switch checked={wh.active} className="scale-75" />
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Trash2 className="h-3 w-3 text-slate-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border border-dashed border-slate-200 dark:border-slate-700 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-500">Add Webhook</h4>
                <Input
                  placeholder="https://your-service.com/webhook"
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  className="h-8 text-xs rounded-xl font-mono"
                />
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500">Events</label>
                  <div className="flex flex-wrap gap-1">
                    {["task.created", "task.updated", "task.deleted", "board.updated"].map((ev) => {
                      const selected = webhookEvents.includes(ev);
                      return (
                        <button
                          key={ev}
                          onClick={() => setWebhookEvents(prev =>
                            selected ? prev.filter(e => e !== ev) : [...prev, ev]
                          )}
                          className={cn(
                            "text-[9px] font-bold px-2 py-1 rounded-full border transition-all ",
                            selected
                              ? "bg-primary text-white border-primary"
                              : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300"
                          )}
                        >
                          {ev}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="h-8 text-[10px] w-full"
                  disabled={!newWebhookUrl.trim()}
                  onClick={() => {
                    setWebhooks(prev => [...prev, { id: `wh-${Date.now()}`, url: newWebhookUrl, events: webhookEvents, active: true }]);
                    setNewWebhookUrl("");
                    toast.success("Webhook added");
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Webhook
                </Button>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <h4 className="text-xs font-bold text-slate-500 mb-3">Preset Endpoints</h4>
                <div className="space-y-2">
                  {WEBHOOK_PRESETS.map((p) => (
                    <div key={p.name} className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                      <div>
                        <span className="text-[11px] font-medium">{p.name}</span>
                        <p className="text-[9px] text-muted-foreground">{p.desc}</p>
                      </div>
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 text-[9px] gap-1"
                        onClick={() => { navigator.clipboard.writeText(p.url); toast.success("Copied"); }}
                      >
                        <Copy className="h-3 w-3" /> Copy URL
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === "apikeys" && (
          <div className="space-y-4">
            <Card className="border shadow-sm">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-500">API Keys</h4>
                  <Button size="sm" className="h-7 text-[10px] gap-1">
                    <Plus className="h-3 w-3" /> Generate Key
                  </Button>
                </div>
                {[
                  { name: "Production", key: "theta_prod_2kL9mR7nP4qW8xJ1vB5cF3hT6yA0sDg", lastUsed: "2 hours ago", scopes: "read, write" },
                  { name: "Development", key: "theta_dev_8fG2hJ5kL1pQ3wE7rT9yU0iO4nM6bVc", lastUsed: "Never", scopes: "read" },
                ].map((apiKey) => (
                  <div key={apiKey.name} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold">{apiKey.name}</span>
                      <Badge variant="outline" className="text-[8px] h-5">{apiKey.scopes}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-[9px] font-mono bg-white dark:bg-slate-800 px-2 py-1.5 rounded border truncate">
                        {showApiKey ? apiKey.key : apiKey.key.slice(0, 12) + "••••••••••••••••"}
                      </code>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowApiKey(!showApiKey)}>
                        {showApiKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { navigator.clipboard.writeText(apiKey.key); toast.success("Copied"); }}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1.5">Last used: {apiKey.lastUsed}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardContent className="p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-500">Rate Limits</h4>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Requests/min", value: "60", limit: "100" },
                    { label: "Requests/hr", value: "1,247", limit: "5,000" },
                    { label: "Concurrent", value: "3", limit: "10" },
                  ].map((r) => (
                    <div key={r.label} className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border">
                      <p className="text-lg font-bold">{r.value}</p>
                      <p className="text-[8px] font-medium text-slate-500">{r.label}</p>
                      <p className="text-[7px] text-slate-400">Limit: {r.limit}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "widgets" && (
          <div className="space-y-4">
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-500">Custom Dashboard Widgets</h4>
                  <Button size="sm" className="h-7 text-[10px] gap-1">
                    <Plus className="h-3 w-3" /> New Widget
                  </Button>
                </div>
                {[
                  { name: "Sprint Velocity", type: "chart", desc: "Tracks story points per sprint", status: "active" },
                  { name: "Team Health", type: "visual", desc: "Team morale and burnout indicator", status: "active" },
                  { name: "Deployment Tracker", type: "timeline", desc: "Shows recent deployments", status: "draft" },
                ].map((widget, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                    <div>
                      <span className="text-xs font-medium">{widget.name}</span>
                      <p className="text-[9px] text-muted-foreground">{widget.desc}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn(
                        "text-[8px] h-4",
                        widget.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-500/10 text-slate-500"
                      )}>
                        {widget.status}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Play className="h-3 w-3 text-slate-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border border-dashed border-slate-200 dark:border-slate-700 shadow-sm">
              <CardContent className="p-4 text-center py-8">
                <AppWindow className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-500">Build Your Own Widget</p>
                <p className="text-xs text-muted-foreground mt-1">Use our SDK to create custom widgets with React</p>
                <div className="flex gap-2 justify-center mt-4">
                  <Button variant="outline" size="sm" className="h-8 text-[10px]">
                    <Download className="h-3 w-3 mr-1" /> SDK
                  </Button>
                  <Button size="sm" className="h-8 text-[10px]">
                    <FileJson className="h-3 w-3 mr-1" /> Documentation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "columns" && (
          <div className="space-y-4">
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <h4 className="text-xs font-bold text-slate-500 mb-3">Custom Column Views</h4>
                <p className="text-[10px] text-muted-foreground mb-4">Enable alternative rendering styles for your columns</p>
                <div className="grid grid-cols-2 gap-2">
                  {COLUMN_VIEW_TEMPLATES.map((tpl) => {
                    const enabled = columnViews.includes(tpl.id);
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => toggleColumnView(tpl.id)}
                        className={cn(
                          "flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all",
                          enabled
                            ? "border-primary bg-muted dark:bg-primary/10"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        )}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <span className="text-xs font-semibold">{tpl.name}</span>
                          {enabled && <Check className="h-3 w-3 text-primary ml-auto" />}
                        </div>
                        <p className="text-[9px] text-muted-foreground">{tpl.desc}</p>
                        <code className="text-[8px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded w-full truncate">
                          {tpl.preview}
                        </code>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "graphql" && (
          <div className="space-y-4">
            <Card className="border shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-500">GraphQL Explorer</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[8px] h-5">POST /api/graphql</Badge>
                    <Button
                      variant="ghost" size="sm" className="h-7 text-[9px] gap-1"
                      onClick={() => { navigator.clipboard.writeText(graphqlQuery); toast.success("Copied"); }}
                    >
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={graphqlQuery}
                  onChange={(e) => setGraphqlQuery(e.target.value)}
                  className="min-h-[160px] text-[10px] font-mono rounded-xl bg-slate-900 text-emerald-400 border-slate-800"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button size="sm" className="h-8 text-[10px] gap-1 bg-primary">
                      <Play className="h-3 w-3" /> Execute
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-[10px] gap-1">
                      <RefreshCcw className="h-3 w-3" /> Format
                    </Button>
                  </div>
                  <span className="text-[9px] text-slate-400">Endpoint: /api/graphql</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <h4 className="text-xs font-bold text-slate-500 mb-3">Schema</h4>
                <div className="space-y-1.5 text-[10px] font-mono text-slate-600">
                  {[
                    "type Query {",
                    "  boards(workspaceId: ID!): [Board!]!",
                    "  tasks(boardId: ID!, filter: TaskFilter): [Task!]!",
                    "  columns(boardId: ID!): [Column!]!",
                    "}",
                    "type Mutation {",
                    "  createTask(input: CreateTaskInput!): Task!",
                    "  updateTask(id: ID!, input: UpdateTaskInput!): Task!",
                    "  deleteTask(id: ID!): Boolean!",
                    "}",
                  ].map((line, i) => (
                    <span key={i} className="block">{line}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
