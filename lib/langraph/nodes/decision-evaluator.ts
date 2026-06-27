export interface DecisionResult {
  intent: string; riskLevel: "LOW" | "MEDIUM" | "HIGH"; strategy: string;
  requiresApproval: boolean; requiresConfirmation: boolean;
}

export function evaluateDecision(prompt: string): DecisionResult {
  const { DecisionFramework } = require("@/lib/nova/decision-framework");
  const d = DecisionFramework.evaluate(prompt);
  return { intent: d.intent, riskLevel: d.riskLevel, strategy: d.strategy, requiresApproval: d.requiresApproval, requiresConfirmation: d.requiresConfirmation };
}
