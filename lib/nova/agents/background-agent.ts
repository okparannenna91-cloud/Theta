import { inngest } from "@/lib/inngest/client";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { ObservationPipeline } from "@/lib/nova/ambient/observation-pipeline";
import { Scheduler } from "@/lib/nova/ambient/scheduler";
import { BackgroundAmbientAgent } from "@/lib/nova/ambient/background-agent";

// ──────────────────────────────────────────────
//  BACKGROUND AGENT — Nova V2 Ambient AI Teammate
//  Runs every 30 minutes via cron and keeps the
//  ambient observation pipeline active.
// ──────────────────────────────────────────────

export const backgroundAgentCron = inngest.createFunction(
  { id: "nova-background-agent", triggers: [{ cron: "TZ(UTC) */30 * * * *" }] },
  async ({ step }) => {
    logger.info("[Agent:Background] Starting ambient scan");

    const workspaces = await step.run("fetch-workspaces", async () => {
      return prisma.workspace.findMany({
        where: { billingStatus: { not: "canceled" } },
        select: { id: true },
        take: 100,
      });
    });

    let scanned = 0;

    for (const workspace of workspaces) {
      try {
        await step.run(`scan-${workspace.id}`, async () => {
          await ObservationPipeline.processEvent({
            type: "heartbeat",
            workspaceId: workspace.id,
            timestamp: new Date(),
            metadata: { scanType: "cron" },
          });
          scanned++;
        });
      } catch (error) {
        logger.warn(`[Agent:Background] Scan failed for ${workspace.id}:`, error);
      }
    }

    return { workspacesScanned: scanned, interventionsGenerated: 0 };
  }
);

// ──────────────────────────────────────────────
//  MORNING BRIEFING — daily at 7:00 AM UTC
// ──────────────────────────────────────────────

export const morningBriefingCron = inngest.createFunction(
  { id: "nova-morning-briefing", triggers: [{ cron: "TZ(UTC) 0 7 * * *" }] },
  async ({ step }) => {
    logger.info("[Agent:Morning] Generating morning briefings");

    const workspaces = await step.run("fetch-workspaces", async () => {
      return prisma.workspace.findMany({
        where: { billingStatus: { not: "canceled" } },
        select: { id: true },
        take: 100,
      });
    });

    let generated = 0;
    for (const workspace of workspaces) {
      try {
        await step.run(`briefing-${workspace.id}`, async () => {
          if (await Scheduler.shouldGenerateBriefing(workspace.id, "morning")) {
            await Scheduler.generateMorningBriefing(workspace.id);
            generated++;
          }
        });
      } catch {
      }
    }

    return { briefingsGenerated: generated };
  }
);

// ──────────────────────────────────────────────
//  END-OF-DAY SUMMARY — daily at 18:00 UTC
// ──────────────────────────────────────────────

export const eveningSummaryCron = inngest.createFunction(
  { id: "nova-evening-summary", triggers: [{ cron: "TZ(UTC) 0 18 * * *" }] },
  async ({ step }) => {
    logger.info("[Agent:Evening] Generating end-of-day summaries");

    const workspaces = await step.run("fetch-workspaces", async () => {
      return prisma.workspace.findMany({
        where: { billingStatus: { not: "canceled" } },
        select: { id: true },
        take: 100,
      });
    });

    let generated = 0;
    for (const workspace of workspaces) {
      try {
        await step.run(`summary-${workspace.id}`, async () => {
          if (await Scheduler.shouldGenerateBriefing(workspace.id, "evening")) {
            await Scheduler.generateEndOfDaySummary(workspace.id);
            generated++;
          }
        });
      } catch {
      }
    }

    return { summariesGenerated: generated };
  }
);

// ──────────────────────────────────────────────
//  EVENT-TRIGGERED AGENT — responds to workspace events
//  Routes events into the ambient observation pipeline.
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
    const { eventType, workspaceId, taskId, projectId, userId, metadata } = event.data;

    logger.info(`[Agent:Event] Processing event=${eventType} workspace=${workspaceId}`);

    await step.run("process-through-pipeline", async () => {
      await ObservationPipeline.processEvent({
        type: (eventType as any) || "task:updated",
        workspaceId,
        taskId,
        projectId,
        userId,
        timestamp: new Date(),
        metadata,
      });
    });

    return { processed: true, eventType, workspaceId };
  }
);

// ──────────────────────────────────────────────
//  STARTUP — keep the ambient agent alive
// ──────────────────────────────────────────────

export function ensureAmbientAgentRunning(): void {
  BackgroundAmbientAgent.start();
}
