import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireProjectWriteAccess } from "@/lib/project-permissions";
import { startSprint } from "@/lib/services/sprint-service";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sprint = await prisma.sprint.findUnique({ where: { id: params.id } });
    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    const accessCheck = await requireProjectWriteAccess(user.id, sprint.projectId, sprint.workspaceId);
    if (!accessCheck.allowed) {
      return NextResponse.json({ error: accessCheck.error!.message }, { status: accessCheck.error!.status });
    }

    const updatedSprint = await startSprint(params.id);

    return NextResponse.json(updatedSprint);
  } catch (error) {
    console.error("POST /api/sprints/[id]/start error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
