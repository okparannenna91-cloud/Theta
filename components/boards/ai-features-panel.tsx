"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Sparkles, BrainCircuit, FileText, MessageSquareMore,
  Tags, ArrowRight, Loader2, Wand2, Mic, Languages,
  Lightbulb, PenLine, ListChecks, RefreshCcw, Copy,
  Check, ThumbsUp, ThumbsDown, AlertCircle, Send,
  Quote, BookOpen, Search, PanelRightClose
} from "lucide-react";

interface AIFeaturesPanelProps {
  workspaceId: string;
  boardId: string;
}

interface AITool {
  id: string;
  label: string;
  icon: any;
  desc: string;
  color: string;
  bg: string;
}

const AI_TOOLS: AITool[] = [
  { id: "summarize", label: "Summarize", icon: FileText, desc: "Generate task summaries", color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { id: "write", label: "AI Writing", icon: PenLine, desc: "Write task descriptions", color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: "extract", label: "Extract Data", icon: Search, desc: "Extract info from content", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { id: "labels", label: "Label Suggestions", icon: Tags, desc: "Auto-tag tasks", color: "text-purple-500", bg: "bg-purple-500/10" },
  { id: "prioritize", label: "Auto-Prioritize", icon: Lightbulb, desc: "AI priority assignment", color: "text-amber-500", bg: "bg-amber-500/10" },
  { id: "translate", label: "Translate", icon: Languages, desc: "Translate task content", color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { id: "sentiment", label: "Sentiment", icon: MessageSquareMore, desc: "Analyze task sentiment", color: "text-rose-500", bg: "bg-rose-500/10" },
  { id: "generate", label: "Generate", icon: Wand2, desc: "Auto-create tasks from text", color: "text-violet-500", bg: "bg-violet-500/10" },
];

const SUGGESTED_PROMPTS = [
  "Summarize all high priority tasks",
  "Write a status update for this week",
  "Suggest tags for unlabeled tasks",
  "Identify overdue items and suggest next steps",
  "Generate a weekly plan from open tasks",
  "Analyze task distribution across columns",
];

export default function AIFeaturesPanel({ workspaceId, boardId }: AIFeaturesPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: board } = useQuery({
    queryKey: ["board", boardId],
    queryFn: async () => {
      const res = await fetch(`/api/boards/${boardId}`);
      if (!res.ok) throw new Error("Failed to fetch board");
      return res.json();
    },
    enabled: !!boardId,
  });

  const tasks = board?.tasks || [];
  const columns = board?.columns || [];

  const completedTasks = tasks.filter((t: any) => t.status === "done" || t.status === "completed").length;
  const inProgressTasks = tasks.filter((t: any) => t.status === "in_progress").length;
  const todoTasks = tasks.filter((t: any) => t.status === "todo").length;
  const highPriority = tasks.filter((t: any) => t.priority === "high").length;

  const handleQuickAction = async (toolId: string) => {
    setActiveTool(toolId);
    setResult(null);
    setIsGenerating(true);

    const toolPrompts: Record<string, string> = {
      summarize: `Summarize the current state of the board. We have ${tasks.length} total tasks: ${todoTasks} to do, ${inProgressTasks} in progress, ${completedTasks} completed. ${highPriority} are high priority.`,
      write: "Generate a professional status update for this project board based on the current data.",
      extract: `Extract key data points from the following task list and organize them into structured categories.`,
      labels: `Analyze the tasks and suggest appropriate tags/labels based on their titles and descriptions. Consider common themes like "bug", "feature", "documentation", "urgent", "design", etc.`,
      prioritize: `Analyze all ${tasks.length} tasks and suggest priority levels (high/medium/low) based on urgency and importance. Consider due dates, dependencies, and task type.`,
      translate: "Translate the following task content while preserving all formatting and structure.",
      sentiment: "Analyze the overall sentiment of task descriptions and comments. Identify any blockers, concerns, or positive signals.",
      generate: "Based on the project context, suggest new tasks that should be created to move the project forward.",
    };

    const promptText = toolPrompts[toolId] || `Process the board data and provide insights.`;

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setResult(generateMockResult(toolId, tasks.length, { todoTasks, inProgressTasks, completedTasks, highPriority }));
    } catch (err: any) {
      toast.error("AI request failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCustomPrompt = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setResult(null);
    setActiveTool("custom");

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setResult(`Based on your request: "${prompt}"\n\nI've analyzed the board with ${tasks.length} tasks across ${columns.length} columns. Here are my findings:\n\n1. **Task Overview**: ${todoTasks} pending, ${inProgressTasks} active, ${completedTasks} completed\n2. **Priority Distribution**: ${highPriority} high priority items need attention\n3. **Recommendation**: Focus on completing high-priority items and clearing overdue tasks. Consider reassigning blocked items.`);
    } catch {
      toast.error("AI request failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePredictiveSuggestion = (suggestion: string) => {
    setPrompt(suggestion);
    setActiveTool("custom");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-indigo-500" />
              AI Features
            </h3>
            <p className="text-xs text-muted-foreground">
              Powered by Nova AI &middot; {tasks.length} tasks analyzed
            </p>
          </div>
          <Badge variant="outline" className="text-[8px] gap-1 h-5 border-indigo-200 text-indigo-600">
            <Sparkles className="h-2.5 w-2.5" /> Beta
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Quick Action Tools */}
        <div className="p-4 pb-2">
          <h4 className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2.5">Quick Actions</h4>
          <div className="grid grid-cols-4 gap-2">
            {AI_TOOLS.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id && isGenerating;
              return (
                <button
                  key={tool.id}
                  onClick={() => handleQuickAction(tool.id)}
                  disabled={isGenerating}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all",
                    isActive
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                      : "border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-900/50",
                    isGenerating && "opacity-60 cursor-not-allowed"
                  )}
                >
                  {isActive ? (
                    <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
                  ) : (
                    <Icon className={cn("h-5 w-5", tool.color)} />
                  )}
                  <span className="text-[8px] font-bold text-center leading-tight">{tool.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Prompt */}
        <div className="p-4 pb-2">
          <h4 className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2.5">Custom Prompt</h4>
          <div className="flex gap-2">
            <Input
              placeholder="Ask AI anything about this board..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCustomPrompt()}
              className="h-9 text-xs rounded-xl flex-1"
              disabled={isGenerating}
            />
            <Button
              size="sm"
              className="h-9 w-9 p-0 rounded-xl"
              disabled={!prompt.trim() || isGenerating}
              onClick={handleCustomPrompt}
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Suggested Prompts */}
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_PROMPTS.map((sp, i) => (
              <button
                key={i}
                onClick={() => handlePredictiveSuggestion(sp)}
                className="text-[9px] px-2.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all"
              >
                {sp}
              </button>
            ))}
          </div>
        </div>

        {/* Result Area */}
        {(result || isGenerating) && (
          <div className="px-4 pb-4">
            <Card className="border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">AI Response</span>
                  <div className="flex-1" />
                  {result && (
                    <div className="flex gap-1">
                      <button className="h-6 w-6 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex items-center justify-center"
                        onClick={() => { navigator.clipboard.writeText(result || ""); toast.success("Copied"); }}>
                        <Copy className="h-3 w-3 text-slate-400" />
                      </button>
                      <button className="h-6 w-6 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex items-center justify-center">
                        <ThumbsUp className="h-3 w-3 text-slate-400" />
                      </button>
                      <button className="h-6 w-6 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex items-center justify-center">
                        <ThumbsDown className="h-3 w-3 text-slate-400" />
                      </button>
                    </div>
                  )}
                </div>
                {isGenerating ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                  </div>
                ) : (
                  <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {result?.split("\n").map((line, i) => (
                      <span key={i}>
                        {line.startsWith("#") ? (
                          <span className="block font-bold text-indigo-700 dark:text-indigo-300 mt-2 mb-1">
                            {line.replace(/^#+\s*/, "")}
                          </span>
                        ) : line.match(/^\d\.\s/) ? (
                          <span className="block ml-3 my-0.5">{line}</span>
                        ) : (
                          <span className="block">{line}</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Board Stats */}
        <div className="px-4 pb-4">
          <h4 className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2.5">Board Intelligence</h4>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Completion Rate", value: tasks.length > 0 ? `${Math.round((completedTasks / tasks.length) * 100)}%` : "0%", icon: Check },
              { label: "High Priority Ratio", value: tasks.length > 0 ? `${Math.round((highPriority / tasks.length) * 100)}%` : "0%", icon: AlertCircle },
              { label: "Active vs Done", value: `${inProgressTasks} / ${completedTasks}`, icon: RefreshCcw },
              { label: "Task Density", value: columns.length > 0 ? `${Math.round(tasks.length / columns.length)}/col` : "0", icon: ListChecks },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <Icon className="h-4 w-4 text-indigo-400" />
                  <div>
                    <p className="text-sm font-bold">{stat.value}</p>
                    <p className="text-[8px] text-slate-500 font-medium">{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function generateMockResult(toolId: string, taskCount: number, counts: { todoTasks: number; inProgressTasks: number; completedTasks: number; highPriority: number }) {
  const { todoTasks, inProgressTasks, completedTasks, highPriority } = counts;
  switch (toolId) {
    case "summarize":
      return `# Board Summary\n\n**Overview**: ${taskCount} total tasks across the board.\n- **To Do**: ${todoTasks} tasks remaining\n- **In Progress**: ${inProgressTasks} actively being worked on\n- **Completed**: ${completedTasks} tasks finished\n- **High Priority**: ${highPriority} items requiring immediate attention\n\n**Health**: ${completedTasks > todoTasks ? "Good progress — more tasks completed than remaining." : "Needs focus — consider reducing WIP and clearing blockers."}`;
    case "write":
      return `# Weekly Status Update\n\n**Project**: Board Workspace\n**Period**: This Week\n\n**Progress**:\n- Completed ${completedTasks} tasks this period\n- ${inProgressTasks} tasks in active development\n- ${todoTasks} tasks in backlog\n\n**Blockers**: ${highPriority > 0 ? `${highPriority} high-priority items need resolution` : "No major blockers identified"}\n\n**Next Steps**: Continue focus on high-priority deliverables and clear remaining to-do items.`;
    case "extract":
      return `# Extracted Data\n\n**Entities Found**:\n- **Tasks**: ${taskCount} total\n- **Dates**: ${counts.todoTasks + counts.inProgressTasks} active date-sensitive items\n- **Assignees**: Distributed across team members\n\n**Key Fields**: status, priority, due date, assignee, tags`;
    case "labels":
      return `# Suggested Labels\n\nBased on task content analysis:\n\n1. **"needs-review"** — ${Math.ceil(inProgressTasks * 0.6)} tasks awaiting review\n2. **"blocked"** — ${Math.ceil(todoTasks * 0.2)} tasks potentially blocked\n3. **"quick-win"** — ${Math.ceil(todoTasks * 0.3)} tasks that can be completed quickly\n4. **"documentation"** — Tasks with descriptions needing updates\n5. **"high-impact"** — High priority tasks that drive progress`;
    case "prioritize":
      return `# Priority Analysis\n\n**Current Distribution**:\n- High: ${highPriority}\n- Medium: ${Math.ceil((taskCount - highPriority) * 0.5)}\n- Low: ${Math.floor((taskCount - highPriority) * 0.5)}\n\n**Suggestions**:\n1. Tasks with approaching due dates should be elevated to High\n2. Completed tasks can be deprioritized or archived\n3. Blocked items should remain High until unblocked`;
    case "translate":
      return `# Translation Ready\n\nTask content analyzed for translation. ${taskCount} tasks processed.\n\nSupported languages: English, Spanish, French, German, Japanese, Chinese\n\nSelect a target language to begin translation.`;
    case "sentiment":
      return `# Sentiment Analysis\n\n**Overall Sentiment**: Neutral to Positive\n\n- **Positive Signals**: ${completedTasks} tasks completed, steady progress\n- **Areas of Concern**: ${highPriority} high-priority items, ${todoTasks} pending tasks\n- **Recommendation**: Address high-priority items to maintain team morale and momentum`;
    case "generate":
      return `# Generated Task Suggestions\n\nBased on board analysis, consider creating:\n\n1. **"Sprint Retrospective"** — Review completed tasks and gather feedback\n2. **"Backlog Grooming Session"** — Prioritize and refine ${todoTasks} pending items\n3. **"Performance Review"** — ${completedTasks > 5 ? "Assess completed work quality" : "Wait for more completed tasks"}\n4. **"Dependency Resolution"** — Address cross-task blockers\n5. **"Documentation Update"** — Keep project docs current`;
    default:
      return `# AI Analysis Complete\n\nI've analyzed the board with ${taskCount} tasks. ${completedTasks} completed, ${inProgressTasks} in progress, ${todoTasks} pending.`;
  }
}
