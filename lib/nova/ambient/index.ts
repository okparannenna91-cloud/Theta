export { NovaEventBus } from "./event-bus";
export { ContextCollector } from "./context-collector";
export { PatternDetector } from "./pattern-detection";
export { InterventionScorer } from "./intervention-scorer";
export { LLMReasoner } from "./llm-reasoner";
export { UIDelivery } from "./ui-delivery";
export { ObservationPipeline } from "./observation-pipeline";
export { WorkspaceMemory } from "./workspace-memory";
export { PersonalityEngine } from "./personality-engine";
export { Scheduler } from "./scheduler";
export { ChatObserver } from "./chat-observer";
export { BackgroundAmbientAgent } from "./background-agent";

export type {
  WorkspaceEvent,
  ObservationContext,
  DetectedPattern,
  InterventionScore,
  Intervention,
  LLMDecision,
  InterventionLevel,
  InterventionCategory,
  EventHandler,
  PriorityScore,
  UrgencyScore,
  BriefingContext,
  BriefingMetric,
  ChatObservationDecision,
  InsightType,
  InsightSeverity,
  EventType,
} from "./types";

import { ObservationPipeline } from "./observation-pipeline";
import { BackgroundAmbientAgent } from "./background-agent";

export function initializeAmbientNova(options?: { autoStartBackgroundAgent?: boolean }): void {
  ObservationPipeline.initialize();

  if (options?.autoStartBackgroundAgent !== false) {
    BackgroundAmbientAgent.start();
  }
}
