import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: { workspaceId: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const access = await verifyWorkspaceAccess(project.workspaceId, user.id);
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const schedule = await prisma.projectSchedule.findUnique({
      where: { projectId: params.id },
    });

    return NextResponse.json({
      schedule: schedule || {
        workingDays: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false,
        },
        holidays: [],
      },
    });
  } catch (error) {
    console.error("Failed to fetch project schedule:", error);
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

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: { workspaceId: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const access = await verifyWorkspaceAccess(project.workspaceId, user.id);
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { workingDays, holidays } = body;

    const schedule = await prisma.projectSchedule.upsert({
      where: { projectId: params.id },
      update: {
        ...(workingDays !== undefined && { workingDays }),
        ...(holidays !== undefined && { holidays }),
      },
      create: {
        projectId: params.id,
        workingDays: workingDays || {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false,
        },
        holidays: holidays || [],
      },
    });

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("Failed to update project schedule:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
