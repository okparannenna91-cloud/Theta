import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findAcrossShards } from "@/lib/prisma";
import { canAccessProjectResource } from "@/lib/project-permissions";
import { Comment } from "@prisma/client";

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: comment, db } = await findAcrossShards<any>("comment", { id: params.id });

        if (!comment) {
            return NextResponse.json({ error: "Comment not found" }, { status: 404 });
        }

        // Only allow owner to delete comment
        if (comment.userId !== user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch task to get workspaceId and verify project access
        const task = await db.task.findUnique({
          where: { id: comment.taskId },
          select: { workspaceId: true, projectId: true }
        });

        if (!task) {
            return NextResponse.json({ error: "Associated task not found" }, { status: 404 });
        }

        // Verify user still has access to the task's project
        const hasProjectAccess = await canAccessProjectResource(user.id, task.workspaceId, task.projectId);
        if (!hasProjectAccess) {
            return NextResponse.json({ error: "Access denied to this comment's project" }, { status: 403 });
        }

        await db.comment.delete({
            where: { id: params.id },
        });

        const { publishToChannel, getTaskChannel } = await import("@/lib/ably");
        
        await publishToChannel(getTaskChannel(task.workspaceId, comment.taskId), "comment:deleted", { id: params.id });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete comment error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
