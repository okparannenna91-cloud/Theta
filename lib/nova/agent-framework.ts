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

export class AgentFramework {
  public static getAgent(id: string): AgentDefinition | undefined {
    return AGENT_REGISTRY.find(a => a.id === id);
  }

  public static getAvailableAgents(): AgentDefinition[] {
    return AGENT_REGISTRY;
  }

  public static async planExecution(userRequest: string): Promise<AgentExecutionPlan[]> {
    const lower = userRequest.toLowerCase();
    const plans: AgentExecutionPlan[] = [];

    if (lower.includes("sprint") || lower.includes("backlog") || lower.includes("capacity")) {
      plans.push({
        agentId: "sprint-agent",
        steps: [
          { tool: "list_tasks", params: {}, description: "Fetch current backlog" },
          { tool: "project_health_analysis", params: {}, description: "Analyze sprint capacity" },
        ],
      });
    }

    if (lower.includes("task") || lower.includes("create") || lower.includes("break down")) {
      plans.push({
        agentId: "task-agent",
        steps: [
          { tool: "create_task", params: {}, description: "Generate and optimize tasks" },
          { tool: "create_dependency", params: {}, description: "Detect and link dependencies" },
        ],
      });
    }

    if (lower.includes("report") || lower.includes("summary") || lower.includes("standup")) {
      plans.push({
        agentId: "reporting-agent",
        steps: [
          { tool: "generate_standup", params: {}, description: "Generate activity summary" },
          { tool: "generate_daily_brief", params: {}, description: "Create daily brief" },
        ],
      });
    }

    if (lower.includes("document") || lower.includes("doc") || lower.includes("knowledge")) {
      plans.push({
        agentId: "documentation-agent",
        steps: [
          { tool: "create_document", params: {}, description: "Create or organize documents" },
          { tool: "search_workspace", params: {}, description: "Search related knowledge" },
        ],
      });
    }

    if (lower.includes("automate") || lower.includes("workflow") || lower.includes("trigger")) {
      plans.push({
        agentId: "automation-agent",
        steps: [
          { tool: "create_automation", params: {}, description: "Create automation workflow" },
        ],
      });
    }

    if (lower.includes("risk") || lower.includes("health") || lower.includes("blocker")) {
      plans.push({
        agentId: "risk-agent",
        steps: [
          { tool: "evaluate_risks", params: {}, description: "Evaluate project risks" },
          { tool: "project_health_analysis", params: {}, description: "Analyze project health" },
        ],
      });
    }

    return plans;
  }

  public static getCollaborationRules(): string[] {
    return AGENT_COLLABORATION_RULES;
  }
}
