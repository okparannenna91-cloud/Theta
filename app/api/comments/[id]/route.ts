import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessProjectResource } from "@/lib/project-permissions";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { z } from "zod";

const updateSchema = z.object({
    content: z.string().min(1).max(5000),
});

async function getCommentContext(comment: { taskId: string | null; documentId: string | null }) {
    if (comment.taskId) {
        const task = await prisma.task.findUnique({
            where: { id: comment.taskId },
            select: { workspaceId: true, projectId: true }
        });
        return task ? { workspaceId: task.workspaceId, projectId: task.projectId } : null;
    }
    if (comment.documentId) {
        const doc = await prisma.document.findUnique({
            where: { id: comment.documentId },
            select: { workspaceId: true, projectId: true }
        });
        return doc ? { workspaceId: doc.workspaceId, projectId: doc.projectId } : null;
    }
    return null;
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

        const comment = await prisma.comment.findUnique({ where: { id: params.id } });
        if (!comment) {
            return NextResponse.json({ error: "Comment not found" }, { status: 404 });
        }

        if (comment.userId !== user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const data = updateSchema.parse(body);

        const context = await getCommentContext(comment);
        if (!context) {
            return NextResponse.json({ error: "Associated resource not found" }, { status: 404 });
        }

        const hasAccess = await canAccessProjectResource(user.id, context.workspaceId, context.projectId);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const updated = await prisma.comment.update({
            where: { id: params.id },
            data: { content: data.content },
        });

        const updatedUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { id: true, name: true, imageUrl: true }
        });

        const { publishToChannel, getTaskChannel } = await import("@/lib/ably");
        await publishToChannel(
            getTaskChannel(context.workspaceId, comment.taskId ?? ""),
            "comment:updated",
            { ...updated, user: updatedUser }
        );

        return NextResponse.json({ ...updated, user: updatedUser });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        console.error("Update comment error:", error);
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

        const comment = await prisma.comment.findUnique({ where: { id: params.id } });

        if (!comment) {
            return NextResponse.json({ error: "Comment not found" }, { status: 404 });
        }

        if (comment.userId !== user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const context = await getCommentContext(comment);
        if (!context) {
            return NextResponse.json({ error: "Associated resource not found" }, { status: 404 });
        }

        const hasAccess = await canAccessProjectResource(user.id, context.workspaceId, context.projectId);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        await prisma.comment.delete({
            where: { id: params.id },
        });

        const { publishToChannel, getTaskChannel } = await import("@/lib/ably");
        await publishToChannel(
            getTaskChannel(context.workspaceId, comment.taskId ?? ""),
            "comment:deleted",
            { id: params.id }
        );

        const { logActivity } = await import("@/lib/activity");
        await logActivity({
            userId: user.id,
            workspaceId: context.workspaceId,
            action: "comment_deleted",
            entityType: "comment",
            entityId: params.id,
            metadata: { taskId: comment.taskId },
            projectId: context.projectId ?? undefined,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete comment error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
