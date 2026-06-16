import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma, findAcrossShards, getPrismaClient } from "@/lib/prisma";
import { CalendarEvent } from "@prisma/client";
import { canAccessProjectResource, getAccessibleProjectIds } from "@/lib/project-permissions";
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

        const { data: event, db } = await findAcrossShards<any>("calendarEvent", { id: eventId });

        if (!event) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        // Verify workspace access
        const hasAccess = await canAccessProjectResource(user.id, event.workspaceId, null);
        if (!hasAccess) {
          return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Allow event owner or team members to update
        if (event.userId !== user.id) {
            // If event is linked to a team, check team membership
            if (event.teamId) {
                const db = getPrismaClient(event.workspaceId);
                const teamMember = await db.teamMember.findUnique({
                    where: { teamId_userId: { teamId: event.teamId, userId: user.id } }
                });
                if (!teamMember) {
                    return NextResponse.json({ error: "Forbidden: not the event owner or team member" }, { status: 403 });
                }
            } else {
                return NextResponse.json({ error: "Forbidden: only the event owner can update" }, { status: 403 });
            }
        }

        const updatedEvent = await db.calendarEvent.update({
            where: { id: eventId },
            data: {
                ...data,
            }
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

        const { data: event, db } = await findAcrossShards<any>("calendarEvent", { id: eventId });

        if (!event) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        // Verify workspace access
        const hasAccess = await canAccessProjectResource(user.id, event.workspaceId, null);
        if (!hasAccess) {
          return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        if (event.userId !== user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await db.calendarEvent.delete({
            where: { id: eventId }
        });

        return NextResponse.json({ message: "Event deleted" });
    }
    catch (error) {
        console.error("Calendar DELETE error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
