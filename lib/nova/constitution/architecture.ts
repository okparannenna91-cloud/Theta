export type ServiceCategory = "database" | "auth" | "realtime" | "memory" | "cache" | "ai" | "storage" | "email" | "payments" | "queue";

export interface ServiceDefinition {
  name: string;
  provider: string;
  category: ServiceCategory;
  purpose: string;
  responsibilities: string[];
  fallback?: string;
}

export const SERVICE_REGISTRY: ServiceDefinition[] = [
  {
    name: "Primary Database",
    provider: "MongoDB Atlas",
    category: "database",
    purpose: "Workspace data, Projects, Tasks, Documents, User metadata, Search indexing, Vector search",
    responsibilities: [
      "Persist all workspace entities",
      "Support text search queries",
      "Support vector search for semantic features",
      "Multi-shard data isolation per workspace",
    ],
  },
  {
    name: "Authentication",
    provider: "Clerk",
    category: "auth",
    purpose: "Authentication, User management, Organizations, Session handling",
    responsibilities: [
      "Handle user login and registration",
      "Manage session tokens",
      "Provide organization/workspace membership",
      "Never manage authentication directly in Nova",
    ],
  },
  {
    name: "Realtime Infrastructure",
    provider: "Ably",
    category: "realtime",
    purpose: "Live updates, Presence, Notifications, Collaboration events",
    responsibilities: [
      "Broadcast UI actions to clients",
      "Notify workspace members of changes",
      "Support presence detection",
    ],
  },
  {
    name: "Long-Term Memory",
    provider: "Mem0",
    category: "memory",
    purpose: "Long-term memory, User preferences, Behavioral adaptation",
    responsibilities: [
      "Store user preferences across sessions",
      "Learn behavioral patterns",
      "Sync with Prisma persistent storage",
    ],
  },
  {
    name: "Fast Context Storage",
    provider: "Upstash Redis",
    category: "cache",
    purpose: "Session memory, Context caching, Temporary state, Rate limiting",
    responsibilities: [
      "Cache short-term conversation history",
      "Temporarily store context for active sessions",
      "Enforce rate limits",
    ],
  },
  {
    name: "AI Router",
    provider: "OpenRouter",
    category: "ai",
    purpose: "Primary routing layer: Model selection, Cost optimization, Model switching",
    responsibilities: [
      "Route AI requests to optimal model",
      "Handle model fallbacks",
      "Abstract model selection from features",
    ],
  },
  {
    name: "AI Fallback 1",
    provider: "Gemini",
    category: "ai",
    purpose: "Fallback execution, Text generation, Workspace intelligence, Summarization",
    responsibilities: [
      "Handle requests when OpenRouter is unavailable",
      "Generate text and summaries",
    ],
  },
  {
    name: "AI Fallback 2",
    provider: "Cohere",
    category: "ai",
    purpose: "Workspace intelligence, Text generation, Third layer fallback",
    responsibilities: [
      "Handle requests when Gemini is unavailable",
      "Generate text and summaries",
    ],
  },
  {
    name: "AI Fallback 3",
    provider: "OpenAI",
    category: "ai",
    purpose: "Critical workflows, High-value tasks, Last resort fallback",
    responsibilities: [
      "Serve as last resort reliability backup",
      "Handle critical operations",
    ],
  },
  {
    name: "Storage Layer",
    provider: "Cloudinary",
    category: "storage",
    purpose: "Media uploads, Images, Documents, Asset optimization",
    responsibilities: [
      "Store and serve uploaded files",
      "Optimize images and assets",
      "Generate secure upload signatures",
    ],
  },
  {
    name: "Email Layer",
    provider: "Resend",
    category: "email",
    purpose: "Notifications, Invites, Reports, Transactional emails",
    responsibilities: [
      "Send transactional emails",
      "Deliver reports via email",
      "Send workspace invitations",
    ],
  },
  {
    name: "Payment Processor 1",
    provider: "Paystack",
    category: "payments",
    purpose: "NGN subscription billing, Payment collection",
    responsibilities: [
      "Process NGN payments",
      "Manage subscription billing in Nigeria",
    ],
  },
  {
    name: "Payment Processor 2",
    provider: "Ivno",
    category: "payments",
    purpose: "USD/crypto subscription billing, Additional payment infrastructure",
    responsibilities: [
      "Process USD and crypto payments",
      "Supplement Paystack coverage",
    ],
  },
  {
    name: "Background Jobs",
    provider: "Inngest",
    category: "queue",
    purpose: "Background task execution, Scheduled jobs, Workflow automation",
    responsibilities: [
      "Execute async tasks in background",
      "Handle scheduled report generation",
      "Process automation workflows",
    ],
  },
];

export const ARCHITECTURAL_RULES: string[] = [
  "Integrate before building — prefer existing services over custom implementations",
  "Keep Nova modular — each intelligence module has a single responsibility",
  "Avoid duplicate infrastructure — do not add services that overlap with existing ones",
  "Every service must have a clear responsibility",
  "No service should exist without a defined purpose",
];

export function getServiceByCategory(category: ServiceCategory): ServiceDefinition[] {
  return SERVICE_REGISTRY.filter(s => s.category === category);
}

export function getServiceByName(name: string): ServiceDefinition | undefined {
  return SERVICE_REGISTRY.find(s => s.name === name);
}
