import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis/client";
import { createNotification } from "@/lib/notification-engine";
import { ProactiveIntelligenceEngine, type InsightSummary } from "@/lib/nova/proactive-intelligence";
import { logger } from "@/lib/logger";

const CACHE_TTL_SECONDS = 1800;

export const proactiveMonitor = inngest.createFunction(
  { id: "nova-proactive-monitor", triggers: [{ cron: "TZ(UTC) */30 * * * *" }] },
  async ({ step }) => {
    logger.info("[ProactiveMonitor] Cron started");

    const workspaces = await step.run("fetch-active-workspaces", async () => {
      return prisma.workspace.findMany({
        where: { billingStatus: { not: "canceled" } },
        select: { id: true, name: true },
        take: 100,
      });
    });

    let totalInsights = 0;
    let totalNotifications = 0;

    for (const workspace of workspaces) {
      try {
        const summary = await step.run(`analyze-${workspace.id}`, async () => {
          return ProactiveIntelligenceEngine.analyzeWorkspace(workspace.id);
        }) as unknown as InsightSummary;

        if (summary.totalInsights === 0) continue;

        await step.run(`cache-insights-${workspace.id}`, async () => {
          const cacheKey = `nova:insights:${workspace.id}`;
          await redis.set(cacheKey, JSON.stringify(summary), { ex: CACHE_TTL_SECONDS });
        });

        await step.run(`store-insights-${workspace.id}`, async () => {
          for (const insight of summary.insights) {
            await prisma.proactiveInsight.upsert({
              where: { id: insight.id },
              create: {
                id: insight.id,
                workspaceId: workspace.id,
                type: insight.type,
                severity: insight.severity,
                title: insight.title,
                message: insight.message,
                affectedItems: insight.affectedItems,
                suggestedAction: insight.suggestedAction,
              },
              update: {
                severity: insight.severity,
                message: insight.message,
                affectedItems: insight.affectedItems,
                suggestedAction: insight.suggestedAction,
              },
            });
          }
          totalInsights += summary.totalInsights;
        });

        await step.run(`notify-${workspace.id}`, async () => {
          const workspaceWithMembers = await prisma.workspace.findUnique({
            where: { id: workspace.id },
            select: {
              members: {
                select: { userId: true },
                take: 10,
              },
            },
          });

          const members = workspaceWithMembers?.members || [];
          const urgentInsights = summary.insights.filter(
            (i) => i.severity === "critical" || i.severity === "high"
          );

          for (const insight of urgentInsights) {
            for (const member of members) {
              const groupKey = `proactive-${insight.type}-${workspace.id}`;
              await createNotification(
                member.userId,
                workspace.id,
                "smart_alert",
                `${insight.severity === "critical" ? "Urgent: " : ""}${insight.title}`,
                insight.message,
                {
                  deepLink: `/nova?insight=${insight.id}`,
                  actions: [
                    { label: "View Insight", href: `/nova?insight=${insight.id}`, variant: "primary" },
                    { label: "Dismiss", href: `/api/nova/insights/${insight.id}/dismiss`, variant: "secondary" },
                  ],
                },
                groupKey
              );
              totalNotifications++;
            }
          }
        });

        if (summary.criticalCount > 0) {
          await step.run(`llm-summary-${workspace.id}`, async () => {
            const llmSummary = await ProactiveIntelligenceEngine.analyzeWithLLM(workspace.id, summary);
            logger.info("[ProactiveMonitor] LLM summary generated", {
              workspaceId: workspace.id,
              criticalCount: summary.criticalCount,
              summaryLength: llmSummary.length,
            });
          });
        }
      } catch (error) {
        logger.warn(`[ProactiveMonitor] Failed for workspace ${workspace.id}:`, error);
      }
    }

    logger.info("[ProactiveMonitor] Completed", {
      workspaces: workspaces.length,
      totalInsights,
      totalNotifications,
    });

    // Memory pruning — consolidate duplicate memories periodically
    try {
      const { MemorySystem } = await import("@/lib/nova/memory-system");
      const users = await prisma.user.findMany({ select: { id: true }, take: 50 });
      for (const user of users) {
        for (const ws of workspaces.slice(0, 10)) {
          await MemorySystem.consolidateMemories(user.id, ws.id).catch(() => {});
        }
      }
    } catch {
      // Non-critical, ignore
    }

    return { workspaces: workspaces.length, totalInsights, totalNotifications };
  }
);
