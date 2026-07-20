export type ServiceCategory = "database" | "auth" | "realtime" | "memory" | "cache" | "ai" | "storage" | "email" | "payments" | "queue";
export type IntegrationPriority = 1 | 2 | 3 | 4;

export interface ServiceDefinition {
  name: string;
  provider: string;
  category: ServiceCategory;
  purpose: string;
  responsibilities: string[];
  fallback?: string;
}

export const SERVICE_REGISTRY: ServiceDefinition[] = [
  { name: "Primary Database", provider: "MongoDB Atlas", category: "database", purpose: "Workspace data", responsibilities: ["Persist all workspace entities"] },
  { name: "Authentication", provider: "Clerk", category: "auth", purpose: "Authentication", responsibilities: ["Handle user login"] },
  { name: "Realtime Infrastructure", provider: "Ably", category: "realtime", purpose: "Live updates", responsibilities: ["Broadcast UI actions"] },
  { name: "Long-Term Memory", provider: "Mem0", category: "memory", purpose: "Long-term memory", responsibilities: ["Store user preferences"] },
  { name: "Fast Context Storage", provider: "Upstash Redis", category: "cache", purpose: "Session memory", responsibilities: ["Cache short-term history"] },
  { name: "AI Router", provider: "OpenRouter", category: "ai", purpose: "Primary routing", responsibilities: ["Route AI requests"] },
  { name: "AI Fallback 1", provider: "Gemini", category: "ai", purpose: "Fallback execution", responsibilities: ["Handle fallback requests"] },
  { name: "AI Fallback 2", provider: "Cohere", category: "ai", purpose: "Third layer fallback", responsibilities: ["Handle requests when Gemini unavailable"] },
  { name: "AI Fallback 3", provider: "OpenAI", category: "ai", purpose: "Last resort fallback", responsibilities: ["Serve as last resort"] },
  { name: "Storage Layer", provider: "Cloudinary", category: "storage", purpose: "Media uploads", responsibilities: ["Store uploaded files"] },
  { name: "Email Layer", provider: "Resend", category: "email", purpose: "Notifications", responsibilities: ["Send transactional emails"] },
  { name: "Payment Processor 1", provider: "Paystack", category: "payments", purpose: "NGN billing", responsibilities: ["Process NGN payments"] },
  { name: "Payment Processor 2", provider: "Ivno", category: "payments", purpose: "USD/crypto billing", responsibilities: ["Process USD payments"] },
  { name: "Background Jobs", provider: "Inngest", category: "queue", purpose: "Background tasks", responsibilities: ["Execute async tasks"] },
];

export const INTEGRATION_PRIORITY_FRAMEWORK: Array<{ priority: IntegrationPriority; label: string; description: string }> = [
  { priority: 1, label: "Existing Theta capability", description: "Use existing platform features first" },
  { priority: 2, label: "Existing integrated service", description: "Use services already integrated" },
  { priority: 3, label: "External API", description: "Integrate with external APIs" },
  { priority: 4, label: "Custom implementation", description: "Build custom only as last resort" },
];

export const INFRASTRUCTURE_DISCIPLINE_RULES: string[] = [
  "Every new dependency must have a clear purpose",
  "Every dependency must have a defined owner",
  "Dependencies must be documented in the service registry",
];

export const INTEGRATION_EVALUATION_QUESTIONS = [
  "Is this capability already provided by an existing service in the registry?",
  "Does this integration introduce a new dependency that must be owned and maintained?",
  "What is the fallback strategy if this service becomes unavailable?",
  "Does this integration comply with data protection and security rules?",
  "Is the category and purpose clearly defined for audit purposes?",
];

export class IntegrationRulesEngine {
  public static getApprovedInfrastructure(): ServiceDefinition[] {
    return SERVICE_REGISTRY;
  }

  public static evaluateIntegration(serviceName: string, category: ServiceCategory, purpose: string): { approved: boolean; reason: string; priority: IntegrationPriority } {
    const existing = SERVICE_REGISTRY.find(s => s.category === category && s.name.toLowerCase() === serviceName.toLowerCase());
    if (existing) return { approved: false, reason: `Service "${serviceName}" already exists in "${category}".`, priority: 1 };
    return { approved: true, reason: `Service "${serviceName}" approved for "${category}".`, priority: 3 };
  }
}
