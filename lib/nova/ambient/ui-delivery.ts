import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notification-engine";
import { publishToChannel } from "@/lib/ably";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";
import type { Intervention, BriefingContext } from "./types";

export class UIDelivery {
  static async deliver(intervention: Intervention): Promise<void> {
    if (intervention.level === 0) return;

    try {
      switch (intervention.level) {
        case 1:
          await this.deliverLevel1(intervention);
          break;
        case 2:
          await this.deliverLevel2(intervention);
          break;
        case 3:
          await this.deliverLevel3(intervention);
          break;
      }

      await this.persistIntervention(intervention);

      await this.pushRealTime(intervention);

      logger.info("[UIDelivery] Intervention delivered", {
        level: intervention.level,
        category: intervention.category,
        source: intervention.source,
        workspaceId: intervention.workspaceId,
      });
    } catch (error: any) {
      logger.warn("[UIDelivery] Delivery failed:", error.message);
    }
  }

  static async deliverBriefing(briefing: BriefingContext): Promise<void> {
    try {
      const title = briefing.type === "morning"
        ? `${briefing.date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} — Morning Briefing`
        : briefing.type === "evening"
        ? `End of Day Summary — ${briefing.date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`
        : "Weekly Workspace Summary";

      await prisma.proactiveInsight.create({
        data: {
          workspaceId: briefing.workspaceId,
          type: briefing.type === "morning" ? "UPCOMING_MILESTONE" : "RECENT_ACHIEVEMENT",
          severity: briefing.risks.length > 0 ? "high" : "low",
          title,
          message: briefing.summary,
          affectedItems: [],
          suggestedAction: briefing.suggestions.join(" | ") || "",
        },
      });

      await this.pushRealTime({
        id: crypto.randomUUID(),
        level: 2,
        category: "SUMMARY",
        title,
        message: briefing.summary,
        workspaceId: briefing.workspaceId,
        patterns: [],
        score: {
          level: 2,
          importance: 5,
          urgency: 0.3,
          relevance: 1,
          confidence: 1,
          wouldSpeak: true,
          reasoning: "Scheduled briefing",
          priorityScore: { score: 5, label: "medium", reasoning: "Briefing delivery", factors: [] },
          urgencyScore: { score: 0.3, label: "this_week", reasoning: "Scheduled", factors: [], suggestedActionWindow: "today" },
        },
        dismissed: false,
        createdAt: new Date(),
        source: "scheduled",
      });

      if (briefing.risks.length > 0 && briefing.userId) {
        await createNotification(
          briefing.userId,
          briefing.workspaceId,
          "smart_alert",
          `${briefing.risks.length} risk(s) in workspace`,
          briefing.risks.join(". "),
          { category: "briefing", type: briefing.type, insightId: `briefing-${briefing.date.toISOString()}` },
          `briefing-${briefing.workspaceId}-${briefing.date.toDateString()}`
        );
      }

      logger.info("[UIDelivery] Briefing delivered", {
        type: briefing.type,
        workspaceId: briefing.workspaceId,
        riskCount: briefing.risks.length,
      });
    } catch (error: any) {
      logger.warn("[UIDelivery] Briefing delivery failed:", error.message);
    }
  }

