import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ProactiveIntelligenceEngine, type ProactiveInsight } from "@/lib/nova/proactive-intelligence";
import { executeWithProvider } from "@/lib/langraph/model-router";
import { publishToChannel } from "@/lib/ably";

// ──────────────────────────────────────────────
//  BACKGROUND AGENT — runs every 30 minutes
//  Analyzes workspace and generates proactive insights
// ──────────────────────────────────────────────

export const backgroundAgentCron = inngest.createFunction(
  { id: "nova-background-agent", triggers: [{ cron: "TZ(UTC) */30 * * * *" }] },
  async ({ step }) => {
    logger.info("[Agent:Background] Starting background agent scan");

    const activeWorkspaces = await prisma.workspace.findMany({
      where: { subscriptionStatus: { notIn: ["canceled", "deactivated"] } },
      select: { id: true, name: true, plan: true },
      take: 50,
    });

    let insightsGenerated = 0;

    for (const workspace of activeWorkspaces) {
      try {
        const summary = await step.run(`analyze-${workspace.id}`, async () => {
          return await ProactiveIntelligenceEngine.analyzeWorkspace(workspace.id);
        }) as unknown as { insights: ProactiveInsight[]; totalInsights: number; criticalCount: number; highCount: number; mediumCount: number; lowCount: number; topRecommendation: string | null };

        if (!summary || summary.insights.length === 0) continue;

        // Store critical and high severity insights
        for (const insight of summary.insights) {
          if (insight.severity === "critical" || insight.severity === "high") {
            await prisma.proactiveInsight.create({
              data: {
                workspaceId: workspace.id,
                type: insight.type,
                severity: insight.severity,
                title: insight.title,
                message: insight.message,
                affectedItems: insight.affectedItems || [],
                suggestedAction: insight.suggestedAction || "",
              },
            });

            // Log agent action
            await prisma.agentAction.create({
              data: {
                agentId: "background-agent",
                workspaceId: workspace.id,
                action: "insight_generated",
                summary: `${insight.severity.toUpperCase()}: ${insight.title}`,
                metadata: { type: insight.type, severity: insight.severity },
              },
            });

            insightsGenerated++;
          }
        }

        // Push real-time notification for critical insights
        const criticalInsights = summary.insights.filter((i) => i.severity === "critical");
        if (criticalInsights.length > 0) {
          await publishToChannel(`workspace:${workspace.id}`, "agent:insight", {
            type: "critical_insights",
            count: criticalInsights.length,
            summary: criticalInsights.map((i) => i.title).join("; "),
          });
        }

        // Generate LLM summary for critical findings
        if (criticalInsights.length > 0) {
          try {
            const llmSummary = await executeWithProvider(
              "gemini",
              "gemini-2.5-flash",
              "You are a project management assistant. Summarize these critical workspace issues in 2-3 sentences. Be concise and actionable.",
              criticalInsights.map((i) => `- ${i.title}: ${i.message}`).join("\n"),
            );

            await publishToChannel(`workspace:${workspace.id}`, "agent:summary", {
              type: "critical_summary",
              summary: llmSummary,
            });
          } catch {
            // LLM summary is best-effort
          }
        }

      } catch (error: any) {
        logger.warn(`[Agent:Background] Failed for workspace ${workspace.id}: ${error.message}`);
      }
    }

    logger.info(`[Agent:Background] Completed. ${insightsGenerated} insights generated across ${activeWorkspaces.length} workspaces`);
    return { insightsGenerated, workspacesScanned: activeWorkspaces.length };
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
    const { eventType, workspaceId, taskId, projectId } = event.data;
    logger.info(`[Agent:Event] Processing ${eventType}`, { workspaceId, taskId });

    switch (eventType) {
      case "TASK_CREATED": {
        if (taskId) {
          const task = await prisma.task.findUnique({ where: { id: taskId } });
          if (!task) break;

          const labels = await step.run("auto-label", async () => {
            const result = await executeWithProvider(
              "gemini",
              "gemini-2.5-flash",
              "You are a task classifier. Given a task title and description, suggest 1-3 labels (short phrases). Return ONLY a comma-separated list of labels, nothing else.",
              `Title: ${task.title}\nDescription: ${task.description || "none"}`,
            );
            return result.split(",").map((l: string) => l.trim()).filter(Boolean).slice(0, 3);
          });

          if (labels.length > 0) {
            await prisma.agentAction.create({
              data: {
                agentId: "event-agent",
                workspaceId,
                action: "task_labeled",
                targetType: "task",
                targetId: taskId,
                summary: `Auto-labeled: ${labels.join(", ")}`,
                metadata: { labels },
              },
            });
          }
        }
        break;
      }

      case "TASK_COMPLETED": {
        if (taskId && projectId) {
          const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: { project: true },
          });
          if (!task) break;

          const remainingTasks = await prisma.task.findMany({
            where: { projectId, status: { notIn: ["done", "completed"] } },
          });

          if (remainingTasks.length === 0) {
            await publishToChannel(`workspace:${workspaceId}`, "agent:sprint_complete", {
              type: "sprint_milestone",
              projectId,
              projectName: task.project?.name,
              message: `All tasks in ${task.project?.name} are completed!`,
            });
          }

          await prisma.agentAction.create({
            data: {
              agentId: "event-agent",
              workspaceId,
              action: "task_completed_check",
              targetType: "task",
              targetId: taskId,
              summary: `Task completed. ${remainingTasks.length} remaining in project.`,
              metadata: { remainingTasks: remainingTasks.length },
            },
          });
        }
        break;
      }

      case "SPRINT_STARTED": {
        if (projectId) {
          const brief = await step.run("sprint-brief", async () => {
            const tasks = await prisma.task.findMany({
              where: { projectId, status: { notIn: ["done", "completed"] } },
              take: 20,
            });

            if (tasks.length === 0) return "No tasks in this sprint yet.";

            const result = await executeWithProvider(
              "gemini",
              "gemini-2.5-flash",
              "You are a project manager. Generate a brief sprint kickoff summary. Include: key focus areas, risk items, and team priorities. Be concise (3-5 bullet points).",
              `Sprint tasks:\n${tasks.map((t) => `- [${t.priority}] ${t.title}${t.dueDate ? ` (due ${t.dueDate.toLocaleDateString()})` : ""}`).join("\n")}`,
            );
            return result;
          });

          await publishToChannel(`workspace:${workspaceId}`, "agent:sprint_brief", {
            type: "sprint_brief",
            projectId,
            brief,
          });

          await prisma.agentAction.create({
            data: {
              agentId: "event-agent",
              workspaceId,
              action: "sprint_brief_generated",
              targetType: "project",
              targetId: projectId,
              summary: `Sprint brief generated`,
            },
          });
        }
        break;
      }
    }

    return { processed: true, eventType };
  }
);
