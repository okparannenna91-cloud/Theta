import { intentFromString, DECISION_PRIORITY_ORDER, type NovaIntent, type DecisionStrategy } from "./constitution/decision-framework";
import { CONFIRMATION_RULES, type ConfirmationLevel } from "./constitution/execution-principles";

export { type NovaIntent, type DecisionStrategy } from "./constitution/decision-framework";
export { type ConfirmationLevel } from "./constitution/execution-principles";

export interface DecisionResult {
  intent: NovaIntent;
  riskLevel: ConfirmationLevel;
  strategy: DecisionStrategy;
  requiresApproval: boolean;
  requiresConfirmation: boolean;
  reversible: boolean;
  explanation: string;
}

const HIGH_RISK_DELETE_KEYWORDS = [
  /\bproject\b/i, /\bworkspace\b/i, /\bmember\b/i, /\buser\b/i,
  /\binitiative\b/i, /\bteam\b/i, /\borg\b/i, /\bgroup\b/i, /\bpersonnel\b/i,
  /\baccount\b/i, /\btenant\b/i, /\bboard\b/i, /\bsprint\b/i,
  /\bmilestone\b/i, /\bportfolio\b/i, /\bprogram\b/i,
];

const BILLING_SPECIFIC_KEYWORDS = [
  /\bbilling\b/i, /\bsubscription\b/i, /\bpayment\b/i, /\binvoice\b/i,
  /\bpricing\b/i, /\bcharge\b/i, /\brefund\b/i, /\bcheckout\b/i,
  /\breceipt\b/i,
];

const BILLING_AMBIGUOUS_KEYWORDS = [
  /\bplan\b/i, /\bcancel\b/i, /\bupgrade\b/i, /\bdowngrade\b/i,
  /\bcredit\b/i, /\bfee\b/i, /\btier\b/i, /\brenew\b/i, /\bcard\b/i,
];

const HIGH_RISK_INTENT_PATTERNS = [
  /\berase\s+(the\s+)?\w+/i,
  /\bwipe\s+(out\s+)?(the\s+)?\w+/i,
  /\bpurge\s+\w+/i,
  /\bclear\s+(out\s+)?(all\s+)?\w+/i,
  /\bnuke\s+\w+/i,
  /\bremove\s+(all\s+)?(the\s+)?\w+/i,
  /\bkill\s+\w+/i,
  /\barchive\s+(the\s+)?\w+/i,
  /\bdiscontinue\s+\w+/i,
  /\bterminate\s+\w+/i,
  /\beliminate\s+\w+/i,
];

export class DecisionFramework {
  public static evaluate(prompt: string): DecisionResult {
    const cleanPrompt = prompt.toLowerCase().trim();
    const intent = intentFromString(prompt);

    let riskLevel: ConfirmationLevel = "LOW";
    let reversible = true;
    let explanation = "Action is low risk and executes immediately.";

    const isDeleteIntent = intent === "DELETE";
    const matchesAnyKeyword = (list: RegExp[]) => list.some(r => r.test(cleanPrompt));

    const hasBillingSpecific = matchesAnyKeyword(BILLING_SPECIFIC_KEYWORDS);
    const hasBillingAmbiguous = matchesAnyKeyword(BILLING_AMBIGUOUS_KEYWORDS);
    const isBillingModify = hasBillingSpecific ||
      (hasBillingAmbiguous && !isDeleteIntent && intent !== "READ");

    const hasHighRiskPatterns = matchesAnyKeyword(HIGH_RISK_INTENT_PATTERNS);
    const isHighRiskDelete = isDeleteIntent && (matchesAnyKeyword(HIGH_RISK_DELETE_KEYWORDS) || hasHighRiskPatterns);

    if (isHighRiskDelete || isBillingModify) {
      riskLevel = "HIGH";
      reversible = !isBillingModify;
      explanation = "High-risk system modification. Explicit confirmation is required.";
    } else if (intent === "UPDATE" || (intent === "CREATE" && cleanPrompt.includes("epic"))) {
      riskLevel = "MEDIUM";
      explanation = "Medium risk action. Confirmation is requested.";
    }

    let strategy: DecisionStrategy = "PATH_A_IMMEDIATE";
    if (riskLevel === "HIGH") {
      strategy = "PATH_B_CONFIRMATION";
    } else if (intent === "READ" && !cleanPrompt.includes("task") && !cleanPrompt.includes("project")) {
      strategy = "PATH_D_INFO";
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
