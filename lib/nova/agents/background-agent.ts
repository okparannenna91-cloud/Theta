import { inngest } from "@/lib/inngest/client";
import { logger } from "@/lib/logger";

// ──────────────────────────────────────────────
//  BACKGROUND AGENT — runs every 30 minutes
//  Analyzes workspace and generates proactive insights
// ──────────────────────────────────────────────

export const backgroundAgentCron = inngest.createFunction(
  { id: "nova-background-agent", triggers: [{ cron: "TZ(UTC) */30 * * * *" }] },
  async ({ step }) => {
    logger.info("[Agent:Background] Disabled — Nova is in observation mode");
    return { insightsGenerated: 0, workspacesScanned: 0 };
  }
);

// ──────────────────────────────────────────────
//  EVENT-TRIGGERED AGENT — responds to workspace events
// ──────────────────────────────────────────────

interface AgentEvent {
  data: {
    eventType: string;
    workspaceId: string;
    taskId?: string;
    projectId?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  };
}

export const eventTriggeredAgent = inngest.createFunction(
  { id: "nova-event-agent", triggers: [{ event: "nova/agent-event" }] },
  async ({ step, event }) => {
    const { eventType, workspaceId } = event.data;
    logger.info(`[Agent:Event] Disabled — Nova is in observation mode. Event=${eventType} workspace=${workspaceId}`);
    return { processed: false, eventType, reason: "observation_mode" };
  }
);
