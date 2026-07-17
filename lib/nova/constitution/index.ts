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
import { PHILOSOPHIES } from "./philosophy";
import { EXECUTION_PRINCIPLES } from "./execution-principles";
import { REPORT_TYPES, REPORT_GENERATION_PROCESS } from "./reporting-standards";
import { CONTEXT_PRIORITY_HIERARCHY, CONTEXT_RULES, CONTEXT_WINDOW_STRATEGY, PROACTIVE_INSIGHT_TYPES } from "./context";
import { AI_SECURITY_RULES } from "./security";

export function buildSystemPrompt(): string {
  return buildSystemPromptForIntent("ANALYSIS");
}

export function buildSystemPromptForIntent(intent: 'CHAT' | 'ACTION' | 'ANALYSIS'): string {
  const sections: string[] = [
    `THETA NOVA PRIME CONSTITUTION V2`,
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
  ];

  switch (intent) {
    case "CHAT": {
      const chatPhilosophies = PHILOSOPHIES.filter(p =>
        ["Context Is Sacred", "Intelligence Should Be Invisible", "Trust Must Be Earned", "Conversation First", "User Instructions Are Law", "Think Before Acting", "Natural Conversation"].includes(p.name)
      );
      sections.push(
        buildSection("SECTION 2 — CORE PHILOSOPHY", [
          ...chatPhilosophies.map(p => [
            `Philosophy: ${p.name}`,
            `  ${p.description}`,
            ...p.rules.map(r => `  • ${r}`),
          ].join("\n")),
        ].join("\n\n")),
      );
      break;
    }

    case "ACTION": {
      const executionPhilosophies = PHILOSOPHIES.filter(p =>
        ["Execution Over Conversation", "Reduce Human Effort", "Integrate Before Building", "User Instructions Are Law", "Goal-Oriented Thinking", "Autonomous Planning", "Tool Orchestration", "Execution Confidence", "Reliable Actions"].includes(p.name)
      );
      sections.push(
        buildSection("SECTION 2 — CORE PHILOSOPHY", [
          ...executionPhilosophies.map(p => [
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
        buildSection("SECTION 18 — SECURITY RULES", [
          "AI Security Rules:",
          ...AI_SECURITY_RULES.map(r => `  • ${r}`),
        ].join("\n")),
      );
      break;
    }

    case "ANALYSIS": {
      sections.push(
        buildSection("SECTION 5 — REPORTING STANDARDS", [
          "Report Types:",
          ...REPORT_TYPES.map(r => `  • ${r.type}: ${r.description}`),
          "",
          "Generation Process:",
          ...REPORT_GENERATION_PROCESS.map((s, i) => `  ${i + 1}. ${s}`),
        ].join("\n")),
        buildSection("SECTION 8 — CONTEXT SYSTEM", [
          "Context Priority Hierarchy:",
          ...CONTEXT_PRIORITY_HIERARCHY.map(c => `  • Priority ${c.priority}: ${c.source} — ${c.description} (Token Budget: ${c.tokenBudget})`),
          "",
          "Rules:",
          ...CONTEXT_RULES.map(r => `  • ${r}`),
          "",
          "Context Window Strategy:",
          ...CONTEXT_WINDOW_STRATEGY.map(s => `  • ${s}`),
          "",
          "Proactive Insight Types:",
          ...PROACTIVE_INSIGHT_TYPES.map(t => `  • ${t}`),
        ].join("\n")),
      );
      break;
    }

  }

  sections.push("", `THETA NOVA PRIME CONSTITUTION V2 — INTENT: ${intent}`);
  return sections.join("\n\n");
}

function buildSection(heading: string, body: string | string[]): string {
  return `${heading}\n\n${Array.isArray(body) ? body.join("\n") : body}`;
}
