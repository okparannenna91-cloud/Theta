export type ReportType = "PROJECT" | "SPRINT" | "TEAM" | "EXECUTIVE" | "CLIENT";
export type ReportFrequency = "DAILY" | "WEEKLY" | "SPRINT" | "MONTHLY" | "QUARTERLY";
export type DistributionChannel = "DASHBOARD" | "EMAIL" | "CLIENT_PORTAL" | "NOTIFICATION";

export interface ReportTypeDefinition {
  type: ReportType;
  description: string;
  contents: string[];
}

export const REPORT_TYPES: ReportTypeDefinition[] = [
  {
    type: "PROJECT",
    description: "Project progress updates, milestone tracking, delivery forecasting",
    contents: ["Progress updates", "Milestone tracking", "Delivery forecasting", "Risk assessment"],
  },
  {
    type: "SPRINT",
    description: "Sprint performance, completed work, carry-over work, team velocity",
    contents: ["Sprint performance", "Completed work", "Carry-over work", "Team velocity"],
  },
  {
    type: "TEAM",
    description: "Workload analysis, capacity utilization, performance insights",
    contents: ["Workload analysis", "Capacity utilization", "Performance insights", "Bottleneck identification"],
  },
  {
    type: "EXECUTIVE",
    description: "High-level summaries, strategic progress, portfolio performance",
    contents: ["High-level summary", "Strategic progress", "Portfolio performance", "Key metrics"],
  },
  {
    type: "CLIENT",
    description: "Deliverables completed, progress visibility, upcoming milestones",
    contents: ["Deliverables completed", "Progress visibility", "Upcoming milestones", "Timeline updates"],
  },
];

export const REPORT_GENERATION_PROCESS: string[] = [
  "Collect workspace data",
  "Analyze trends and patterns",
  "Identify risks and opportunities",
  "Generate insights and recommendations",
  "Create formatted report",
  "Distribute to specified channels",
];

export const REPORT_ANSWERS: string[] = [
  "What happened?",
  "What changed?",
  "What is at risk?",
  "What requires attention?",
  "What should happen next?",
];

export const REPORT_FREQUENCIES: ReportFrequency[] = ["DAILY", "WEEKLY", "SPRINT", "MONTHLY", "QUARTERLY"];
export const REPORT_CHANNELS: DistributionChannel[] = ["DASHBOARD", "EMAIL", "CLIENT_PORTAL", "NOTIFICATION"];
