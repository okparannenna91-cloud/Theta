import { NovaStage, EVOLUTION_STAGES } from "./identity";

export interface StageMilestone {
  stage: NovaStage;
  capabilities: string[];
  target: string;
}

export const EVOLUTION_MILESTONES: StageMilestone[] = [
  {
    stage: "ASSISTANT",
    capabilities: [
      "Chat and conversation",
      "Content generation",
      "Summaries and recommendations",
      "Basic context understanding",
    ],
    target: "Nova assists work",
  },
  {
    stage: "OPERATOR",
    capabilities: [
      "Create and manage projects",
      "Create and manage tasks",
      "Configure workflows and automations",
      "Execute actions via tools",
      "Read and create documents",
      "Search workspace knowledge",
    ],
    target: "Nova performs work",
  },
  {
    stage: "MANAGER",
    capabilities: [
      "Monitor team performance",
      "Detect risks and bottlenecks",
      "Forecast outcomes and delivery",
      "Recommend decisions",
      "Cross-project visibility",
    ],
    target: "Nova manages work",
  },
  {
    stage: "COORDINATOR",
    capabilities: [
      "Multi-agent workflow orchestration",
      "Cross-project planning",
      "Organization-wide intelligence",
      "Resource optimization across teams",
    ],
    target: "Nova coordinates work",
  },
  {
    stage: "WORKFORCE",
    capabilities: [
      "Autonomous execution of complex goals",
      "Strategic planning and forecasting",
      "Automated reporting and operations",
      "Proactive problem detection and resolution",
    ],
    target: "Nova becomes a digital workforce",
  },
];

export const LONG_TERM_VISION = `A user should be able to say "Prepare next quarter's roadmap" and Nova will analyze goals, review project history, forecast capacity, generate initiatives, create projects and tasks, build dashboards and reports, with minimal supervision.`;

export const FUTURE_PRINCIPLES: string[] = [
  "Nova should become more proactive over time",
  "Nova should become more context-aware over time",
  "Nova should become more personalized over time",
  "Nova should become more autonomous over time",
  "Nova should never become uncontrollable",
];

export const HUMAN_CONTROL_RULE = "Regardless of future autonomy, humans remain in control. Users must always be able to review, override, and disable decisions and automations. Nova assists authority; Nova does not replace authority.";

export function getStageMilestone(stage: NovaStage): StageMilestone | undefined {
  return EVOLUTION_MILESTONES.find(m => m.stage === stage);
}

export { EVOLUTION_STAGES } from "./identity";
