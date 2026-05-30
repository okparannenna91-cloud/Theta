export type ConfirmationLevel = "LOW" | "MEDIUM" | "HIGH";
export type ExecutionStep = "UNDERSTAND_INTENT" | "GATHER_CONTEXT" | "VALIDATE_PERMISSIONS" | "DETERMINE_PLAN" | "EXECUTE" | "RETURN_RESULTS";

export interface ExecutionPrinciple {
  name: string;
  description: string;
  details: string[];
}

export const EXECUTION_STEPS: ExecutionStep[] = [
  "UNDERSTAND_INTENT",
  "GATHER_CONTEXT",
  "VALIDATE_PERMISSIONS",
  "DETERMINE_PLAN",
  "EXECUTE",
  "RETURN_RESULTS",
];

export const EXECUTION_STEP_LABELS: Record<ExecutionStep, string> = {
  UNDERSTAND_INTENT: "Understand intent",
  GATHER_CONTEXT: "Gather context",
  VALIDATE_PERMISSIONS: "Validate permissions",
  DETERMINE_PLAN: "Determine action plan",
  EXECUTE: "Execute",
  RETURN_RESULTS: "Return results",
};

export interface ConfirmationRule {
  level: ConfirmationLevel;
  behavior: string;
  examples: string[];
}

export const CONFIRMATION_RULES: ConfirmationRule[] = [
  {
    level: "LOW",
    behavior: "Execute immediately",
    examples: ["Create task", "Generate summary", "Create document draft"],
  },
  {
    level: "MEDIUM",
    behavior: "Request confirmation",
    examples: ["Bulk edits", "Project restructuring"],
  },
  {
    level: "HIGH",
    behavior: "Require explicit approval",
    examples: ["Deleting projects", "Removing users", "Billing modifications"],
  },
];

export const EXECUTION_PRINCIPLES: ExecutionPrinciple[] = [
  {
    name: "Action First",
    description: "Whenever possible, do something.",
    details: [
      'Instead of: "Here is how to create a project."',
      'Prefer: "Project created."',
    ],
  },
  {
    name: "Structured Execution",
    description: "All actions follow a predictable pattern.",
    details: EXECUTION_STEPS.map(s => EXECUTION_STEP_LABELS[s]),
  },
  {
    name: "Confirmation Levels",
    description: "Actions classified by risk determine approval requirements.",
    details: CONFIRMATION_RULES.map(r => `${r.level}: ${r.behavior}`),
  },
  {
    name: "Reversible Actions",
    description: "Every possible action should support undo, retry, rollback, and audit tracking.",
    details: [
      "Support undo operations",
      "Support retry operations",
      "Support rollback operations",
      "Maintain audit tracking",
    ],
  },
  {
    name: "Multi-Step Execution",
    description: "Complex goals should be broken into steps.",
    details: [
      "Analyze backlog",
      "Detect priorities",
      "Estimate capacity",
      "Build sprint",
      "Assign work",
      "Generate report",
    ],
  },
  {
    name: "Background Work",
    description: "Long-running tasks should execute asynchronously.",
    details: [
      "Imports should run in background",
      "Analysis should run in background",
      "Large reports should run in background",
      "Bulk updates should run in background",
    ],
  },
];

export function getConfirmationBehavior(level: ConfirmationLevel): string {
  const rule = CONFIRMATION_RULES.find(r => r.level === level);
  return rule ? rule.behavior : "Execute immediately";
}
