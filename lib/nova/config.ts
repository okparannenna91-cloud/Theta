export const NOVA_VERSION = "3.0.0";

import { buildSystemPrompt } from "./constitution/index";
export const NOVA_SYSTEM_PROMPT = buildSystemPrompt();

export {
  IDENTITY,
  IDENTITY_RULES,
  CURRENT_STAGE,
  EVOLUTION_STAGES,
  type NovaStage,
} from "./constitution/identity";

export {
  PHILOSOPHIES,
  ACTION_PRIORITY_ORDER,
  type ActionPriority,
} from "./constitution/philosophy";

export {
  EXECUTION_PRINCIPLES,
  CONFIRMATION_RULES,
  EXECUTION_STEPS,
  type ConfirmationLevel,
  type ExecutionStep,
} from "./constitution/execution-principles";

export {
  DECISION_PHASES,
  DECISION_PRIORITY_ORDER,
  intentFromString,
  type NovaIntent,
  type DecisionStrategy,
} from "./constitution/decision-framework";

export {
  SERVICE_REGISTRY,
  ARCHITECTURAL_RULES,
  getServiceByCategory,
  getServiceByName,
  type ServiceDefinition,
  type ServiceCategory,
} from "./constitution/architecture";

export {
  MODEL_STACK,
  MODEL_SELECTION_STRATEGIES,
  MODEL_SELECTION_RULES,
  getModelForComplexity,
  type TaskComplexity as ModelTaskComplexity,
  type ModelProvider,
} from "./constitution/ai-models";

export {
  MEMORY_TIERS,
  MEMORY_TYPES,
  MEMORY_RULES,
  MEMORY_USER_CONTROLS,
  type MemoryType,
  type MemoryTier,
} from "./constitution/memory";

export {
  CONTEXT_PRIORITY_HIERARCHY,
  CONTEXT_RULES,
  CONTEXT_WINDOW_STRATEGY,
  getContextPriority,
  type ContextSource,
  type ContextPriority,
} from "./constitution/context";

export {
  TASK_QUALITY_STANDARDS,
  TASK_CREATION_FLOW,
  TASK_INTELLIGENCE_CAPABILITIES,
  type TaskQualityStandard,
} from "./constitution/task-standards";

export {
  PROJECT_STRUCTURE_STANDARDS,
  PROJECT_CREATION_FLOW,
  PROJECT_INTELLIGENCE_CAPABILITIES,
  PROJECT_MONITORING_AREAS,
  type ProjectStructureStandard,
} from "./constitution/project-standards";

export {
  DOCUMENT_TYPES,
  DOCUMENT_UNDERSTANDING_PIPELINE,
  DOCUMENT_ACTIONS,
  DOCUMENT_WORKSPACE_LINK_TYPES,
  type DocumentType,
} from "./constitution/document-standards";

export {
  TRIGGER_DEFINITIONS,
  ACTION_DEFINITIONS,
  AUTOMATION_SAFETY_RULES,
  type AutomationTrigger,
  type AutomationAction,
} from "./constitution/automation-standards";

export {
  SEARCH_DOMAINS,
  SEARCH_TYPES,
  SEARCH_RANKING_PRINCIPLES,
  SEARCH_INTELLIGENCE_RULES,
  type SearchDomain,
  type SearchType,
} from "./constitution/search-standards";

export {
  KNOWLEDGE_PIPELINE,
  KNOWLEDGE_CITATION_RULES,
  KNOWLEDGE_STORAGE_ARCHITECTURE,
} from "./constitution/knowledge-standards";

export {
  MEETING_PHASES,
  type MeetingPhase,
} from "./constitution/meeting-standards";

export {
  REPORT_TYPES,
  REPORT_GENERATION_PROCESS,
  REPORT_ANSWERS,
  REPORT_FREQUENCIES,
  REPORT_CHANNELS,
  type ReportType,
  type ReportFrequency,
  type DistributionChannel,
} from "./constitution/reporting-standards";

export {
  AGENT_REGISTRY,
  AGENT_COLLABORATION_RULES,
  type AgentDefinition,
} from "./constitution/agent-framework";

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
  INTEGRATION_PRIORITY_FRAMEWORK,
  INTEGRATION_EVALUATION_QUESTIONS,
  INFRASTRUCTURE_DISCIPLINE_RULES,
  getApprovedInfrastructure,
  type IntegrationPriority,
} from "./constitution/integration-rules";

export {
  EVOLUTION_MILESTONES,
  LONG_TERM_VISION,
  FUTURE_PRINCIPLES,
  HUMAN_CONTROL_RULE,
  getStageMilestone,
} from "./constitution/evolution";

export { buildSystemPrompt, buildSystemPromptForIntent } from "./constitution/index";
