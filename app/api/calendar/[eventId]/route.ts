import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessProjectResource, requireProjectAccess } from "@/lib/project-permissions";
import { z } from "zod";

const updateSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    allDay: z.boolean().optional(),
    color: z.string().optional(),
    type: z.string().optional(),
    recurrence: z.string().optional(),
    projectId: z.string().optional(),
    teamId: z.string().optional(),
    reminders: z.array(z.number()).optional(),
});

export async function PATCH(
    req: Request,
    { params }: { params: { eventId: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const eventId = params.eventId;
        const body = await req.json();
        const data = updateSchema.parse(body);

        const event = await prisma.calendarEvent.findUnique({ where: { id: eventId } });

        if (!event) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        let hasAccess = false;
        if (event.projectId) {
            const access = await requireProjectAccess(user.id, event.projectId, event.workspaceId);
            hasAccess = access.allowed;
        } else {
            hasAccess = (await canAccessProjectResource(user.id, event.workspaceId, null)).valueOf();
        }
        if (!hasAccess) {
          return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        if (data.projectId !== undefined && data.projectId !== event.projectId) {
            if (data.projectId) {
                const targetAccess = await canAccessProjectResource(user.id, event.workspaceId, data.projectId);
                if (!targetAccess) {
                    return NextResponse.json({ error: "Access denied to target project" }, { status: 403 });
                }
            }
        }

        if (event.userId !== user.id) {
            if (event.teamId) {
                const teamMember = await prisma.teamMember.findUnique({
                    where: { teamId_userId: { teamId: event.teamId, userId: user.id } }
                });
                if (!teamMember) {
                    return NextResponse.json({ error: "Forbidden: not the event owner or team member" }, { status: 403 });
                }
            } else {
                return NextResponse.json({ error: "Forbidden: only the event owner can update" }, { status: 403 });
            }
        }

        const updatedEvent = await prisma.calendarEvent.update({
            where: { id: eventId },
            data: { ...data, }
        });

        return NextResponse.json(updatedEvent);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        console.error("Calendar PATCH error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { eventId: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const eventId = params.eventId;

        const event = await prisma.calendarEvent.findUnique({ where: { id: eventId } });

        if (!event) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        let hasAccess = false;
        if (event.projectId) {
            const access = await requireProjectAccess(user.id, event.projectId, event.workspaceId);
            hasAccess = access.allowed;
        } else {
            hasAccess = (await canAccessProjectResource(user.id, event.workspaceId, null)).valueOf();
        }
        if (!hasAccess) {
          return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        if (event.userId !== user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.calendarEvent.delete({
            where: { id: eventId }
        });

        return NextResponse.json({ message: "Event deleted" });
    }
    catch (error) {
        console.error("Calendar DELETE error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
