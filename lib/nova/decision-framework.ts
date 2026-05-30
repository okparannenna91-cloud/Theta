import { intentFromString, DECISION_PRIORITY_ORDER, type NovaIntent, type DecisionStrategy } from "./constitution/decision-framework";
import { CONFIRMATION_RULES, type ConfirmationLevel } from "./constitution/execution-principles";

export { type NovaIntent, type DecisionStrategy } from "./constitution/decision-framework";
export { type ConfirmationLevel } from "./constitution/execution-principles";

export interface DecisionResult {
  intent: NovaIntent;
  riskLevel: ConfirmationLevel;
  strategy: DecisionStrategy;
  requiresApproval: boolean;
  reversible: boolean;
  explanation: string;
}

export class DecisionFramework {
  public static evaluate(prompt: string): DecisionResult {
    const cleanPrompt = prompt.toLowerCase().trim();
    const intent = intentFromString(prompt);

    let riskLevel: ConfirmationLevel = "LOW";
    let reversible = true;
    let explanation = "Action is low risk and executes immediately.";

    const isHighRiskDelete = intent === "DELETE" && (
      cleanPrompt.includes("project") ||
      cleanPrompt.includes("workspace") ||
      cleanPrompt.includes("member") ||
      cleanPrompt.includes("user")
    );
    const isBillingModify = cleanPrompt.includes("billing") ||
      cleanPrompt.includes("subscription") ||
      cleanPrompt.includes("card") ||
      cleanPrompt.includes("plan");

    if (isHighRiskDelete || isBillingModify) {
      riskLevel = "HIGH";
      reversible = isHighRiskDelete;
      explanation = "High-risk system modification. Explicit confirmation is required.";
    } else if (intent === "UPDATE" || (intent === "CREATE" && cleanPrompt.includes("epic"))) {
      riskLevel = "MEDIUM";
      explanation = "Medium risk action. Execution will proceed with prompt citations.";
    }

    let strategy: DecisionStrategy = "PATH_A_IMMEDIATE";
    if (riskLevel === "HIGH") {
      strategy = "PATH_B_CONFIRMATION";
    } else if (cleanPrompt.includes("then") || cleanPrompt.includes("and then") || cleanPrompt.includes("steps")) {
      strategy = "PATH_C_MULTISTEP";
    } else if (intent === "READ" && !cleanPrompt.includes("task") && !cleanPrompt.includes("project")) {
      strategy = "PATH_D_INFO";
    }

    return {
      intent,
      riskLevel,
      strategy,
      requiresApproval: riskLevel === "HIGH",
      reversible,
      explanation,
    };
  }
}
