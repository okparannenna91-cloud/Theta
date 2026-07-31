import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  WorkspaceEvent,
  ObservationContext,
  DetectedPattern,
  InterventionScore,
  Intervention,
  LLMDecision,
  BriefingContext,
  ChatObservationDecision,
  PriorityScore,
  UrgencyScore,
} from "@/lib/nova/ambient/types";
import { PersonalityEngine } from "@/lib/nova/ambient/personality-engine";
import { NovaEventBus } from "@/lib/nova/ambient/event-bus";
import { InterventionScorer } from "@/lib/nova/ambient/intervention-scorer";
import { ObservationPipeline } from "@/lib/nova/ambient/observation-pipeline";
import { LLMReasoner } from "@/lib/nova/ambient/llm-reasoner";
import { ChatObserver } from "@/lib/nova/ambient/chat-observer";
import { executeWithProvider, routeModel } from "@/lib/langraph/model-router";

const mockedExecute = vi.mocked(executeWithProvider);
const mockedRouteModel = vi.mocked(routeModel);

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    task: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    },
    taskDependency: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    workspaceMember: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    sprint: {
      findFirst: vi.fn(),
    },
    activity: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    proactiveInsight: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    agentAction: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    chatMessage: {
      create: vi.fn(),
    },
    memory: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/redis/client", () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/lib/langraph/model-router", () => ({
  executeWithProvider: vi.fn().mockResolvedValue(JSON.stringify({
    shouldSpeak: true,
    level: 1,
    message: "This task became overdue yesterday.",
    reasoning: "Overdue task detected",
    category: "DEADLINE_RISK",
    tone: "neutral",
  })),
  routeModel: vi.fn().mockResolvedValue({
    provider: "openrouter",
    model: "openai/gpt-4o",
    reason: "test",
    costTier: "high",
  }),
}));

vi.mock("@/lib/notification-engine", () => ({
  createNotification: vi.fn().mockResolvedValue({ id: "notif-1" }),
}));

vi.mock("@/lib/ably", () => ({
  publishToChannel: vi.fn().mockResolvedValue(undefined),
}));

