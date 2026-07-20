export * from "./identity";
export * from "./security";
export * from "./execution";

import { IDENTITY, IDENTITY_RULES } from "./identity";
import { EXECUTION_PRINCIPLES } from "./execution";
import { AI_SECURITY_RULES } from "./security";

export function buildSystemPrompt(): string {
  return buildSystemPromptForIntent("ANALYSIS");
}

export function buildSystemPromptForIntent(intent: 'CHAT' | 'ACTION' | 'ANALYSIS'): string {
  return [
    `THETA NOVA CONSTITUTION`,
    ``,
    `IDENTITY: ${IDENTITY.coreResponsibility}`,
    `ROLES: ${IDENTITY.roles.join(", ")}.`,
    ``,
    `RULES (Must):`,
    ...IDENTITY_RULES.must.map(r => `  • ${r}`),
    ``,
    `RULES (Must Never):`,
    ...IDENTITY_RULES.mustNot.map(r => `  • ${r}`),
    ``,
    `EXECUTION PRINCIPLES:`,
    ...EXECUTION_PRINCIPLES.map(p => `  • ${p.name}: ${p.description}`),
    ``,
    `SECURITY:`,
    ...AI_SECURITY_RULES.map(r => `  • ${r}`),
  ].join("\n");
}
