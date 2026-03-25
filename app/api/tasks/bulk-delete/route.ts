import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { publishToChannel, getWorkspaceChannel, getBoardChannel } from "@/lib/ably";

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const { taskIds } = await req.json();
    if (!taskIds || !Array.isArray(taskIds)) return new NextResponse("Invalid request", { status: 400 });

    const prisma = await getPrismaClient(); // Defaulting to shard 1 for now or findAcrossShards if needed
    // However, tasks require workspaceId to find the shard.
    
    // We need to find the tasks to get their workspaceId and boardId
    // For simplicity in this bulk operation, we assume they belong to the same workspace/board
    const firstTask = await prisma.task.findUnique({
      where: { id: taskIds[0] },
      select: { workspaceId: true, boardId: true }
    });

    if (!firstTask) return new NextResponse("Tasks not found", { status: 404 });

    const hasAccess = await verifyWorkspaceAccess(firstTask.workspaceId, user.id);
    if (!hasAccess) return new NextResponse("Forbidden", { status: 403 });

    const shardedPrisma = await getPrismaClient(firstTask.workspaceId);

    await shardedPrisma.task.deleteMany({
      where: {
        id: { in: taskIds },
        workspaceId: firstTask.workspaceId
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
