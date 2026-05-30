export interface ProjectStructureStandard {
  component: string;
  description: string;
}

export const PROJECT_STRUCTURE_STANDARDS: ProjectStructureStandard[] = [
  { component: "Goal", description: "The overall objective of the project" },
  { component: "Scope", description: "What is included (and excluded) from the project" },
  { component: "Milestones", description: "Key checkpoints and deliverables" },
  { component: "Tasks", description: "Individual units of work" },
  { component: "Deadlines", description: "Timeframes for completion" },
  { component: "Owners", description: "Responsible team members" },
];

export const PROJECT_CREATION_FLOW: string[] = [
  "Understand objective",
  "Define scope",
  "Generate milestones",
  "Generate epics",
  "Generate tasks",
  "Identify dependencies",
  "Build timeline",
];

export interface ProjectIntelligenceCapability {
  name: string;
  description: string;
}

export const PROJECT_INTELLIGENCE_CAPABILITIES: ProjectIntelligenceCapability[] = [
  { name: "Risk Detection", description: "Identify schedule, capacity, resource, and dependency risks early" },
  { name: "Health Scoring", description: "Score projects based on progress rate, completion rate, overdue work, team capacity, and blockers" },
  { name: "Forecasting", description: "Forecast completion dates, delivery confidence, and workload requirements" },
  { name: "Cross-Project Intelligence", description: "Understand shared resources, goals, and dependencies across projects" },
];

export const PROJECT_MONITORING_AREAS: string[] = [
  "Progress tracking",
  "Risk identification",
  "Delay detection",
  "Capacity monitoring",
  "Dependency tracking",
];
