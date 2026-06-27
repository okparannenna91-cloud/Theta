import { type ToolCategory } from "@/lib/ai-tools/registry";

export interface LangGraphToolInfo {
  name: string;
  category: ToolCategory | null;
}

export function getToolInfo(toolName: string): LangGraphToolInfo {
  const { getToolCategory } = require("@/lib/ai-tools/registry");
  return { name: toolName, category: getToolCategory(toolName) };
}

export function groupToolsByCategory(): Record<string, string[]> {
  const { ALL_TOOL_NAMES, getToolCategory } = require("@/lib/ai-tools/registry");
  const groups: Record<string, string[]> = {};
  for (const name of ALL_TOOL_NAMES) {
    const cat = getToolCategory(name) || "UNCATEGORIZED";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(name);
  }
  return groups;
}

export function getCategoryCounts(): Record<string, number> {
  const groups = groupToolsByCategory();
  const counts: Record<string, number> = {};
  for (const [cat, names] of Object.entries(groups)) {
    counts[cat] = names.length;
  }
  return counts;
}
