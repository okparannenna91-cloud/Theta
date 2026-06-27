import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { getAccessibleProjectIds } from "@/lib/project-permissions";
import { publishToChannel, getWorkspaceChannel, getBoardChannel } from "@/lib/ably";

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const { taskIds } = await req.json();
    if (!taskIds || !Array.isArray(taskIds)) return new NextResponse("Invalid request", { status: 400 });

    const firstTask = await prisma.task.findUnique({ where: { id: taskIds[0] } });

    if (!firstTask) return new NextResponse("Tasks not found", { status: 404 });

    const hasAccess = await verifyWorkspaceAccess(user.id, firstTask.workspaceId);
    if (!hasAccess) return new NextResponse("Forbidden", { status: 403 });

    const accessibleProjectIds = await getAccessibleProjectIds(user.id, firstTask.workspaceId);

    await prisma.task.deleteMany({
      where: {
        id: { in: taskIds },
        workspaceId: firstTask.workspaceId,
        projectId: { in: accessibleProjectIds }
      }
    });

    // Notify via Ably
    if (firstTask.boardId) {
      const boardChannel = getBoardChannel(firstTask.workspaceId, firstTask.boardId);
      await publishToChannel(boardChannel, "task:deleted", { taskIds });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TASK_BULK_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
