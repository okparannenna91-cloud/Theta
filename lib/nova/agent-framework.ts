import { AGENT_REGISTRY, AGENT_COLLABORATION_RULES, type AgentDefinition } from "./constitution/agent-framework";
import { TaskIntelligence } from "./task-intelligence";
import { ProjectIntelligence } from "./project-intelligence";
import { DocumentIntelligence } from "./document-intelligence";

export { AGENT_REGISTRY, AGENT_COLLABORATION_RULES, type AgentDefinition } from "./constitution/agent-framework";

export interface AgentExecutionPlan {
  agentId: string;
  steps: Array<{
    tool: string;
    params: Record<string, unknown>;
    description: string;
  }>;
}

const AGENT_KEYWORDS: Record<string, { primary: string[]; secondary: string[] }> = {
  "sprint-agent":       { primary: ["sprint"],             secondary: ["backlog", "capacity", "velocity"] },
  "task-agent":         { primary: ["task"],               secondary: ["create", "break down", "subtask", "dependency"] },
  "reporting-agent":    { primary: ["report", "standup"],  secondary: ["summary", "brief", "activity"] },
  "documentation-agent": { primary: ["document"],          secondary: ["doc", "knowledge", "wiki"] },
  "automation-agent":   { primary: ["automate"],           secondary: ["automation", "workflow", "trigger"] },
  "risk-agent":         { primary: ["risk", "health"],     secondary: ["blocker", "bottleneck"] },
};

const AGENT_PLANS: Record<string, AgentExecutionPlan> = {
  "sprint-agent": {
    agentId: "sprint-agent",
    steps: [
      { tool: "list_tasks", params: {}, description: "Fetch current backlog" },
      { tool: "project_health_analysis", params: {}, description: "Analyze sprint capacity" },
    ],
  },
  "task-agent": {
    agentId: "task-agent",
    steps: [
      { tool: "create_task", params: {}, description: "Generate and optimize tasks" },
      { tool: "create_dependency", params: {}, description: "Detect and link dependencies" },
    ],
  },
  "reporting-agent": {
    agentId: "reporting-agent",
    steps: [
      { tool: "generate_standup", params: {}, description: "Generate activity summary" },
      { tool: "generate_daily_brief", params: {}, description: "Create daily brief" },
    ],
  },
  "documentation-agent": {
    agentId: "documentation-agent",
    steps: [
      { tool: "create_document", params: {}, description: "Create or organize documents" },
      { tool: "search_workspace", params: {}, description: "Search related knowledge" },
    ],
  },
  "automation-agent": {
    agentId: "automation-agent",
    steps: [
      { tool: "create_automation", params: {}, description: "Create automation workflow" },
    ],
  },
  "risk-agent": {
    agentId: "risk-agent",
    steps: [
      { tool: "evaluate_risks", params: {}, description: "Evaluate project risks" },
      { tool: "project_health_analysis", params: {}, description: "Analyze project health" },
    ],
  },
};

export class AgentFramework {
  public static getAgent(id: string): AgentDefinition | undefined {
    return AGENT_REGISTRY.find(a => a.id === id);
  }

  public static getAvailableAgents(): AgentDefinition[] {
    return AGENT_REGISTRY;
  }

  public static async planExecution(userRequest: string): Promise<AgentExecutionPlan[]> {
    const lower = userRequest.toLowerCase();
    const scored: { id: string; score: number }[] = [];

    for (const [agentId, kw] of Object.entries(AGENT_KEYWORDS)) {
      let score = 0;
      for (const p of kw.primary) {
        if (lower.includes(p)) score += 2;
      }
      for (const s of kw.secondary) {
        if (lower.includes(s)) score += 1;
      }
      if (score > 0) scored.push({ id: agentId, score });
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .map(s => AGENT_PLANS[s.id]);
  }

  public static getCollaborationRules(): string[] {
    return AGENT_COLLABORATION_RULES;
  }
}
