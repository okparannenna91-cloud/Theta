import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    const access = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const baselines = await prisma.baseline.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ baselines });
  } catch (error) {
    console.error("Failed to fetch baselines:", error);
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
    const { workspaceId, projectId, label, tasks } = body;

    if (!workspaceId || !label || !tasks) {
      return NextResponse.json({ error: "workspaceId, label, and tasks required" }, { status: 400 });
    }

    const access = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const baseline = await prisma.baseline.create({
      data: {
        workspaceId,
        projectId: projectId || null,
        label,
        tasks: tasks,
      },
    });

    return NextResponse.json({ baseline });
  } catch (error) {
    console.error("Failed to create baseline:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const workspaceId = searchParams.get("workspaceId");

    if (!id || !workspaceId) {
      return NextResponse.json({ error: "id and workspaceId required" }, { status: 400 });
    }

    const access = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.baseline.deleteMany({
      where: { id, workspaceId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete baseline:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
