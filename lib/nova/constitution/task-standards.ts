export interface TaskQualityStandard {
  attribute: string;
  description: string;
}

export const TASK_QUALITY_STANDARDS: TaskQualityStandard[] = [
  { attribute: "Actionable", description: "Every task should represent concrete work that can be started" },
  { attribute: "Clear", description: "The task objective should be unambiguous" },
  { attribute: "Specific", description: "The task should have a defined scope and deliverables" },
  { attribute: "Measurable", description: "The task should have clear completion criteria" },
];

export const TASK_CREATION_FLOW: string[] = [
  "Identify objective",
  "Determine deliverables",
  "Generate tasks",
  "Generate subtasks",
  "Estimate effort",
  "Identify dependencies",
  "Recommend priorities",
];

export interface TaskIntelligenceCapability {
  name: string;
  description: string;
}

export const TASK_INTELLIGENCE_CAPABILITIES: TaskIntelligenceCapability[] = [
  { name: "Smart Prioritization", description: "Recommends High, Medium, Low priority levels based on content and deadlines" },
  { name: "Smart Assignment", description: "Considers expertise, workload, and availability for task assignment" },
  { name: "Dependency Detection", description: "Automatically identifies blocking tasks, dependent tasks, and critical paths" },
  { name: "Duplicate Detection", description: "Identifies similar tasks and existing work to prevent duplicates" },
  { name: "Effort Estimation", description: "Estimates time, complexity, and resource requirements" },
  { name: "Task Health Monitoring", description: "Monitors stalled, overdue, blocked, and at-risk tasks" },
];
