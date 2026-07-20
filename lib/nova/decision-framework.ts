import { intentFromString, type NovaIntent, type ConfirmationLevel } from "./constitution/execution";

export { type NovaIntent, type ConfirmationLevel } from "./constitution/execution";

export type DecisionStrategy = "PATH_A_IMMEDIATE" | "PATH_B_CONFIRMATION" | "PATH_C_MULTISTEP" | "PATH_D_INFO" | "PATH_E_PLANNING" | "PATH_F_ORCHESTRATION";

export interface DecisionResult {
  intent: NovaIntent;
  riskLevel: ConfirmationLevel;
  strategy: DecisionStrategy;
  requiresApproval: boolean;
  requiresConfirmation: boolean;
  reversible: boolean;
  explanation: string;
}

export class DecisionFramework {
  /**
   * Evaluate risk based on CONSEQUENCE, not just intent+keywords.
   * Risk = f(reversibility, blast radius, who is affected).
   */
  public static evaluate(prompt: string, context?: { affectedEntityCount?: number }): DecisionResult {
    const intent = intentFromString(prompt);
    const blastRadius = context?.affectedEntityCount ?? 1;

    let riskLevel: ConfirmationLevel = "LOW";
    let reversible = true;
    let explanation = "";

    // DELETE is always at least MEDIUM — the consequence is data loss
    if (intent === "DELETE") {
      if (blastRadius > 5) {
        // BULK delete — ask before, not after
        riskLevel = "HIGH";
        reversible = false;
        explanation = `This will delete ${blastRadius} items. This cannot be undone.`;
      } else if (blastRadius > 1) {
        riskLevel = "MEDIUM";
        reversible = true;
        explanation = `This will delete ${blastRadius} items.`;
      } else {
        riskLevel = "MEDIUM";
        reversible = true;
        explanation = "This will delete one item.";
      }
    }
    // UPDATE to system-wide settings, permissions, roles — HIGH
    else if (intent === "UPDATE" && /\b(role|permission|billing|subscription|plan|team|member|invite)\b/i.test(prompt)) {
      riskLevel = "HIGH";
      reversible = false;
      explanation = "This changes system-level settings that affect team access.";
    }
    // Bulk operations — MEDIUM minimum
    else if (blastRadius > 5 || /\b(bulk|all|every|mass|batch)\b/i.test(prompt)) {
      riskLevel = "MEDIUM";
      explanation = `This affects ${blastRadius}+ items.`;
    }
    // CREATE or single UPDATE — low risk, execute immediately
    else {
      riskLevel = "LOW";
      reversible = true;
      explanation = "Low-risk action, executing immediately.";
    }

    let strategy: DecisionStrategy = "PATH_A_IMMEDIATE";
    if (riskLevel === "HIGH") {
      strategy = "PATH_B_CONFIRMATION";
    } else if (riskLevel === "MEDIUM") {
      strategy = "PATH_B_CONFIRMATION";
    } else if (intent === "READ" || intent === "SEARCH" || intent === "ANALYZE" || intent === "REPORT") {
      strategy = "PATH_D_INFO";
    } else if (intent === "PLAN" || intent === "ORCHESTRATE") {
      strategy = "PATH_E_PLANNING";
    }

    return {
      intent,
      riskLevel,
      strategy,
      requiresApproval: riskLevel === "HIGH",
      requiresConfirmation: riskLevel === "MEDIUM",
      reversible,
      explanation,
    };
  }
}
