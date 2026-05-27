export * from "./identity";
export * from "./philosophy";
export * from "./execution-principles";
export * from "./decision-framework";
export * from "./architecture";
export * from "./ai-models";
export * from "./memory";
export * from "./context";
export * from "./task-standards";
export * from "./project-standards";
export * from "./document-standards";
export * from "./automation-standards";
export * from "./search-standards";
export * from "./knowledge-standards";
export * from "./meeting-standards";
export * from "./reporting-standards";
export * from "./agent-framework";
export * from "./security";
export * from "./integration-rules";
export * from "./evolution";

import { IDENTITY, IDENTITY_RULES, EVOLUTION_STAGES, CURRENT_STAGE } from "./identity";
import { PHILOSOPHIES, ACTION_PRIORITY_ORDER } from "./philosophy";
import { EXECUTION_PRINCIPLES, CONFIRMATION_RULES, EXECUTION_STEPS, EXECUTION_STEP_LABELS } from "./execution-principles";
import { DECISION_PHASES, DECISION_PRIORITY_ORDER } from "./decision-framework";
import { ARCHITECTURAL_RULES } from "./architecture";
import { MODEL_STACK, MODEL_SELECTION_STRATEGIES, MODEL_SELECTION_RULES } from "./ai-models";
import { MEMORY_TIERS, MEMORY_TYPES, MEMORY_RULES, MEMORY_USER_CONTROLS } from "./memory";
import { CONTEXT_PRIORITY_HIERARCHY, CONTEXT_RULES, CONTEXT_WINDOW_STRATEGY } from "./context";
import { TASK_QUALITY_STANDARDS, TASK_CREATION_FLOW, TASK_INTELLIGENCE_CAPABILITIES } from "./task-standards";
import { PROJECT_STRUCTURE_STANDARDS, PROJECT_CREATION_FLOW, PROJECT_INTELLIGENCE_CAPABILITIES, PROJECT_MONITORING_AREAS } from "./project-standards";
import { DOCUMENT_TYPES, DOCUMENT_UNDERSTANDING_PIPELINE, DOCUMENT_ACTIONS, DOCUMENT_WORKSPACE_LINK_TYPES } from "./document-standards";
import { TRIGGER_DEFINITIONS, ACTION_DEFINITIONS, AUTOMATION_SAFETY_RULES } from "./automation-standards";
import { SEARCH_DOMAINS, SEARCH_TYPES, SEARCH_RANKING_PRINCIPLES, SEARCH_INTELLIGENCE_RULES } from "./search-standards";
import { KNOWLEDGE_PIPELINE, KNOWLEDGE_CITATION_RULES } from "./knowledge-standards";
import { MEETING_PHASES } from "./meeting-standards";
import { REPORT_TYPES, REPORT_GENERATION_PROCESS, REPORT_ANSWERS } from "./reporting-standards";
import { AGENT_REGISTRY, AGENT_COLLABORATION_RULES } from "./agent-framework";
import { PERMISSION_MATRIX, SENSITIVE_ACTIONS, AUDIT_LOGGING_REQUIREMENTS, DATA_PROTECTION_RULES, AI_SECURITY_RULES, SECURITY_PRIORITY_ORDER } from "./security";
import { INTEGRATION_PRIORITY_FRAMEWORK, INTEGRATION_EVALUATION_QUESTIONS, INFRASTRUCTURE_DISCIPLINE_RULES } from "./integration-rules";
import { EVOLUTION_MILESTONES, LONG_TERM_VISION, FUTURE_PRINCIPLES, HUMAN_CONTROL_RULE } from "./evolution";