  static async deliverChatMessage(workspaceId: string, channelId: string, message: string): Promise<void> {
    try {
      await prisma.chatMessage.create({
        data: {
          workspaceId,
          conversationId: channelId,
          userId: "nova-ambient",
          content: message,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await publishToChannel(`workspace:${workspaceId}`, "nova:chat", {
        channelId,
        message,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.warn("[UIDelivery] Chat message delivery failed:", error.message);
    }
  }

  static async dismissInsight(insightId: string): Promise<void> {
    try {
      await prisma.proactiveInsight.update({
        where: { id: insightId },
        data: { dismissed: true, resolvedAt: new Date() },
      });
    } catch (error: any) {
      logger.warn("[UIDelivery] Dismiss insight failed:", error.message);
    }
  }

  private static async deliverLevel1(intervention: Intervention): Promise<void> {
    await prisma.proactiveInsight.create({
      data: {
        workspaceId: intervention.workspaceId,
        type: intervention.category,
        severity: "low",
        title: intervention.title,
        message: intervention.message,
        affectedItems: this.collectAffectedItems(intervention),
        suggestedAction: intervention.suggestedAction || "",
      },
    });
  }

  private static async deliverLevel2(intervention: Intervention): Promise<void> {
    await prisma.proactiveInsight.create({
      data: {
        workspaceId: intervention.workspaceId,
        type: intervention.category,
        severity: "high",
        title: intervention.title,
        message: intervention.message,
        affectedItems: this.collectAffectedItems(intervention),
        suggestedAction: intervention.suggestedAction || "",
      },
    });

    if (intervention.targetUserId) {
      await createNotification(
        intervention.targetUserId,
        intervention.workspaceId,
        "smart_alert",
        intervention.title,
        intervention.message,
        { category: intervention.category, level: intervention.level, insightId: intervention.id },
        `insight-${intervention.category}-${intervention.workspaceId}`
      );
    }
  }

  private static async deliverLevel3(intervention: Intervention): Promise<void> {
    await prisma.proactiveInsight.create({
      data: {
        workspaceId: intervention.workspaceId,
        type: intervention.category,
        severity: "critical",
        title: intervention.title,
        message: intervention.message,
        affectedItems: this.collectAffectedItems(intervention),
        suggestedAction: intervention.suggestedAction || "",
      },
    });

    if (intervention.targetUserId) {
      await createNotification(
        intervention.targetUserId,
        intervention.workspaceId,
        "smart_alert",
        `Urgent: ${intervention.title}`,
        intervention.message,
        {
          category: intervention.category,
          level: intervention.level,
          insightId: intervention.id,
          priority: "critical",
        },
        `critical-${intervention.category}-${intervention.workspaceId}`
      );
    }

    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: { workspaceId: intervention.workspaceId, role: { in: ["admin", "owner"] } },
      select: { userId: true },
      take: 5,
    });

    for (const member of workspaceMembers) {
      if (member.userId !== intervention.targetUserId) {
        await createNotification(
          member.userId,
          intervention.workspaceId,
          "smart_alert",
          `Workspace alert: ${intervention.title}`,
          intervention.message,
          { category: intervention.category, level: intervention.level, insightId: intervention.id, isEscalation: true },
          `critical-escalation-${intervention.category}-${intervention.workspaceId}`
        );
      }
    }
  }

  private static async persistIntervention(intervention: Intervention): Promise<void> {
    await prisma.agentAction.create({
      data: {
        agentId: "nova-ambient",
        workspaceId: intervention.workspaceId,
        action: "insight_generated",
        targetType: intervention.targetProjectId ? "project" : intervention.targetTaskId ? "task" : "workspace",
        targetId: intervention.targetProjectId || intervention.targetTaskId || intervention.workspaceId,
        summary: `${intervention.category}: ${intervention.title}`,
        metadata: {
          level: intervention.level,
          category: intervention.category,
          source: intervention.source,
          patterns: intervention.patterns.map((p) => ({ type: p.type, severity: p.severity })),
          score: {
            level: intervention.score.level,
            importance: intervention.score.importance,
            urgency: intervention.score.urgency,
            confidence: intervention.score.confidence,
            wouldSpeak: intervention.score.wouldSpeak,
          },
          message: intervention.message,
        } as Prisma.InputJsonValue,
      },
    });
  }

  private static async pushRealTime(intervention: Intervention): Promise<void> {
    try {
      await publishToChannel(`workspace:${intervention.workspaceId}`, "nova:intervention", {
        id: intervention.id,
        level: intervention.level,
        category: intervention.category,
        source: intervention.source,
        title: intervention.title,
        message: intervention.message,
        suggestedAction: intervention.suggestedAction,
        targetUserId: intervention.targetUserId,
        targetTaskId: intervention.targetTaskId,
        targetProjectId: intervention.targetProjectId,
        score: {
          importance: intervention.score.importance,
          urgency: intervention.score.urgency,
          confidence: intervention.score.confidence,
          wouldSpeak: intervention.score.wouldSpeak,
        },
        priorityScore: intervention.score.priorityScore,
        urgencyScore: intervention.score.urgencyScore,
        createdAt: intervention.createdAt.toISOString(),
      });
    } catch {
      logger.warn("[UIDelivery] Real-time push failed (best-effort)");
    }
  }

  private static collectAffectedItems(intervention: Intervention): string[] {
    const items: string[] = [];
    if (intervention.targetTaskId) items.push(intervention.targetTaskId);
    if (intervention.targetProjectId) items.push(intervention.targetProjectId);
    for (const pattern of intervention.patterns) {
      items.push(...pattern.affectedItems);
    }
    return [...new Set(items)];
  }
}
