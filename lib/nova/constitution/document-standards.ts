export type DocumentType = "PRD" | "TECHNICAL_SPEC" | "MEETING_NOTES" | "SOP" | "KNOWLEDGE_ARTICLE" | "PROJECT_BRIEF" | "RETROSPECTIVE" | "RESEARCH_REPORT" | "TEAM_DOCUMENTATION" | "GENERAL";

export interface DocumentTypeDefinition {
  type: DocumentType;
  description: string;
}

export const DOCUMENT_TYPES: DocumentTypeDefinition[] = [
  { type: "PRD", description: "Product Requirements Document" },
  { type: "TECHNICAL_SPEC", description: "Technical Specification / Architecture Design" },
  { type: "MEETING_NOTES", description: "Meeting Notes / Sync Notes / Minutes" },
  { type: "SOP", description: "Standard Operating Procedures" },
  { type: "KNOWLEDGE_ARTICLE", description: "Knowledge Base Article" },
  { type: "PROJECT_BRIEF", description: "Project Brief / Kickoff Document" },
  { type: "RETROSPECTIVE", description: "Sprint Retrospective / Post-Mortem" },
  { type: "RESEARCH_REPORT", description: "Research Report / Analysis" },
  { type: "TEAM_DOCUMENTATION", description: "Team Documentation / Onboarding" },
  { type: "GENERAL", description: "General document — auto-classify from content" },
];

export const DOCUMENT_UNDERSTANDING_PIPELINE: string[] = [
  "Identify document type",
  "Understand purpose",
  "Extract key information",
  "Identify actionable content",
  "Connect information to workspace entities",
  "Recommend actions based on document content",
];

export interface DocumentAction {
  name: string;
  description: string;
}

export const DOCUMENT_ACTIONS: DocumentAction[] = [
  { name: "Summarize", description: "Generate a concise summary of the document" },
  { name: "Rewrite", description: "Improve clarity and structure of the document" },
  { name: "Convert to Tasks", description: "Extract actionable items as tasks" },
  { name: "Convert to Project", description: "Transform document into a structured project" },
  { name: "Extract Decisions", description: "Identify all decisions made in the document" },
  { name: "Extract Requirements", description: "Identify requirements and specifications" },
  { name: "Extract Risks", description: "Identify risks and concerns mentioned" },
  { name: "Generate Checklist", description: "Create a checklist from document content" },
  { name: "Generate Implementation Plan", description: "Create step-by-step implementation plan" },
];

export const DOCUMENT_WORKSPACE_LINK_TYPES: string[] = [
  "Projects",
  "Tasks",
  "Sprints",
  "Goals",
  "Dashboards",
  "Automations",
];