export function buildSystemPrompt(): string {
  return [
    `THETA NOVA CONSTITUTION V1`,
    buildSection("SECTION 1 — IDENTITY", [
      `Purpose: ${IDENTITY.coreResponsibility}`,
      `Roles: ${IDENTITY.roles.join(", ")}.`,
      `Current Stage: ${CURRENT_STAGE} — ${EVOLUTION_STAGES[CURRENT_STAGE]}`,
      "",
      "Identity Rules (Must):",
      ...IDENTITY_RULES.must.map(r => `  • ${r}`),
      "",
      "Identity Rules (Must Never):",
      ...IDENTITY_RULES.mustNot.map(r => `  • ${r}`),
    ]),
    buildSection("SECTION 2 — CORE PHILOSOPHY", [
      ...PHILOSOPHIES.map(p => [
        `Philosophy: ${p.name}`,
        `  ${p.description}`,
        ...p.rules.map(r => `  • ${r}`),
      ].join("\n")),
    ].join("\n\n")),
    buildSection("SECTION 3 — EXECUTION PRINCIPLES", [
      ...EXECUTION_PRINCIPLES.map(p => [
        `${p.name}: ${p.description}`,
        ...p.details.map(d => `  • ${d}`),
      ].join("\n")),
    ].join("\n\n")),
    buildSection("SECTION 4 — DECISION FRAMEWORK", [
      "Decision Priority Order:",
      ...DECISION_PRIORITY_ORDER.map((p, i) => `  ${i + 1}. ${p}`),
      "",
      ...DECISION_PHASES.map(phase => [
        `Phase: ${phase.name}`,
        `  ${phase.description}`,
        ...phase.steps.map(s => `  • ${s}`),
      ].join("\n")),
    ].join("\n\n")),
    buildSection("SECTION 5 — ARCHITECTURE", [
      ...ARCHITECTURAL_RULES.map(r => `• ${r}`),
    ].join("\n")),
    buildSection("SECTION 6 — AI MODELS", [
      "Model Stack:",
      ...MODEL_STACK.map(m => `  • ${m.provider} (${m.layer}): ${m.purpose}`),
      "",
      "Model Selection:",
      ...MODEL_SELECTION_STRATEGIES.map(s => `  • ${s.complexity} (${s.description}): ${s.recommendedModels.join(", ")}`),
      "",
      "Rules:",
      ...MODEL_SELECTION_RULES.map(r => `  • ${r}`),
    ].join("\n")),
    buildSection("SECTION 7 — MEMORY SYSTEM", [
      ...MEMORY_TIERS.map(t => `  • ${t.tier} (${t.storage}): ${t.purpose}`),
      "",
      "Memory Types:",
      ...MEMORY_TYPES.map(m => `  • ${m.type}: ${m.description}`),
      "",
      "Rules:",
      ...MEMORY_RULES.map(r => `  • ${r}`),
      "",
      "User Controls:",
      ...MEMORY_USER_CONTROLS.map(c => `  • ${c}`),
    ].join("\n")),
    buildSection("SECTION 8 — CONTEXT SYSTEM", [
      "Context Priority Hierarchy:",
      ...CONTEXT_PRIORITY_HIERARCHY.map(c => `  • Priority ${c.priority}: ${c.source} — ${c.description}`),
      "",
      "Rules:",
      ...CONTEXT_RULES.map(r => `  • ${r}`),
      "",
      "Context Window Strategy:",
      ...CONTEXT_WINDOW_STRATEGY.map(s => `  • ${s}`),
    ].join("\n")),
    buildSection("SECTION 9 — TASK INTELLIGENCE", [
      "Task Creation Flow:",
      ...TASK_CREATION_FLOW.map((s, i) => `  ${i + 1}. ${s}`),
      "",
      "Quality Standards:",
      ...TASK_QUALITY_STANDARDS.map(s => `  • ${s.attribute}: ${s.description}`),
      "",
      "Capabilities:",
      ...TASK_INTELLIGENCE_CAPABILITIES.map(c => `  • ${c.name}: ${c.description}`),
    ].join("\n")),
    buildSection("SECTION 10 — PROJECT INTELLIGENCE", [
      "Project Creation Flow:",
      ...PROJECT_CREATION_FLOW.map((s, i) => `  ${i + 1}. ${s}`),
      "",
      "Structure Standards:",
      ...PROJECT_STRUCTURE_STANDARDS.map(s => `  • ${s.component}: ${s.description}`),
      "",
      "Monitoring Areas:",
      ...PROJECT_MONITORING_AREAS.map(a => `  • ${a}`),
      "",
      "Capabilities:",
      ...PROJECT_INTELLIGENCE_CAPABILITIES.map(c => `  • ${c.name}: ${c.description}`),
    ].join("\n")),
    buildSection("SECTION 11 — DOCUMENT INTELLIGENCE", [
      "Document Types:",
      ...DOCUMENT_TYPES.map(d => `  • ${d.type}: ${d.description}`),
      "",
      "Understanding Pipeline:",
      ...DOCUMENT_UNDERSTANDING_PIPELINE.map((s, i) => `  ${i + 1}. ${s}`),
      "",
      "Available Actions:",
      ...DOCUMENT_ACTIONS.map(a => `  • ${a.name}: ${a.description}`),
      "",
      "Workspace Link Types:",
      ...DOCUMENT_WORKSPACE_LINK_TYPES.map(l => `  • ${l}`),
    ].join("\n")),
    buildSection("SECTION 12 — AUTOMATION INTELLIGENCE", [
      "Available Triggers:",
      ...TRIGGER_DEFINITIONS.map(t => `  • ${t.trigger}: ${t.description}`),
      "",
      "Available Actions:",
      ...ACTION_DEFINITIONS.map(a => `  • ${a.action}: ${a.description}`),
      "",
      "Safety Rules:",
      ...AUTOMATION_SAFETY_RULES.map(r => `  • ${r}`),
    ].join("\n")),
    buildSection("SECTION 13 — SEARCH INTELLIGENCE", [
      "Search Domains:",
      ...SEARCH_DOMAINS.map(d => `  • ${d.domain}: ${d.description}`),
      "",
      "Search Types:",
      ...SEARCH_TYPES.map(t => `  • ${t.type}: ${t.description}`),
      "",
      "Ranking Principles:",
      ...SEARCH_RANKING_PRINCIPLES.map(p => `  • ${p}`),
      "",
      "Rules:",
      ...SEARCH_INTELLIGENCE_RULES.map(r => `  • ${r}`),
    ].join("\n")),
    buildSection("SECTION 14 — KNOWLEDGE INTELLIGENCE", [
      "Pipeline:",
      ...KNOWLEDGE_PIPELINE.map((s, i) => `  ${i + 1}. ${s.step} — ${s.description}`),
      "",
      "Citation Rules:",
      ...KNOWLEDGE_CITATION_RULES.map(r => `  • ${r}`),
    ].join("\n")),
    buildSection("SECTION 15 — MEETING INTELLIGENCE", [
      ...MEETING_PHASES.map(phase => [
        `${phase.phase}: ${phase.description}`,
        ...phase.capabilities.map(c => `  • ${c}`),
      ].join("\n")),
    ].join("\n\n")),
    buildSection("SECTION 16 — REPORTING INTELLIGENCE", [
      "Report Types:",
      ...REPORT_TYPES.map(r => `  • ${r.type}: ${r.description}`),
      "",
      "Generation Process:",
      ...REPORT_GENERATION_PROCESS.map((s, i) => `  ${i + 1}. ${s}`),
      "",
      "Every Report Answers:",
      ...REPORT_ANSWERS.map(a => `  • ${a}`),
    ].join("\n")),
    buildSection("SECTION 17 — AGENT FRAMEWORK", [
      "Available Agents:",
      ...AGENT_REGISTRY.map(a => [
        `  • ${a.name}: ${a.purpose}`,
        `    Responsibilities: ${a.responsibilities.join(", ")}`,
        `    Tools: ${a.tools.join(", ")}`,
      ].join("\n")),
      "",
      "Collaboration Rules:",
      ...AGENT_COLLABORATION_RULES.map(r => `  • ${r}`),
    ].join("\n")),
    buildSection("SECTION 18 — SECURITY RULES", [
      "Permission Levels:",
      ...PERMISSION_MATRIX.map(p => `  • ${p.role}: ${p.description}`),
      "",
      "Sensitive Actions (Require Confirmation):",
      ...SENSITIVE_ACTIONS.map(a => `  • ${a}`),
      "",
      "Audit Logging Requirements:",
      ...AUDIT_LOGGING_REQUIREMENTS.map(r => `  • ${r}`),
      "",
      "Data Protection Rules:",
      ...DATA_PROTECTION_RULES.map(r => `  • ${r}`),
      "",
      "AI Security Rules:",
      ...AI_SECURITY_RULES.map(r => `  • ${r}`),
    ].join("\n")),
    buildSection("SECTION 19 — THIRD-PARTY INTEGRATION RULES", [
      "Integration Priority Framework:",
      ...INTEGRATION_PRIORITY_FRAMEWORK.map(r => `  • Priority ${r.priority}: ${r.label} — ${r.description}`),
      "",
      "Evaluation Questions:",
      ...INTEGRATION_EVALUATION_QUESTIONS.map(q => `  • ${q.question}: ${q.description}`),
      "",
      "Discipline Rules:",
      ...INFRASTRUCTURE_DISCIPLINE_RULES.map(r => `  • ${r}`),
    ].join("\n")),
    buildSection("SECTION 20 — FUTURE EVOLUTION", [
      `Current Stage: ${CURRENT_STAGE}`,
      ...EVOLUTION_MILESTONES.map(m => `  • ${m.stage}: ${m.target} — ${m.capabilities.join(", ")}`),
      "",
      `Long-Term Vision: ${LONG_TERM_VISION}`,
      "",
      "Future Principles:",
      ...FUTURE_PRINCIPLES.map(p => `  • ${p}`),
      "",
      HUMAN_CONTROL_RULE,
    ].join("\n")),
    "",
    `THETA NOVA CONSTITUTION V1 — FOUNDATION COMPLETE`,
    `Sections 1–20 define: Identity, Philosophy, Execution Logic, Architecture, AI Models, Memory, Context, Tasks, Projects, Documents, Automations, Search, Knowledge, Meetings, Reporting, Agents, Security, Integrations, and Future Evolution.`,
  ].join("\n\n");
}

function buildSection(heading: string, body: string | string[]): string {
  return `${heading}\n\n${Array.isArray(body) ? body.join("\n") : body}`;
}
