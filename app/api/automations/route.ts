import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { getPlanLimits, enforcePlanLimit } from "@/lib/plan-limits";

const TRIGGER_VALUES = [
    "TASK_CREATED", "TASK_COMPLETED", "SPRINT_STARTED", "SPRINT_COMPLETED",
    "FORM_SUBMITTED", "DOCUMENT_UPDATED", "USER_INVITED", "TASK_OVERDUE", "MEMBER_ADDED",
] as const;

const ACTION_VALUES = [
    "CREATE_TASK", "ASSIGN_USER", "SEND_EMAIL", "UPDATE_STATUS",
    "GENERATE_REPORT", "NOTIFY_TEAM", "CREATE_PROJECT", "SEND_NOTIFICATION",
    "NOTIFY_CHANNEL", "SET_ASSIGNEE", "SET_STATUS", "SET_PRIORITY",
] as const;

const automationSchema = z.object({
    name: z.string().min(1),
    trigger: z.enum(TRIGGER_VALUES),
    condition: z.string().optional(),
    action: z.enum(ACTION_VALUES),
    actionValue: z.string().optional(),
    workspaceId: z.string(),
});

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get("workspaceId");

        if (!workspaceId) {
            return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
        }

        // Verify workspace access
        const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const [automations, count] = await Promise.all([
            prisma.automation.findMany({
                where: { workspaceId },
                orderBy: { createdAt: "asc" },
            }),
            prisma.automation.count({ where: { workspaceId } })
        ]);

        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { plan: true }
        });

        const plan = workspace?.plan || "free";
        const limits = getPlanLimits(plan as any);

        return NextResponse.json({
            automations,
            limits: {
                max: limits.maxAutomations,
                current: count,
            }
        });
    } catch (error) {
        logger.error("Get automations error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const data = automationSchema.parse(body);

        // Verify workspace access
        const hasAccess = await verifyWorkspaceAccess(user.id, data.workspaceId);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Check plan limits strictly with TOCTOU-safe transaction
        await prisma.$transaction(async (tx) => {
            const count = await tx.automation.count({ where: { workspaceId: data.workspaceId } });
            await enforcePlanLimit(data.workspaceId, "automations", count);
        });

        const automation = await prisma.automation.create({
            data: {
                name: data.name,
                trigger: data.trigger,
                condition: data.condition || null,
                action: data.action,
                actionValue: data.actionValue || null,
                workspaceId: data.workspaceId,
            },
        });

        return NextResponse.json(automation);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        logger.error("Create automation error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
