import { SERVICE_REGISTRY, ServiceDefinition } from "./architecture";

export type IntegrationPriority = 1 | 2 | 3 | 4;

export interface IntegrationRule {
  priority: IntegrationPriority;
  label: string;
  description: string;
}

export const INTEGRATION_PRIORITY_FRAMEWORK: IntegrationRule[] = [
  { priority: 1, label: "Existing Theta capability", description: "Use existing platform features before adding new dependencies" },
  { priority: 2, label: "Existing integrated service", description: "Use services already integrated into the platform" },
  { priority: 3, label: "External API", description: "Integrate with external APIs before building custom solutions" },
  { priority: 4, label: "Custom implementation", description: "Build custom implementation only when no existing solution exists" },
];

export interface IntegrationEvaluationQuestion {
  question: string;
  description: string;
}

export const INTEGRATION_EVALUATION_QUESTIONS: IntegrationEvaluationQuestion[] = [
  { question: "Is there an existing service?", description: "Check if a suitable service already exists in the registry" },
  { question: "Is it reliable?", description: "Evaluate the service's reliability track record" },
  { question: "Is it scalable?", description: "Ensure the service can scale with Theta's growth" },
  { question: "Is it cost-effective?", description: "Assess the cost relative to building in-house" },
  { question: "Does it reduce maintenance?", description: "Verify the service reduces long-term maintenance burden" },
];

export const INFRASTRUCTURE_DISCIPLINE_RULES: string[] = [
  "Every new dependency must have a clear purpose",
  "Every dependency must have a defined owner",
  "Every dependency must provide measurable value",
  "No tool should be added because it is popular",
  "Dependencies must be documented in the service registry",
];

export function getApprovedInfrastructure(): ServiceDefinition[] {
  return SERVICE_REGISTRY;
}

export function getIntegrationPriorityLabel(priority: IntegrationPriority): string {
  const rule = INTEGRATION_PRIORITY_FRAMEWORK.find(r => r.priority === priority);
  return rule ? rule.label : "Unknown priority";
}
