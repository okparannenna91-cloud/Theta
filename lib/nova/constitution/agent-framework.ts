export interface AgentDefinition {
  id: string;
  name: string;
  purpose: string;
  responsibilities: string[];
  tools: string[];
}

export const AGENT_REGISTRY: AgentDefinition[] = [
  {
    id: "sprint-agent",
    name: "Sprint Agent",
    purpose: "Sprint planning, capacity analysis, backlog organization",
    responsibilities: [
      "Plan sprint scope based on capacity",
      "Analyze team velocity",
      "Organize backlog priorities",
      "Detect sprint risks",
    ],
    tools: ["list_tasks", "update_task", "create_task", "project_health_analysis", "get_suggestions"],
  },
  {
    id: "task-agent",
    name: "Task Agent",
    purpose: "Task generation, optimization, dependency detection",
    responsibilities: [
      "Generate tasks from descriptions",
      "Optimize task priority and assignment",
      "Detect task dependencies and cycles",
      "Monitor task health",
    ],
    tools: ["create_task", "update_task", "delete_task", "breakdown_task", "create_dependency", "set_estimation"],
  },
  {
    id: "reporting-agent",
    name: "Reporting Agent",
    purpose: "Report creation, KPI analysis, executive summaries",
    responsibilities: [
      "Generate project and sprint reports",
      "Analyze KPIs and trends",
      "Create executive summaries",
      "Distribute reports via channels",
    ],
    tools: ["generate_standup", "generate_daily_brief", "project_health_analysis"],
  },
  {
    id: "risk-agent",
    name: "Risk Agent",
    purpose: "Risk detection, forecasting, bottleneck analysis",
    responsibilities: [
      "Detect project risks proactively",
      "Forecast delivery confidence",
      "Analyze bottlenecks",
      "Recommend mitigation strategies",
    ],
    tools: ["evaluate_risks", "project_health_analysis", "get_suggestions"],
  },
  {
    id: "documentation-agent",
    name: "Documentation Agent",
    purpose: "Knowledge management, document generation, content refinement",
    responsibilities: [
      "Create and organize documents",
      "Extract knowledge from content",
      "Link documents to workspace entities",
      "Generate summaries and refinements",
    ],
    tools: ["create_document", "read_document", "delete_document", "search_workspace"],
  },
  {
    id: "automation-agent",
    name: "Automation Agent",
    purpose: "Workflow creation, automation optimization, trigger management",
    responsibilities: [
      "Create automated workflows from natural language",
      "Optimize existing automations",
      "Manage triggers and actions",
      "Ensure automation safety",
    ],
    tools: ["create_automation"],
  },
  {
    id: "research-agent",
    name: "Research Agent",
    purpose: "Information gathering, requirement analysis, competitive research",
    responsibilities: [
      "Search workspace for information",
      "Analyze requirements from documents",
      "Gather competitive intelligence",
      "Synthesize research findings",
    ],
    tools: ["search_workspace", "read_document", "list_projects", "list_tasks"],
  },
  {
    id: "executive-agent",
    name: "Executive Agent",
    purpose: "Strategic reporting, portfolio insights, leadership summaries",
    responsibilities: [
      "Generate portfolio overviews",
      "Provide strategic insights",
      "Create leadership summaries",
      "Monitor cross-project health",
    ],
    tools: ["project_health_analysis", "generate_daily_brief", "list_projects", "get_suggestions"],
  },
];

export const AGENT_COLLABORATION_RULES: string[] = [
  "Agents may collaborate on complex requests",
  "Each agent operates within its defined purpose and tools",
  "Agent outputs are validated against permissions before execution",
  "Agents should hand off to the next appropriate agent in a workflow chain",
  "The user should see a unified result, not individual agent steps",
];
