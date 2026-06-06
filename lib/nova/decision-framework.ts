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

const HIGH_RISK_DELETE_KEYWORDS = [
  "project", "workspace", "member", "user",
  "initiative", "team", "org", "group", "personnel",
  "account", "tenant", "board", "sprint",
  "milestone", "portfolio", "program",
];

const BILLING_KEYWORDS = [
  "billing", "subscription", "card", "plan",
  "payment", "invoice", "pricing", "charge",
  "fee", "credit", "renew", "cancel.*plan",
  "downgrade", "upgrade.*plan", "refund",
  "tier", "checkout", "receipt",
];

const HIGH_RISK_INTENT_PATTERNS = [
  /erase\s+(the\s+)?\w+/i,
  /wipe\s+(out\s+)?(the\s+)?\w+/i,
  /purge\s+\w+/i,
  /clear\s+(out\s+)?(all\s+)?\w+/i,
  /nuke\s+\w+/i,
  /remove\s+(all\s+)?(the\s+)?\w+/i,
  /kill\s+\w+/i,
  /archive\s+(the\s+)?\w+/i,
  /discontinue\s+\w+/i,
  /terminate\s+\w+/i,
  /eliminate\s+\w+/i,
];

export class DecisionFramework {
  public static evaluate(prompt: string): DecisionResult {
    const cleanPrompt = prompt.toLowerCase().trim();
    const intent = intentFromString(prompt);

    let riskLevel: ConfirmationLevel = "LOW";
    let reversible = true;
    let explanation = "Action is low risk and executes immediately.";

    const isDeleteIntent = intent === "DELETE";
    const matchesAnyKeyword = (list: string[]) =>
      list.some(kw => cleanPrompt.includes(kw)) ||
      HIGH_RISK_INTENT_PATTERNS.some(p => p.test(cleanPrompt));

    const isHighRiskDelete = isDeleteIntent && matchesAnyKeyword(HIGH_RISK_DELETE_KEYWORDS);
    const isBillingModify = matchesAnyKeyword(BILLING_KEYWORDS);

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
