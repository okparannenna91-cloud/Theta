import { prisma } from "@/lib/prisma";
import { notifyWorkspaceMembers } from "@/lib/notifications";
import { logger } from "@/lib/logger";

export type AutomationTrigger = "TASK_CREATED" | "TASK_STATUS_UPDATED";

const MAX_AUTOMATION_DEPTH = 5;

function evaluateCondition(condition: string | null, context: Record<string, any>): boolean {
    if (!condition) return true;
    try {
        const parts = condition.split(" ");
        if (parts.length === 3) {
            const [field, op, value] = parts;
            const actual = context[field];
            switch (op) {
                case "==": return String(actual) === value;
                case "!=": return String(actual) !== value;
                case ">": return Number(actual) > Number(value);
                case "<": return Number(actual) < Number(value);
                default: return true;
            }
        }
        return true;
    } catch {
        return true;
    }
}

function parseActionValue(raw: string | null): string | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === "string") return parsed;
        if (typeof parsed === "object" && parsed !== null) {
            return parsed.status || parsed.priority || parsed.value || raw;
        }
        return String(parsed);
    } catch {
        return raw;
    }
}

export async function processAutomations(
    workspaceId: string,
    trigger: AutomationTrigger,
    context: {
        taskId: string;
        projectId: string;
        userId: string;
        [key: string]: any;
    },
    depth: number = 0
) {
    if (depth >= MAX_AUTOMATION_DEPTH) {
        logger.warn(`[Automation Engine] Max depth reached for trigger=${trigger} workspace=${workspaceId}`);
        return;
    }

    try {
        logger.info(`[Automation Engine] Processing trigger=${trigger} for workspace=${workspaceId} (depth=${depth})`);

        const rules = await prisma.automation.findMany({
            where: {
                workspaceId,
                trigger,
                active: true,
            },
            orderBy: { createdAt: "asc" },
        });

        if (rules.length === 0) return;

        for (const rule of rules) {
            if (!evaluateCondition(rule.condition, context)) {
                logger.info(`[Automation Engine] Rule=${rule.id} condition not met, skipping`);
                await prisma.automationLog.create({
                    data: {
                        automationId: rule.id,
                        trigger: rule.trigger,
                        action: rule.action,
                        result: "skipped",
                        metadata: { reason: "condition_not_met", context },
                        workspaceId,
                    }
                });
                continue;
            }

            let result = "success";
            let errorMessage: string | null = null;

            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    const parsedValue = parseActionValue(rule.actionValue);

                    switch (rule.action) {
                        case "SET_STATUS":
                            if (parsedValue) {
                                const targetStatus = await prisma.status.findFirst({
                                    where: { workspaceId, name: { equals: parsedValue, mode: 'insensitive' } }
                                });

                                await prisma.task.update({
                                    where: { id: context.taskId },
                                    data: {
                                        status: parsedValue,
                                        statusId: targetStatus?.id || undefined
                                    }
                                });
                            }
                            break;

                        case "SET_PRIORITY":
                            if (parsedValue) {
                                const validPriorities = ["low", "medium", "high", "urgent", "none"];
                                const priority = parsedValue.toLowerCase();
                                if (validPriorities.includes(priority)) {
                                    await prisma.task.update({
                                        where: { id: context.taskId },
                                        data: { priority }
                                    });
                                } else {
                                    logger.warn(`[Automation Engine] Invalid priority value="${priority}" for rule=${rule.id}`);
                                }
                            }
                            break;

                        case "SET_ASSIGNEE":
                            if (parsedValue) {
                                await prisma.task.update({
                                    where: { id: context.taskId },
                                    data: { userId: parsedValue }
                                });
                            }
                            break;

                        case "SEND_NOTIFICATION":
                            await notifyWorkspaceMembers(
                                workspaceId,
                                context.userId,
                                "task_updated",
                                "Automation Triggered",
                                parsedValue || `An automation rule was triggered for task ${context.taskId}`,
                                { taskId: context.taskId, projectId: context.projectId }
                            );
                            break;

                        default:
                            logger.warn(`[Automation Engine] Unknown action=${rule.action} for rule=${rule.id}`);
                    }

                    logger.info(`[Automation Engine] Successfully executed rule=${rule.name} (id=${rule.id})`);
                    result = "success";
                    break;
                } catch (ruleError) {
                    errorMessage = String(ruleError);
                    logger.error(`[Automation Engine] Attempt ${attempt}/3 failed for rule=${rule.id}:`, ruleError);
                    if (attempt < 3) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } else {
                        result = "error";
                    }
                }
            }

            await prisma.automationLog.create({
                data: {
                    automationId: rule.id,
                    trigger: rule.trigger,
                    action: rule.action,
                    result,
                    error: errorMessage,
                    metadata: { context, depth },
                    workspaceId,
                }
            });

            // If error, don't cascade further
            if (result === "error") {
                logger.error(`[Automation Engine] Permanently failed rule=${rule.id} after 3 attempts`);
                continue;
            }
        }
    } catch (error) {
        logger.error("[Automation Engine] Error processing automations:", error);
    }
}
