import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreateCalendarEvent, getPlanLimitMessage } from "@/lib/plan-limits";
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

        if (!workspaceId) {
            return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
        }

        const events = await prisma.calendarEvent.findMany({
            where: {
                workspaceId,
                OR: [
                    { userId: user.id },
                    { teamId: { not: null } }
                ]
            },
            orderBy: { start: "asc" }
        });

        return NextResponse.json(events);
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

        // Check plan limits strictly
        try {
            const { enforcePlanLimit } = await import("@/lib/plan-limits");
            // Fetch workspace to get current count for plan limit enforcement
            const workspace = await prisma.workspace.findUnique({
                where: { id: data.workspaceId },
                include: {
                    _count: {
                        select: { calendarEvents: true },
                    },
                },
            });
            if (!workspace) {
                return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
            }
            await enforcePlanLimit(data.workspaceId, "calendar_events", workspace._count.calendarEvents);
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
