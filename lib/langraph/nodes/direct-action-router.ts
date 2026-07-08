import { executeTool } from "./tool-executor";
import type { LangGraphToolContext } from "../tools/wrapper";
import { logger } from "@/lib/logger";

export interface DirectActionResult {
  handled: boolean;
  message?: string;
  error?: string;
  actionName?: string;
  durationMs: number;
}

const HIGH_CONFIDENCE = 0.85;

const NEGATION_PATTERNS = [
  /\b(?:don't|do not|never|stop|avoid|cease)\s+(?:create|make|add|delete|remove|update|edit|modify|change|list|show|find)\b/i,
  /\b(?:not|n't)\s+(?:to\s+)?(?:create|make|add|delete|remove|update|edit|modify|change|list|show|find)\b/i,
];

function hasNegation(prompt: string): boolean {
  return NEGATION_PATTERNS.some(p => p.test(prompt));
}

function detectAction(prompt: string): { action: string; confidence: number; params: Record<string, string | undefined> } | null {
  const trimmed = prompt.trim();
  const lower = trimmed.toLowerCase();
  let best: { action: string; confidence: number; params: Record<string, string | undefined> } | null = null;

  if (hasNegation(trimmed)) return null;

  const patterns: Array<{ action: string; keywords: string[]; confidence: number; extract: (input: string) => Record<string, string | undefined> }> = [
    { action: "create_task", keywords: ["create", "task"], confidence: 0.95, extract: (i) => {
        const params: Record<string, string | undefined> = {};
        const titleMatch = i.match(/create\s+(?:a\s+)?task\s+(?:called\s+)?[""](.+?)[""]/i);
        params.title = titleMatch ? titleMatch[1] : "New task";
        const priorityMatch = i.match(/priority\s+(?:of\s+)?(low|medium|high|urgent)/i);
        if (priorityMatch) params.priority = priorityMatch[1];
        const statusMatch = i.match(/status\s+(?:of\s+)?(\w+)/i);
        if (statusMatch) params.status = statusMatch[1];
        const dueMatch = i.match(/due\s+(?:date\s+)?(\d{4}-\d{2}-\d{2}|tomorrow|next\s+\w+)/i);
        if (dueMatch) params.dueDate = dueMatch[1];
        const assigneeMatch = i.match(/(?:assign|assignee)\s+(?:to\s+)?(.+?)(?:\s+with|\s+and|\s+due|$)/i);
        if (assigneeMatch) params.assigneeId = assigneeMatch[1].trim();
        return params;
    } },
    { action: "list_tasks", keywords: ["list", "tasks"], confidence: 0.9, extract: () => ({}) },
    { action: "create_project", keywords: ["create", "project"], confidence: 0.95, extract: (i) => { const m = i.match(/create\s+(?:a\s+)?project\s+(?:called\s+)?[""](.+?)[""]/i); return m ? { name: m[1] } : { name: "New project" }; } },
    { action: "list_projects", keywords: ["list", "projects"], confidence: 0.9, extract: () => ({}) },
    { action: "list_members", keywords: ["list", "members"], confidence: 0.9, extract: () => ({}) },
    { action: "list_workspaces", keywords: ["list", "workspaces"], confidence: 0.85, extract: () => ({}) },
  ];

  for (const p of patterns) {
    if (p.keywords.every((kw) => lower.includes(kw))) {
      if (!best || p.confidence > best.confidence) best = { action: p.action, confidence: p.confidence, params: p.extract(lower) };
    }
  }
  return best;
}

export async function tryDirectAction(prompt: string, ctx: LangGraphToolContext): Promise<DirectActionResult> {
  const start = Date.now();
  try {
    const match = detectAction(prompt);
    if (!match || match.confidence < HIGH_CONFIDENCE) return { handled: false, durationMs: Date.now() - start };

    logger.info("[DirectActionRouter] Matched", { action: match.action, confidence: match.confidence });
    const result = await executeTool(ctx, match.action, match.params as Record<string, unknown>);

    if (result.success) {
      const msg = typeof result.result === "object" && result.result ? (result.result as any).message || `${match.action} completed.` : `${match.action} completed.`;
      return { handled: true, message: msg, actionName: match.action, durationMs: Date.now() - start };
    }
    return { handled: true, error: result.error, actionName: match.action, durationMs: Date.now() - start };
  } catch (error: any) {
    return { handled: true, error: error.message, actionName: "error", durationMs: Date.now() - start };
  }
}
