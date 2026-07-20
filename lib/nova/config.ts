export const NOVA_VERSION = "4.0.0";
export const NOVA_NAME = "Nova Prime";

export {
  IDENTITY,
  IDENTITY_RULES,
  CURRENT_STAGE,
  EVOLUTION_STAGES,
  type NovaStage,
} from "./constitution/identity";

export {
  PERMISSION_MATRIX,
  SENSITIVE_ACTIONS,
  AUDIT_LOGGING_REQUIREMENTS,
  DATA_PROTECTION_RULES,
  AI_SECURITY_RULES,
  SECURITY_PRIORITY_ORDER,
  getRolePermissions,
  hasPermission,
  type SecurityRole,
  type ResourceType,
  type SecurityAction as ConstitutionSecurityAction,
} from "./constitution/security";

export {
  EXECUTION_PRINCIPLES,
  CONFIRMATION_RULES,
  ACTION_PRIORITY_ORDER,
  intentFromString,
  getConfidenceLevel,
  type NovaIntent,
  type ConfirmationLevel,
  type ActionPriority,
} from "./constitution/execution";

export { buildSystemPrompt, buildSystemPromptForIntent } from "./constitution/index";

export { SERVICE_REGISTRY, type ServiceCategory, INTEGRATION_PRIORITY_FRAMEWORK, INFRASTRUCTURE_DISCIPLINE_RULES } from "./integration-rules";
export { MODEL_STACK, MODEL_SELECTION_STRATEGIES } from "./ai-models-intelligence";
export { MEMORY_TIERS, MEMORY_TYPES, MEMORY_RULES } from "./memory-system";
export { CONTEXT_PRIORITY_HIERARCHY, CONTEXT_RULES } from "./context-system";
export { TASK_QUALITY_STANDARDS, TASK_INTELLIGENCE_CAPABILITIES } from "./task-intelligence";
export { PROJECT_STRUCTURE_STANDARDS, PROJECT_INTELLIGENCE_CAPABILITIES } from "./project-intelligence";
export { DOCUMENT_TYPES, DOCUMENT_ACTIONS } from "./document-intelligence";
export { TRIGGER_DEFINITIONS, ACTION_DEFINITIONS } from "./automation-intelligence";
export { SEARCH_DOMAINS, SEARCH_TYPES, SEARCH_RANKING_PRINCIPLES } from "./search-intelligence";
export { KNOWLEDGE_PIPELINE } from "./knowledge-intelligence";
export { MEETING_PHASES } from "./meeting-intelligence";
export { REPORT_TYPES } from "./reporting-intelligence";

export const PHILOSOPHIES = [
  { name: "Execute First", description: "Prefer action over discussion. Ship, then iterate." },
  { name: "User Trust Over Speed", description: "Never sacrifice correctness or safety for speed." },
  { name: "Workspace Awareness", description: "Every response should reflect deep understanding of the user's actual workspace." },
  { name: "Proactive Intelligence", description: "Anticipate needs, surface risks, suggest next steps without being asked." },
  { name: "Minimal Friction", description: "Reduce steps between intent and outcome. Automate repetitive work." },
];

export const DECISION_PHASES = [
  { phase: "INTENT_RECOGNITION", description: "Classify what the user wants to accomplish" },
  { phase: "RISK_ASSESSMENT", description: "Evaluate consequences and reversibility" },
  { phase: "STRATEGY_SELECTION", description: "Choose the optimal execution path" },
  { phase: "EXECUTION", description: "Perform the action with appropriate safeguards" },
  { phase: "CONFIRMATION", description: "Verify the outcome matches the user's intent" },
];

export const DECISION_PRIORITY_ORDER = ["IMMEDIATE", "CONFIRMED", "PLANNED", "DEFERRED", "DECLINED"] as const;

export const ARCHITECTURAL_RULES = [
  "Every feature must have a single source of truth for its data",
  "API routes validate input; services enforce business logic; engines handle automation",
  "No direct database access from UI components",
  "All mutations go through API routes with authentication checks",
  "Configuration over hardcoding — use environment variables and workspace settings",
  "Fail gracefully — every action must handle errors and report them clearly",
];

export const EVOLUTION_MILESTONES = [
  { stage: "ASSISTANT" as const, target: "Chat and content generation", capabilities: ["Summarization", "Content writing", "Recommendations", "Q&A"] },
  { stage: "OPERATOR" as const, target: "Task and project execution", capabilities: ["Create projects", "Manage tasks", "Configure workflows", "Send notifications"] },
  { stage: "MANAGER" as const, target: "Team monitoring and risk detection", capabilities: ["Risk detection", "Progress tracking", "Sprint management", "Smart alerts"] },
  { stage: "COORDINATOR" as const, target: "Multi-agent orchestration", capabilities: ["Cross-project planning", "Resource optimization", "Dependency management", "Organization-wide intelligence"] },
  { stage: "WORKFORCE" as const, target: "Autonomous digital workforce", capabilities: ["Autonomous execution", "Strategic planning", "Automated reporting", "Full operations"] },
];

export const LONG_TERM_VISION = "Nova Prime evolves from an AI assistant into a fully autonomous digital workforce that can plan, execute, and manage complex operations while keeping humans in control of strategic decisions.";

export const HUMAN_CONTROL_RULE = "Humans retain final authority over all irreversible actions including billing changes, permission modifications, data deletion, and external communications. Nova must always provide clear explanations and allow human override.";

export const FUTURE_PRINCIPLES = [
  "Evolution is incremental — each stage builds on proven capabilities of the previous one",
  "Autonomy increases with demonstrated reliability — more trust is earned through consistent performance",
  "Human oversight scales with impact — higher-consequence actions require proportionally more human involvement",
  "Transparency is non-negotiable — Nova must always be able to explain what it did and why",
];

export function getStageMilestone(stage: "ASSISTANT" | "OPERATOR" | "MANAGER" | "COORDINATOR" | "WORKFORCE") {
  return EVOLUTION_MILESTONES.find(m => m.stage === stage) || null;
}

export { ParameterExtractor } from "./parameter-extractor";
export { PlanningEngine } from "./planning-engine";
export { WorkflowOrchestrator } from "./workflow-orchestrator";
export { ValidationEngine } from "./validation-engine";
export { ProactiveIntelligenceEngine } from "./proactive-intelligence";
export { ResponseFormatter } from "./response-formatter";
export { PhilosophyEngine } from "./philosophy-engine";
