import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ObservationPipeline } from "./observation-pipeline";
import { WorkspaceMemory } from "./workspace-memory";
import { Scheduler } from "./scheduler";

const SCAN_INTERVAL_MS = 1800000;
const BRIEFING_CHECK_INTERVAL_MS = 3600000;
const MAX_WORKSPACES_PER_SCAN = 50;

interface BackgroundAgentState {
  running: boolean;
  lastScanTime: Date | null;
  lastBriefingCheckTime: Date | null;
  workspacesScanned: number;
  interventionsGenerated: number;
}

export class BackgroundAmbientAgent {
  private static state: BackgroundAgentState = {
    running: false,
    lastScanTime: null,
    lastBriefingCheckTime: null,
    workspacesScanned: 0,
    interventionsGenerated: 0,
  };

  private static scanTimer: ReturnType<typeof setInterval> | null = null;
  private static briefingTimer: ReturnType<typeof setInterval> | null = null;

  static start(): void {
    if (this.state.running) return;
    this.state.running = true;

    this.performFullScan().catch(() => {});
    this.scanTimer = setInterval(() => this.performFullScan(), SCAN_INTERVAL_MS);

    this.checkBriefings().catch(() => {});
    this.briefingTimer = setInterval(() => this.checkBriefings(), BRIEFING_CHECK_INTERVAL_MS);

    logger.info("[BackgroundAmbientAgent] Started — scan every 30min, briefing check every 60min");
  }

  static stop(): void {
    this.state.running = false;
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
    if (this.briefingTimer) {
      clearInterval(this.briefingTimer);
      this.briefingTimer = null;
    }
    logger.info("[BackgroundAmbientAgent] Stopped");
  }

  static getState(): BackgroundAgentState {
    return { ...this.state };
  }

  static async performFullScan(): Promise<void> {
    if (!this.state.running) return;

    const start = Date.now();
    let scanned = 0;
    let interventions = 0;

    try {
      const workspaces = await prisma.workspace.findMany({
        where: { billingStatus: { not: "canceled" } },
        select: { id: true },
        take: MAX_WORKSPACES_PER_SCAN,
      });

      for (const workspace of workspaces) {
        try {
          const event = {
            type: "heartbeat" as const,
            workspaceId: workspace.id,
            timestamp: new Date(),
            metadata: { scanType: "full_scan" },
          };

          await ObservationPipeline.processEvent(event);
          scanned++;

          await WorkspaceMemory.recordPattern(
            workspace.id,
            "background_scan_completed",
            0.9
          );

          await new Promise((resolve) => setTimeout(resolve, 50));
        } catch (error) {
          logger.warn(`[BackgroundAmbientAgent] Workspace scan failed: ${workspace.id}`, error);
        }
      }

      this.state.lastScanTime = new Date();
      this.state.workspacesScanned += scanned;

      if (workspaces.length > 0) {
        logger.info("[BackgroundAmbientAgent] Full scan completed", {
          workspacesScanned: scanned,
          durationMs: Date.now() - start,
        });
      }
    } catch (error: any) {
      logger.warn("[BackgroundAmbientAgent] Full scan error:", error.message);
    }
  }

  static async checkBriefings(): Promise<void> {
    if (!this.state.running) return;

    try {
      const workspaces = await prisma.workspace.findMany({
        where: { billingStatus: { not: "canceled" } },
        select: { id: true },
        take: MAX_WORKSPACES_PER_SCAN,
      });

      const now = new Date();
      const hour = now.getHours();

      const isMorning = hour >= 6 && hour <= 9;
      const isEvening = hour >= 17 && hour <= 20;

      for (const workspace of workspaces) {
        try {
          if (isMorning) {
            if (await Scheduler.shouldGenerateBriefing(workspace.id, "morning")) {
              await Scheduler.generateMorningBriefing(workspace.id);
            }
          } else if (isEvening) {
            if (await Scheduler.shouldGenerateBriefing(workspace.id, "evening")) {
              await Scheduler.generateEndOfDaySummary(workspace.id);
            }
          }
        } catch {
        }
      }

      this.state.lastBriefingCheckTime = new Date();
    } catch (error: any) {
      logger.warn("[BackgroundAmbientAgent] Briefing check error:", error.message);
    }
  }
}
