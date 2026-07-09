import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanLimits } from "@/lib/plan-limits";
import { getAccessibleProjectIds, canAccessProjectResource, requireProjectAccess } from "@/lib/project-permissions";
import { z } from "zod";

const eventSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    start: z.string(),
    end: z.string(),
    allDay: z.boolean().default(false),
    color: z.string().optional(),
    type: z.string().default("event"),
    recurrence: z.string().optional(),
    workspaceId: z.string(),
    projectId: z.string().optional(),
    teamId: z.string().optional(),
    reminders: z.array(z.number()).optional(),
});

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get("workspaceId");
        const projectId = searchParams.get("projectId");

        if (!workspaceId) {
            return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
        }

        const accessibleProjectIds = await getAccessibleProjectIds(user.id, workspaceId);

        let where: any = { workspaceId };

        if (projectId) {
            const access = await requireProjectAccess(user.id, projectId, workspaceId);
            if (!access.allowed) {
                return NextResponse.json({ error: "Access denied to this project" }, { status: 403 });
            }
            where.projectId = projectId;
        } else {
            where.OR = [
                { projectId: null },
                { projectId: { in: accessibleProjectIds } },
                { userId: user.id },
            ];
        }

        const [events, count] = await Promise.all([
            prisma.calendarEvent.findMany({
                where,
                orderBy: { start: "asc" }
            }),
            prisma.calendarEvent.count({ where: { workspaceId } })
        ]);

        const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { plan: true } });
        const plan = workspace?.plan || "free";
        const limits = getPlanLimits(plan as any);

        return NextResponse.json({
            events,
            limits: {
                max: limits.maxCalendarEvents,
                current: count,
            }
        });
    } catch (error) {
        console.error("Calendar GET error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const data = eventSchema.parse(body);

        if (data.projectId) {
            const access = await requireProjectAccess(user.id, data.projectId, data.workspaceId);
            if (!access.allowed) {
                return NextResponse.json({ error: "Access denied to this project" }, { status: 403 });
            }
        } else {
            const hasAccess = await canAccessProjectResource(user.id, data.workspaceId, null);
            if (!hasAccess) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 });
            }
        }

        try {
            const { getCalendarEventCount } = await import("@/lib/usage-tracking");
            const count = await getCalendarEventCount(data.workspaceId);

            const { enforcePlanLimit } = await import("@/lib/plan-limits");
            await enforcePlanLimit(data.workspaceId, "calendar_events", count);
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        const event = await prisma.calendarEvent.create({
            data: {
                ...data,
                userId: user.id,
                reminders: data.reminders || [],
            }
        });

        return NextResponse.json(event);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        console.error("Calendar POST error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
