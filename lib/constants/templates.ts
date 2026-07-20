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
  // Engineering (10)
  { id: "SPRINT_PLANNING", name: "Sprint Planning", category: "Engineering" },
  { id: "BUG_TRIAGE", name: "Bug Triage", category: "Engineering" },
  { id: "CODE_REVIEW", name: "Code Review", category: "Engineering" },
  { id: "DEPLOYMENT_CHECKLIST", name: "Deployment Checklist", category: "Engineering" },
  { id: "INCIDENT_RESPONSE", name: "Incident Response", category: "Engineering" },
  { id: "TECH_DEBT_TRACKER", name: "Tech Debt Tracker", category: "Engineering" },
  { id: "API_DEVELOPMENT", name: "API Development", category: "Engineering" },
  { id: "DATABASE_MIGRATION", name: "Database Migration", category: "Engineering" },
  { id: "PERFORMANCE_AUDIT", name: "Performance Audit", category: "Engineering" },
  { id: "SECURITY_AUDIT", name: "Security Audit", category: "Engineering" },

  // Marketing (8)
  { id: "CONTENT_CALENDAR", name: "Content Calendar", category: "Marketing" },
  { id: "CAMPAIGN_LAUNCH", name: "Campaign Launch", category: "Marketing" },
  { id: "SOCIAL_MEDIA_SCHEDULE", name: "Social Media Schedule", category: "Marketing" },
  { id: "SEO_AUDIT", name: "SEO Audit", category: "Marketing" },
  { id: "EMAIL_SEQUENCE", name: "Email Sequence", category: "Marketing" },
  { id: "BRAND_GUIDELINES_MARKETING", name: "Brand Guidelines", category: "Marketing" },
  { id: "EVENT_PROMOTION", name: "Event Promotion", category: "Marketing" },
  { id: "PRODUCT_ANNOUNCEMENT", name: "Product Announcement", category: "Marketing" },

  // Sales (7)
  { id: "PIPELINE_STAGES", name: "Pipeline Stages", category: "Sales" },
  { id: "DEAL_TRACKING", name: "Deal Tracking", category: "Sales" },
  { id: "PROPOSAL_TEMPLATE", name: "Proposal Template", category: "Sales" },
  { id: "FOLLOWUP_SEQUENCE", name: "Follow-up Sequence", category: "Sales" },
  { id: "CLIENT_ONBOARDING", name: "Client Onboarding", category: "Sales" },
  { id: "ACCOUNT_REVIEW", name: "Account Review", category: "Sales" },
  { id: "SALES_PLAYBOOK", name: "Sales Playbook", category: "Sales" },

  // HR (6)
  { id: "EMPLOYEE_ONBOARDING", name: "Employee Onboarding", category: "HR" },
  { id: "PERFORMANCE_REVIEW", name: "Performance Review", category: "HR" },
  { id: "TIMEOFF_REQUEST", name: "Time-Off Request", category: "HR" },
  { id: "JOB_DESCRIPTION", name: "Job Description", category: "HR" },
  { id: "EXIT_INTERVIEW", name: "Exit Interview", category: "HR" },
  { id: "TRAINING_PROGRAM", name: "Training Program", category: "HR" },

  // Design (6)
  { id: "DESIGN_BRIEF", name: "Design Brief", category: "Design" },
  { id: "BRAND_GUIDELINES_DESIGN", name: "Brand Guidelines", category: "Design" },
  { id: "UX_RESEARCH", name: "UX Research", category: "Design" },
  { id: "WIREFRAME_REVIEW", name: "Wireframe Review", category: "Design" },
  { id: "ASSET_HANDOFF", name: "Asset Handoff", category: "Design" },
  { id: "DESIGN_SYSTEM", name: "Design System", category: "Design" },

  // Operations (6)
  { id: "MEETING_AGENDA", name: "Meeting Agenda", category: "Operations" },
  { id: "PROJECT_RETROSPECTIVE", name: "Project Retrospective", category: "Operations" },
  { id: "VENDOR_EVALUATION", name: "Vendor Evaluation", category: "Operations" },
  { id: "BUDGET_PLANNING", name: "Budget Planning", category: "Operations" },
  { id: "RISK_ASSESSMENT", name: "Risk Assessment", category: "Operations" },
  { id: "PROCESS_IMPROVEMENT", name: "Process Improvement", category: "Operations" },

  // Product (6)
  { id: "PRD_TEMPLATE", name: "PRD", category: "Product" },
  { id: "USER_STORY", name: "User Story", category: "Product" },
  { id: "COMPETITIVE_ANALYSIS", name: "Competitive Analysis", category: "Product" },
  { id: "FEATURE_PRIORITIZATION", name: "Feature Prioritization", category: "Product" },
  { id: "LAUNCH_CHECKLIST", name: "Launch Checklist", category: "Product" },
  { id: "ROADMAP_PLANNING", name: "Roadmap Planning", category: "Product" },

  // General (6)
  { id: "WEEKLY_SYNC", name: "Weekly Sync", category: "General" },
  { id: "TEAM_RETROSPECTIVE", name: "Team Retrospective", category: "General" },
  { id: "GOAL_SETTING", name: "Goal Setting", category: "General" },
  { id: "DECISION_LOG", name: "Decision Log", category: "General" },
  { id: "KNOWLEDGE_BASE", name: "Knowledge Base", category: "General" },
  { id: "NEW_HIRE_CHECKLIST", name: "New Hire Checklist", category: "General" },
];

export const AVAILABLE_INTEGRATIONS = [
  "GitHub", "Slack", "Asana", "Trello", "Google Calendar",
] as const;
