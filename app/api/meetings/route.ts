import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { z } from "zod";

const meetingSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  topic: z.string().optional(),
  workspaceId: z.string(),
  projectId: z.string().optional(),
  participants: z.array(z.string()).optional(),
  agendaItems: z.array(z.string()).optional(),
  scheduledAt: z.string().datetime().optional(),
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
    const status = searchParams.get("status");

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const where: Record<string, unknown> = { workspaceId };
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    const meetings = await prisma.meeting.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ meetings });
  } catch (error) {
    console.error("Get meetings error:", error);
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
    const data = meetingSchema.parse(body);

    const hasAccess = await verifyWorkspaceAccess(user.id, data.workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    let agendaItems = null;
    if (data.agendaItems) {
      agendaItems = data.agendaItems;
    } else if (data.topic) {
      try {
        const { MeetingIntelligence } = await import("@/lib/nova/meeting-intelligence");
        const prep = MeetingIntelligence.prepareAgenda(data.topic, data.description);
        agendaItems = prep.agendaItems || [];
      } catch (e) {
        console.error("Failed to generate agenda:", e);
      }
    }

    const meeting = await prisma.meeting.create({
      data: {
        title: data.title,
        description: data.description || null,
        topic: data.topic || null,
        workspaceId: data.workspaceId,
        userId: user.id,
        participants: data.participants || [user.email || user.id],
        agendaItems,
        status: data.scheduledAt ? "scheduled" : "scheduled",
        phase: "PRE_MEETING",
      },
    });

    try {
      const { createActivity } = await import("@/lib/activity");
      await createActivity(
        user.id,
        data.workspaceId,
        "created",
        "meeting",
        meeting.id,
        { meetingTitle: meeting.title }
      );
    } catch (e) {
      console.error("Activity logging failed:", e);
    }

    return NextResponse.json(meeting);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Create meeting error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
