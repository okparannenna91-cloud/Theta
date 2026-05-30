import { SERVICE_REGISTRY, type ServiceDefinition, type ServiceCategory } from "./constitution/architecture";
import { INTEGRATION_PRIORITY_FRAMEWORK, INTEGRATION_EVALUATION_QUESTIONS, INFRASTRUCTURE_DISCIPLINE_RULES, type IntegrationPriority } from "./constitution/integration-rules";

export {
  SERVICE_REGISTRY,
  INTEGRATION_PRIORITY_FRAMEWORK,
  INTEGRATION_EVALUATION_QUESTIONS,
  INFRASTRUCTURE_DISCIPLINE_RULES,
  type ServiceDefinition,
  type ServiceCategory,
  type IntegrationPriority,
} from "./constitution/index";

export class IntegrationRulesEngine {
  public static getApprovedInfrastructure(): ServiceDefinition[] {
    return SERVICE_REGISTRY;
  }

  public static evaluateIntegration(
    serviceName: string,
    category: ServiceCategory,
    purpose: string
  ): { approved: boolean; reason: string; priority: IntegrationPriority } {
    const existing = SERVICE_REGISTRY.find(
      s => s.category === category && s.name.toLowerCase() === serviceName.toLowerCase()
    );

    if (existing) {
      return {
        approved: false,
        reason: `Service "${serviceName}" already exists in category "${category}". Avoid duplicate infrastructure.`,
        priority: 1,
      };
    }

    const sameCategoryCount = SERVICE_REGISTRY.filter(s => s.category === category).length;
    if (sameCategoryCount >= 3) {
      return {
        approved: false,
        reason: `Too many services in category "${category}". Consolidate before adding new ones.`,
        priority: 2,
      };
    }

    return {
      approved: true,
      reason: `Service "${serviceName}" approved for category "${category}". Purpose: ${purpose}`,
      priority: 3,
    };
  }

  public static getEvaluationQuestions(): typeof INTEGRATION_EVALUATION_QUESTIONS {
    return INTEGRATION_EVALUATION_QUESTIONS;
  }

  public static getDisciplineRules(): string[] {
    return INFRASTRUCTURE_DISCIPLINE_RULES;
  }

  public static getPriorityFramework(): typeof INTEGRATION_PRIORITY_FRAMEWORK {
    return INTEGRATION_PRIORITY_FRAMEWORK;
  }
}
