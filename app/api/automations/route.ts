import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const automationSchema = z.object({
    name: z.string().min(1),
    trigger: z.string(),
    condition: z.string().optional(),
    action: z.string(),
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

        const [automations, count] = await Promise.all([
            prisma.automation.findMany({
                where: { workspaceId },
                orderBy: { createdAt: "desc" },
            }),
            prisma.automation.count({ where: { workspaceId } })
        ]);

        const { getPlanLimits } = await import("@/lib/plan-limits");
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
        console.error("Get automations error:", error);
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

        // Check plan limits strictly
        try {
            const count = await prisma.automation.count({ where: { workspaceId: data.workspaceId } });
            const { enforcePlanLimit } = await import("@/lib/plan-limits");
            await enforcePlanLimit(data.workspaceId, "automations", count);
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

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
        console.error("Create automation error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
