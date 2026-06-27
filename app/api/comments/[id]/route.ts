import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

        const comment = await prisma.comment.findUnique({ where: { id: params.id } });

        if (!comment) {
            return NextResponse.json({ error: "Comment not found" }, { status: 404 });
        }

        if (comment.userId !== user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const task = await prisma.task.findUnique({
          where: { id: comment.taskId ?? undefined },
          select: { workspaceId: true, projectId: true }
        });

        if (!task) {
            return NextResponse.json({ error: "Associated task not found" }, { status: 404 });
        }

        const hasProjectAccess = await canAccessProjectResource(user.id, task.workspaceId, task.projectId);
        if (!hasProjectAccess) {
            return NextResponse.json({ error: "Access denied to this comment's project" }, { status: 403 });
        }

        await prisma.comment.delete({
            where: { id: params.id },
        });

        const { publishToChannel, getTaskChannel } = await import("@/lib/ably");
        
        await publishToChannel(getTaskChannel(task.workspaceId, comment.taskId ?? ""), "comment:deleted", { id: params.id });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete comment error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
