import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["scheduled", "live", "completed", "cancelled"]).optional(),
  phase: z.enum(["PRE_MEETING", "LIVE_MEETING", "POST_MEETING"]).optional(),
  summary: z.string().optional(),
  agendaItems: z.array(z.string()).optional(),
  decisions: z.array(z.string()).optional(),
  actionItems: z.array(z.object({
    title: z.string(),
    assignee: z.string().optional(),
    priority: z.string().optional(),
  })).optional(),
  participants: z.array(z.string()).optional(),
  followUpRecommendations: z.array(z.string()).optional(),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id: params.id },
    });

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, meeting.workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(meeting);
  } catch (error) {
    console.error("Get meeting error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.meeting.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, existing.workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await req.json();
    const data = updateSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.phase !== undefined) updateData.phase = data.phase;
    if (data.summary !== undefined) updateData.summary = data.summary;
    if (data.agendaItems !== undefined) updateData.agendaItems = data.agendaItems;
    if (data.decisions !== undefined) updateData.decisions = data.decisions;
    if (data.actionItems !== undefined) updateData.actionItems = data.actionItems;
    if (data.participants !== undefined) updateData.participants = data.participants;
    if (data.followUpRecommendations !== undefined) updateData.followUpRecommendations = data.followUpRecommendations;
    if (data.startedAt !== undefined) updateData.startedAt = new Date(data.startedAt);
    if (data.endedAt !== undefined) updateData.endedAt = new Date(data.endedAt);

    const meeting = await prisma.meeting.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(meeting);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Update meeting error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.meeting.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, existing.workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await prisma.meeting.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete meeting error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