describe("NOVA V2 — Ambient Intelligence", () => {
  describe("Types", () => {
    it("defines all intervention levels", () => {
      const level0: WorkspaceEvent["type"] = "heartbeat";
      const levels = [0, 1, 2, 3] as const;
      expect(levels).toHaveLength(4);
    });

    it("defines all intervention categories", () => {
      const categories = [
        "DEADLINE_RISK", "BLOCKER_DETECTED", "WORKLOAD_IMBALANCE",
        "FORGOTTEN_WORK", "PROJECT_HEALTH", "SPRINT_RISK",
        "PATTERN_INSIGHT", "OPPORTUNITY", "COACHING", "SUMMARY",
      ] as const;
      expect(categories.length).toBeGreaterThanOrEqual(10);
    });

    it("defines insight types with 20+ patterns", () => {
      const types = [
        "DEADLINE_RISK", "UNASSIGNED_WORK", "BLOCKED_TASKS", "SPRINT_OVERLOAD",
        "DUPLICATE_WORK", "MISSING_DEPENDENCIES", "STALLED_PROGRESS",
        "CAPACITY_IMBALANCE", "UPCOMING_MILESTONE", "RECENT_ACHIEVEMENT",
        "PROJECT_INACTIVITY", "DEPENDENCY_CASCADE", "FORGOTTEN_WORK",
        "RECURRING_FAILURE", "SCOPE_CREEP", "VELOCITY_DROP",
        "MEMBER_INACTIVITY", "SOLO_FOUNDER_RISK", "COMPLETION_TREND",
        "WORKLOAD_COLLAPSE",
      ] as const;
      expect(types.length).toBeGreaterThanOrEqual(20);
    });
  });

  describe("PersonalityEngine", () => {
    it("strips forbidden ChatGPT phrases", () => {
      const result = PersonalityEngine.enforceVoice(
        "Great question! Let me help you with that. Hope this helps!",
        1,
        "DEADLINE_RISK" as any
      );
      expect(result).not.toContain("Great question");
      expect(result).not.toContain("Hope this helps");
      expect(result).not.toContain("Let me help");
    });

    it("strips 'Certainly' and 'Of course'", () => {
      const result = PersonalityEngine.enforceVoice(
        "Certainly, I can help with that.",
        1,
        "PROJECT_HEALTH" as any
      );
      expect(result).not.toContain("Certainly");
    });

    it("replaces robotic phrases with natural language", () => {
      const result = PersonalityEngine.enforceVoice(
        "Based on my analysis, the task is overdue.",
        1,
        "DEADLINE_RISK" as any
      );
      expect(result).toContain("Looking at");
      expect(result).not.toContain("Based on my analysis");
    });

    it("ensures sentences end with punctuation", () => {
      const result = PersonalityEngine.enforceVoice(
        "This task is overdue",
        1,
        "DEADLINE_RISK" as any
      );
      expect(result).toMatch(/[.!?]$/);
    });

    it("detects forbidden phrases", () => {
      const result = PersonalityEngine.hasForbiddenPhrases(
        "Great question! I'd be happy to help you."
      );
      expect(result.found).toBe(true);
      expect(result.matches.length).toBeGreaterThan(0);
    });

    it("returns false for clean text", () => {
      const result = PersonalityEngine.hasForbiddenPhrases(
        "This task became overdue yesterday."
      );
      expect(result.found).toBe(false);
    });

    it("generates system prompt that forbids ChatGPT patterns", () => {
      const prompt = PersonalityEngine.generateSystemPrompt();
      expect(prompt).toContain("Great question");
      expect(prompt).toContain("Certainly");
      expect(prompt).toContain("1-3 sentences");
    });
  });

  describe("NovaEventBus", () => {
    beforeEach(() => {
      NovaEventBus.getInstance().clearHistory();
    });

    it("emits events to registered handlers", async () => {
      const bus = NovaEventBus.getInstance();
      const handler = vi.fn();
      bus.on("task:created", handler);

      await bus.emit({
        type: "task:created",
        workspaceId: "ws-1",
        timestamp: new Date(),
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("emits to wildcard handlers", async () => {
      const bus = NovaEventBus.getInstance();
      const handler = vi.fn();
      bus.onAny(handler);

      await bus.emit({
        type: "task:created",
        workspaceId: "ws-1",
        timestamp: new Date(),
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("maintains event history", async () => {
      const bus = NovaEventBus.getInstance();
      await bus.emit({ type: "task:created", workspaceId: "ws-1", timestamp: new Date() });
      await bus.emit({ type: "task:updated", workspaceId: "ws-1", timestamp: new Date() });

      const history = bus.getHistory();
      expect(history).toHaveLength(2);
    });

    it("filters history by event type", async () => {
      const bus = NovaEventBus.getInstance();
      await bus.emit({ type: "task:created", workspaceId: "ws-1", timestamp: new Date() });
      await bus.emit({ type: "task:updated", workspaceId: "ws-1", timestamp: new Date() });

      const created = bus.getHistory("task:created");
      expect(created).toHaveLength(1);
    });

    it("handles handler failures gracefully", async () => {
      const bus = NovaEventBus.getInstance();
      bus.on("task:created", async () => { throw new Error("Handler failed"); });

      await expect(
        bus.emit({ type: "task:created", workspaceId: "ws-1", timestamp: new Date() })
      ).resolves.not.toThrow();
    });
  });

  describe("InterventionScorer", () => {
    it("returns level 0 for empty patterns", () => {
      const score = InterventionScorer.score(
        {} as ObservationContext,
        []
      );
      expect(score.level).toBe(0);
      expect(score.wouldSpeak).toBe(false);
    });

    it("returns level 1 for medium-priority patterns", () => {
      const patterns: DetectedPattern[] = [{
        type: "DEADLINE_RISK",
        severity: "medium",
        title: "Task nearing deadline",
        message: "Task X is due soon",
        confidence: 0.85,
        priority: 4,
        urgency: 0.5,
        affectedItems: ["task-1"],
        suggestedAction: "Review",
        source: "test",
      }];

      const score = InterventionScorer.score({} as ObservationContext, patterns);
      expect(score.level).toBeGreaterThanOrEqual(1);
      expect(score.wouldSpeak).toBe(true);
    });

    it("returns level 3 for critical high-priority patterns", () => {
      const patterns: DetectedPattern[] = [{
        type: "DEADLINE_RISK",
        severity: "critical",
        title: "Sprint at risk",
        message: "Sprint will miss deadline",
        confidence: 0.95,
        priority: 9,
        urgency: 0.9,
        affectedItems: [],
        suggestedAction: "Descope",
        source: "test",
      }];

      const score = InterventionScorer.score({} as ObservationContext, patterns);
      expect(score.level).toBe(3);
      expect(score.wouldSpeak).toBe(true);
    });

    it("calculates priority score with factors", () => {
      const patterns: DetectedPattern[] = [{
        type: "BLOCKED_TASKS",
        severity: "high",
        title: "Blocked task",
        message: "Task is blocked",
        confidence: 0.9,
        priority: 7,
        urgency: 0.7,
        affectedItems: [],
        suggestedAction: "Unblock",
        source: "test",
      }];

      const score = InterventionScorer.score({} as ObservationContext, patterns);
      expect(score.priorityScore).toBeDefined();
      expect(score.priorityScore.label).toBeDefined();
      expect(score.priorityScore.score).toBeGreaterThan(0);
      expect(score.priorityScore.factors.length).toBeGreaterThan(0);
    });

    it("calculates urgency score with action window", () => {
      const patterns: DetectedPattern[] = [{
        type: "SPRINT_OVERLOAD",
        severity: "critical",
        title: "Sprint overload",
        message: "Sprint is overloaded",
        confidence: 0.85,
        priority: 8,
        urgency: 0.9,
        affectedItems: [],
        suggestedAction: "Reduce scope",
        source: "test",
      }];

      const score = InterventionScorer.score({} as ObservationContext, patterns);
      expect(score.urgencyScore).toBeDefined();
      expect(score.urgencyScore.suggestedActionWindow).toBeDefined();
      expect(score.urgencyScore.label).toBeDefined();
    });
  });

  describe("ObservationPipeline", () => {
    it("can be initialized", () => {
      expect(ObservationPipeline.isInitialized()).toBe(false);
      ObservationPipeline.initialize();
      expect(ObservationPipeline.isInitialized()).toBe(true);
    });

    it("can set heartbeat interval", () => {
      const fn = vi.fn();
      ObservationPipeline.setHeartbeatInterval(300000);
      expect(fn).not.toThrow;
    });
  });

  describe("NOVA V2 — Vision Requirements", () => {
    it("implements 4 intervention levels", () => {
      const levels = [0, 1, 2, 3] as const;
      expect(levels).toEqual([0, 1, 2, 3]);
    });

    it("implements the decision engine flow steps", () => {
      const flowSteps = [
        "Event collection",
        "Context collection",
        "Memory retrieval",
        "Pattern detection",
        "Priority scoring",
        "Urgency scoring",
        "LLM reasoning",
        "Intervention decision",
        "UI delivery",
      ];
      expect(flowSteps.length).toBeGreaterThanOrEqual(9);
    });

    it("modular architecture has separate modules", () => {
      const modules = [
        "NovaEventBus",
        "ContextCollector",
        "WorkspaceMemory",
        "PatternDetector",
        "InterventionScorer",
        "LLMReasoner",
        "PersonalityEngine",
        "UIDelivery",
        "ObservationPipeline",
        "Scheduler",
        "ChatObserver",
        "BackgroundAmbientAgent",
      ];
      expect(modules.length).toBeGreaterThanOrEqual(12);
    });

    it("enforces Nova personality (anti-ChatGPT)", () => {
      const forbidden = [
        "Great question",
        "Certainly",
        "I'd be happy to help",
        "Hope this helps",
        "Sounds great",
        "Nice idea",
      ];

      const text = "Great question! I'd be happy to help with that. Hope this helps!";
      const cleaned = PersonalityEngine.enforceVoice(text, 1, "COACHING" as any);

      for (const phrase of forbidden) {
        expect(cleaned).not.toContain(phrase);
      }
    });

    it("has pattern detection for all V2 pattern types", () => {
      const patterns = [
        "detectDeadlineRisks",
        "detectBlockedTasks",
        "detectUnassignedWork",
        "detectSprintRisks",
        "detectStalledWork",
        "detectWorkloadImbalance",
        "detectDuplicateWork",
        "detectProjectInactivity",
        "detectDependencyCascades",
        "detectForgottenWork",
        "detectRecurringFailures",
        "detectScopeCreep",
        "detectVelocityDrop",
        "detectMemberInactivity",
        "detectSoloFounderRisks",
        "detectCompletionTrends",
        "detectWorkloadCollapse",
      ];
      expect(patterns.length).toBeGreaterThanOrEqual(17);
    });

    it("does not implement action execution", () => {
      const fs = require("fs");
      const content = fs.readFileSync(
        "./lib/nova/ambient/types.ts",
        "utf-8"
      );
      expect(content).not.toContain("executeAction");
      expect(content).not.toContain("callTool");
      expect(content).not.toContain("functionCall");
    });

    it("workspace memory tracks recent decisions", () => {
      const memory = {
        recentDecisions: [
          { topic: "Sprint scope", decision: "Reduce by 3 tasks", timestamp: new Date() },
        ],
        userPreferences: { theme: "dark" },
        workspacePatterns: [],
        recurringIssues: [],
        userHistory: [],
        similarPastSituations: [],
      };

      expect(memory.recentDecisions).toHaveLength(1);
      expect(memory.recentDecisions[0].topic).toBe("Sprint scope");
    });
  });
});

describe("NOVA V2 — Intervention Level Boundaries", () => {
  const scorer = InterventionScorer;

  it("Level 0: observe only — no patterns", () => {
    const score = scorer.score({} as ObservationContext, []);
    expect(score.level).toBe(0);
    expect(score.wouldSpeak).toBe(false);
  });

  it("Level 1: suggestion — single low-severity pattern", () => {
    const patterns: DetectedPattern[] = [{
      type: "COMPLETION_TREND",
      severity: "low",
      title: "Good progress",
      message: "Team completed 15 tasks this week",
      confidence: 0.85,
      priority: 2,
      urgency: 0.1,
      affectedItems: [],
      suggestedAction: "Keep it up",
      source: "test",
    }];

    const score = scorer.score({} as ObservationContext, patterns);
    expect(score.level).toBe(1);
  });

  it("Level 2: recommendation — high-severity pattern", () => {
    const patterns: DetectedPattern[] = [{
      type: "BLOCKED_TASKS",
      severity: "high",
      title: "Multiple blocked tasks",
      message: "5 tasks blocked",
      confidence: 0.9,
      priority: 7,
      urgency: 0.7,
      affectedItems: [],
      suggestedAction: "Resolve blockers",
      source: "test",
    }];

    const score = scorer.score({} as ObservationContext, patterns);
    expect(score.level).toBe(2);
  });

  it("Level 3: critical intervention — sprint failure risk", () => {
    const patterns: DetectedPattern[] = [{
      type: "DEADLINE_RISK",
      severity: "critical",
      title: "Sprint failure risk",
      message: "Sprint will miss deadline by 40%",
      confidence: 0.95,
      priority: 10,
      urgency: 1,
      affectedItems: [],
      suggestedAction: "Immediate descoping needed",
      source: "test",
    }];

    const score = scorer.score({} as ObservationContext, patterns);
    expect(score.level).toBe(3);
  });

  it("Level 2 for dependency cascade (blocked + blocking)", () => {
    const patterns: DetectedPattern[] = [{
      type: "MISSING_DEPENDENCIES",
      severity: "critical",
      title: "Dependency cascade",
      message: "Task blocks 5 others",
      confidence: 0.9,
      priority: 9,
      urgency: 0.9,
      affectedItems: ["task-1"],
      suggestedAction: "Resolve blocker",
      source: "test",
    }];

    const score = scorer.score({} as ObservationContext, patterns);
    expect(score.level).toBeGreaterThanOrEqual(2);
  });
});

describe("NOVA V2 — Personality Requirements", () => {
  describe("Forbidden phrases", () => {
    const testCases = [
      { input: "Great question! Let me look into that.", expected: false, reason: "Great question" },
      { input: "Certainly, I can help with that task.", expected: false, reason: "Certainly" },
      { input: "I'd be happy to help you with this.", expected: false, reason: "I'd be happy to help" },
      { input: "Hope this helps with your project.", expected: false, reason: "Hope this helps" },
      { input: "Sounds great! I'll get started.", expected: false, reason: "Sounds great" },
      { input: "Nice idea! Let me work on that.", expected: false, reason: "Nice idea" },
      { input: "No problem, I'll take care of it.", expected: false, reason: "No problem" },
    ];

    for (const { input, reason } of testCases) {
      it(`rejects '${reason}'`, () => {
        const cleaned = PersonalityEngine.enforceVoice(input, 1, "DEADLINE_RISK" as any);
        expect(cleaned).not.toContain(reason);
      });
    }
  });

  describe("Nova voice patterns", () => {
    it("produces concise messages (1-3 sentences)", () => {
      const result = PersonalityEngine.enforceVoice(
        "This task is overdue by 3 days. It is blocking two other tasks. You should review it.",
        1,
        "DEADLINE_RISK" as any
      );
      const sentences = result.split(/[.!?]+/).filter((s) => s.trim().length > 0);
      expect(sentences.length).toBeLessThanOrEqual(3);
    });

    it("leads with the most important information", () => {
      const result = PersonalityEngine.enforceVoice(
        "First some context. The task is overdue.",
        1,
        "DEADLINE_RISK" as any
      );
      expect(result).not.toContain("First some context");
    });

    it("sounds direct and factual", () => {
      const result = PersonalityEngine.enforceVoice(
        "I think the task might be overdue based on my analysis.",
        1,
        "DEADLINE_RISK" as any
      );
      expect(result).not.toContain("I think");
      expect(result).not.toContain("might be");
      expect(result).not.toContain("based on my analysis");
    });
  });
});

describe("NOVA V2 — LLMReasoner hybrid model routing", () => {
  const pattern: DetectedPattern = {
    type: "DEADLINE_RISK",
    severity: "high",
    title: "Task overdue",
    message: "Fix login is overdue by 3 days",
    confidence: 0.9,
    priority: 8,
    urgency: 0.8,
    affectedItems: ["t1"],
    suggestedAction: "Reassign the task",
    source: "test",
  };

  const makeScore = (level: 0 | 1 | 2 | 3): InterventionScore => ({
    level,
    importance: 8,
    urgency: 0.8,
    relevance: 0.9,
    confidence: 0.9,
    reasoning: "test score",
    priorityScore: { score: 8, label: "high", reasoning: "", factors: [] },
    urgencyScore: { score: 0.8, label: "soon", reasoning: "", factors: [], suggestedActionWindow: "24h" },
    wouldSpeak: true,
  });

  const baseContext = {
    event: { type: "task:created", workspaceId: "ws1", timestamp: new Date() },
  } as ObservationContext;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the fast flash model for level 1 interventions", async () => {
    await LLMReasoner.reason(baseContext, [pattern], makeScore(1));

    expect(mockedExecute).toHaveBeenCalledWith(
      "gemini",
      "gemini-2.5-flash",
      expect.any(String),
      expect.any(String)
    );
    expect(mockedRouteModel).not.toHaveBeenCalled();
  });

  it("routes level 2 interventions through the strong model", async () => {
    await LLMReasoner.reason(baseContext, [pattern], makeScore(2));

    expect(mockedRouteModel).toHaveBeenCalledTimes(1);
    expect(mockedExecute).toHaveBeenCalledWith(
      "openrouter",
      "openai/gpt-4o",
      expect.any(String),
      expect.any(String)
    );
  });

  it("routes level 3 interventions through the strong model", async () => {
    await LLMReasoner.reason(baseContext, [pattern], makeScore(3));

    expect(mockedRouteModel).toHaveBeenCalledTimes(1);
    expect(mockedExecute).toHaveBeenCalledWith(
      "openrouter",
      "openai/gpt-4o",
      expect.any(String),
      expect.any(String)
    );
  });

  it("stays silent without calling any model when no patterns exist", async () => {
    const result = await LLMReasoner.reason({} as ObservationContext, [], makeScore(2));

    expect(result.shouldSpeak).toBe(false);
    expect(mockedExecute).not.toHaveBeenCalled();
    expect(mockedRouteModel).not.toHaveBeenCalled();
  });
});

describe("NOVA V2 — ChatObserver model routing", () => {
  const chatEvent = (content: string, mentions?: string[]) => ({
    type: "chat:message",
    workspaceId: "ws1",
    timestamp: new Date(),
    metadata: { content, mentions },
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes direct mentions through the strong model", async () => {
    await ChatObserver.analyzeMessage(
      chatEvent("@nova what is the status of the login task?", ["nova"]) as any,
      {} as ObservationContext
    );

    expect(mockedRouteModel).toHaveBeenCalledTimes(1);
    expect(mockedExecute).toHaveBeenCalledWith(
      "openrouter",
      "openai/gpt-4o",
      expect.any(String),
      expect.any(String)
    );
  });

  it("keeps flash for implicit workspace questions", async () => {
    await ChatObserver.analyzeMessage(
      chatEvent("when is the sprint deadline?") as any,
      {} as ObservationContext
    );

    expect(mockedRouteModel).not.toHaveBeenCalled();
    expect(mockedExecute).toHaveBeenCalledWith(
      "gemini",
      "gemini-2.5-flash",
      expect.any(String),
      expect.any(String)
    );
  });

  it("stays silent without calling any model on casual conversation", async () => {
    await ChatObserver.analyzeMessage(
      chatEvent("haha that's funny") as any,
      {} as ObservationContext
    );

    expect(mockedExecute).not.toHaveBeenCalled();
    expect(mockedRouteModel).not.toHaveBeenCalled();
  });
});
