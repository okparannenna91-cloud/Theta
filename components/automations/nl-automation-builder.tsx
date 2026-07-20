"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, Zap, ArrowRight, CheckCircle2, AlertTriangle, Wand2 } from "lucide-react";
import { toast } from "sonner";

interface AutomationTemplate {
  name: string;
  description: string;
  example: string;
  rule: Record<string, unknown>;
}

interface Props {
  workspaceId: string;
  onCreated?: () => void;
}

const TRIGGER_LABELS: Record<string, string> = {
  task_created: "Task Created",
  task_updated: "Task Updated",
  task_completed: "Task Completed",
  task_status_changed: "Status Changed",
  task_priority_changed: "Priority Changed",
  due_date_passed: "Due Date Passed",
  project_created: "Project Created",
};

const ACTION_LABELS: Record<string, string> = {
  send_notification: "Send Notification",
  create_task: "Create Task",
  update_task: "Update Task",
  move_task: "Move Task",
  add_comment: "Add Comment",
  assign_task: "Assign Task",
  set_label: "Set Label",
};

export function NLAutomationBuilder({ workspaceId, onCreated }: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<AutomationTemplate[]>([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  const loadTemplates = useCallback(async () => {
    if (templatesLoaded) return;
    try {
      const res = await fetch("/api/automations/nl/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
        setTemplatesLoaded(true);
      }
    } catch {
      // silent
    }
  }, [templatesLoaded]);

  const handleCreate = useCallback(async () => {
    if (!input.trim()) return;
    setLoading(true);
    setPreview(null);
    setCreated(false);

    try {
      const res = await fetch("/api/automations/nl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: input.trim(), workspaceId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create automation");
      }

      const result = await res.json();
      setCreated(true);
      toast.success("Automation created!");
      setInput("");
      onCreated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create automation");
    } finally {
      setLoading(false);
    }
  }, [input, workspaceId, onCreated]);

  const handleTemplateClick = (template: AutomationTemplate) => {
    setInput(template.example);
  };

  return (
    <div className="space-y-4">
      {/* NL Input */}
      <Card className="border-slate-700/50 bg-slate-800/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-indigo-400" />
            Describe your automation in plain English
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder='e.g. "When a task is moved to Done, notify the client and create a follow-up task"'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleCreate()}
              className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
              disabled={loading}
            />
            <Button
              onClick={handleCreate}
              disabled={!input.trim() || loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            </Button>
          </div>

          {created && (
            <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4" />
              Automation created successfully! It will run automatically on matching events.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Templates */}
      <Card className="border-slate-700/50 bg-slate-800/50">
        <CardHeader className="pb-3">
          <CardTitle
            className="text-sm font-medium text-slate-200 cursor-pointer hover:text-slate-100 flex items-center gap-2"
            onClick={loadTemplates}
          >
            <Zap className="h-4 w-4 text-amber-400" />
            Quick Templates
            <Badge variant="outline" className="ml-auto text-[10px] border-slate-600 text-slate-400">
              {templatesLoaded ? templates.length : "Click to load"}
            </Badge>
          </CardTitle>
        </CardHeader>
        {templatesLoaded && (
          <CardContent>
            <ScrollArea className="max-h-[300px]">
              <div className="grid gap-2 sm:grid-cols-2">
                {templates.map((template, i) => (
                  <button
                    key={i}
                    onClick={() => handleTemplateClick(template)}
                    className="text-left rounded-lg bg-slate-900/50 p-3 border border-slate-700/30 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all group"
                  >
                    <div className="text-xs font-medium text-slate-200 group-hover:text-indigo-300 mb-1">
                      {template.name}
                    </div>
                    <div className="text-[10px] text-slate-500 line-clamp-2">
                      {template.description}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
