import { prisma } from "@/lib/prisma";
import { notifyWorkspaceMembers } from "@/lib/notifications";

export type AutomationTrigger = "TASK_CREATED" | "TASK_STATUS_UPDATED";

export async function processAutomations(
    workspaceId: string,
    trigger: AutomationTrigger,
    context: {
        taskId: string;
        projectId: string;
        userId: string;
        [key: string]: any;
    }
) {
    try {
        console.log(`[Automation Engine] Processing trigger=${trigger} for workspace=${workspaceId}`);
        
        // Automations are stored on Shard 1 (central metadata)
        const rules = await prisma.automation.findMany({
            where: {
                workspaceId,
                trigger,
                active: true,
            },
        });

        if (rules.length === 0) return;

        for (const rule of rules) {
            try {
                switch (rule.action) {
                    case "SET_STATUS":
                        if (rule.actionValue) {
                            const targetStatus = await prisma.status.findFirst({
                                where: { workspaceId, name: { equals: rule.actionValue, mode: 'insensitive' } }
                            });
                            
                            await prisma.task.update({
                                where: { id: context.taskId },
                                data: { 
                                    status: rule.actionValue,
                                    statusId: targetStatus?.id || undefined
                                }
                            });
                        }
                        break;

                    case "SET_PRIORITY":
                        if (rule.actionValue) {
                            await prisma.task.update({
                                where: { id: context.taskId },
                                data: { priority: rule.actionValue.toLowerCase() }
                            });
                        }
                        break;

                    case "SEND_NOTIFICATION":
                        await notifyWorkspaceMembers(
                            workspaceId,
                            context.userId,
                            "task_updated",
                            "Automation Triggered",
                            rule.actionValue || `An automation rule was triggered for task ${context.taskId}`,
                            { taskId: context.taskId, projectId: context.projectId }
                        );
                        break;

                    default:
                        console.warn(`[Automation Engine] Unknown action=${rule.action}`);
                }
                
                console.log(`[Automation Engine] Successfully executed rule=${rule.name} (id=${rule.id})`);
            } catch (ruleError) {
                console.error(`[Automation Engine] Failed to execute rule=${rule.id}:`, ruleError);
            }
        }
    } catch (error) {
        console.error("[Automation Engine] Error processing automations:", error);
    }
}
