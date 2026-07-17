import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// ──────────────────────────────────────────────
//  AUTOMATION EXECUTION ENGINE (event-driven)
// ──────────────────────────────────────────────

export const executeAutomation = inngest.createFunction(
  { id: "nova-execute-automation", triggers: [{ event: "automation/triggered" }] },
  async ({ event, step }) => {
    const { ruleId, triggerType, context } = event.data as {
      ruleId: string;
      triggerType: string;
      context: Record<string, unknown>;
    };

    logger.info("[AutomationExecutor] Started", { ruleId, triggerType });

    // Log execution
    await step.run("log-execution", async () => {
      await prisma.activity.create({
        data: {
          action: "automation_executed",
          entityType: "automation",
          entityId: ruleId,
          workspaceId: (context.workspaceId as string) || "",
          userId: (context.userId as string) || "",
          metadata: {
            triggerType,
            executedAt: new Date().toISOString(),
          },
        },
      });
    });

    logger.info("[AutomationExecutor] Completed", { ruleId });

    return { executed: true };
  }
);

// ──────────────────────────────────────────────
//  HELPER: Trigger an automation
// ──────────────────────────────────────────────

export async function triggerAutomation(
  ruleId: string,
  triggerType: string,
  context: Record<string, unknown>,
): Promise<void> {
  await inngest.send({
    name: "automation/triggered",
    data: { ruleId, triggerType, context },
  });
}
