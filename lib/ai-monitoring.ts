import { logActivity } from "@/lib/activity";
import { logger } from "@/lib/logger";

export type StreamEventType =
  | "tool_only_completion"
  | "empty_stream"
  | "timeout"
  | "aborted_stream"
  | "openrouter_error"
  | "routing_decision";

interface StreamEventMeta {
  eventType: StreamEventType;
  promptLength: number;
  finishReason?: string;
  errorMessage?: string;
  conversationId?: string;
  toolCount?: number;
  toolList?: string;
  [key: string]: unknown;
}

export async function recordStreamEvent(
  userId: string,
  workspaceId: string,
  eventType: StreamEventType,
  metadata: Partial<StreamEventMeta> = {},
) {
  try {
    await logActivity({
      userId,
      workspaceId,
      action: "STREAM_EVENT",
      entityType: "AI_STREAM",
      entityId: metadata.conversationId || workspaceId,
      metadata: {
        eventType,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    });
  } catch (error) {
    logger.warn("[Nova-Monitoring] Failed to record stream event:", error);
  }
}
