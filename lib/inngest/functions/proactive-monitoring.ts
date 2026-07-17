import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notification-engine";
import { ProactiveIntelligenceEngine, type InsightSummary } from "@/lib/nova/proactive-intelligence";
import { logger } from "@/lib/logger";

// ──────────────────────────────────────────────
//  PROACTIVE WORKSPACE MONITORING (every 20 minutes)
// ──────────────────────────────────────────────

export const proactiveWorkspaceMonitoring = inngest.createFunction(
  { id: "nova-proactive-monitoring", triggers: [{ cron: "TZ(UTC) */20 * * * *" }] },
  async ({ step }) => {
    logger.info("[ProactiveMonitoring] Started");

    const workspaces = await prisma.workspace.findMany({
      select: { id: true, name: true },
      take: 100,
    });

    let totalInsights = 0;
    let totalNotifications = 0;

    for (const workspace of workspaces) {
      try {
        const summary = await step.run(`analyze-${workspace.id}`, async () => {
          return ProactiveIntelligenceEngine.analyzeWorkspace(workspace.id);
        }) as unknown as InsightSummary;

        if (summary.totalInsights === 0) continue;

        // Store insights in ProactiveInsight table
        await step.run(`store-insights-${workspace.id}`, async () => {
          for (const insight of summary.insights) {
            await prisma.proactiveInsight.upsert({
              where: {
                id: insight.id,
              },
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

        // Create notifications for critical and high severity insights
        await step.run(`notify-${workspace.id}`, async () => {
          // Get workspace owner as notification recipient
          const workspaceWithOwner = await prisma.workspace.findUnique({
            where: { id: workspace.id },
            select: {
              members: {
                select: { userId: true },
                take: 10,
              },
            },
          });

          const members = workspaceWithOwner?.members || [];

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

        // Use LLM to generate executive summary for critical workspaces
        if (summary.criticalCount > 0) {
          await step.run(`llm-summary-${workspace.id}`, async () => {
            const llmSummary = await ProactiveIntelligenceEngine.analyzeWithLLM(workspace.id, summary);
            logger.info("[ProactiveMonitoring] LLM summary generated", {
              workspaceId: workspace.id,
              criticalCount: summary.criticalCount,
              summaryLength: llmSummary.length,
            });
          });
        }
      } catch (error) {
        logger.warn(`[ProactiveMonitoring] Failed for workspace ${workspace.id}:`, error);
      }
    }

    logger.info("[ProactiveMonitoring] Completed", {
      workspaces: workspaces.length,
      totalInsights,
      totalNotifications,
    });

    return { workspaces: workspaces.length, totalInsights, totalNotifications };
  }
);
