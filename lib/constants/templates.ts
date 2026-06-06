export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  { id: "PRD", name: "Product Requirements Document", description: "Standard PRD structure." },
  { id: "BUG_REPORT", name: "Structured Bug Report", description: "Template for reporting bugs." },
  { id: "WEEKLY_SYC", name: "Weekly Sync Agenda", description: "Auto-generate agenda." },
  { id: "ONBOARDING", name: "Member Onboarding Plan", description: "Checklist for new members." },
];

export interface BrowseTemplate {
  id: string;
  name: string;
  category: string;
}

export const BROWSE_TEMPLATES: BrowseTemplate[] = [
  { id: "SaaS_Launch", name: "SaaS Launch Kit", category: "Marketing" },
  { id: "Agile_Dev", name: "Agile Software Development", category: "Engineering" },
  { id: "Client_Onboarding", name: "Client Success Portal", category: "Sales" },
  { id: "Product_Launch", name: "Product Launch Roadmap", category: "Marketing" },
  { id: "Sprint_Sprint", name: "Two-Week Sprint Board", category: "Engineering" },
  { id: "Content_Calendar", name: "Content Marketing Calendar", category: "Marketing" },
  { id: "Bug_Tracker", name: "Bug Tracking & QA", category: "Engineering" },
  { id: "HR_Onboarding", name: "HR Employee Onboarding", category: "HR" },
  { id: "Design_Review", name: "Design Review & Approval", category: "Design" },
  { id: "Event_Planning", name: "Event Planning Timeline", category: "Operations" },
];

export const AVAILABLE_INTEGRATIONS = [
  "GitHub", "Slack", "Asana", "Trello", "Google Calendar",
] as const;
