import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessProjectResource } from "@/lib/project-permissions";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { z } from "zod";

const commentSchema = z.object({
    content: z.string().min(1).max(5000),
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

        const task = await prisma.task.findUnique({ where: { id: params.id } });
        
        if (!task) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        const hasAccess = await verifyWorkspaceAccess(user.id, task.workspaceId);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const hasProjectAccess = await canAccessProjectResource(user.id, task.workspaceId, task.projectId);
        if (!hasProjectAccess) {
            return NextResponse.json({ error: "Access denied to this project" }, { status: 403 });
        }

        const rawComments = await prisma.comment.findMany({
            where: { taskId: params.id },
            orderBy: { createdAt: "desc" },
        });

        const userIdsToFetch = new Set<string>();
        rawComments.forEach((c: { userId: string }) => {
            if (c.userId) userIdsToFetch.add(c.userId);
        });

        const users = await prisma.user.findMany({
            where: { id: { in: Array.from(userIdsToFetch) } },
            select: { id: true, name: true, imageUrl: true }
        });

        const userMap = new Map(users.map(u => [u.id, u]));

        const comments = rawComments.map((c: { userId: string; [key: string]: unknown }) => ({
            ...c,
            user: userMap.get(c.userId) || null
        }));

        return NextResponse.json(comments);
    } catch (error) {
        console.error("Fetch comments error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const task = await prisma.task.findUnique({ where: { id: params.id } });

        if (!task) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: task.workspaceId,
                    userId: user.id,
                },
            },
        });

        if (!membership) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const hasProjectAccess = await canAccessProjectResource(user.id, task.workspaceId, task.projectId);
        if (!hasProjectAccess) {
            return NextResponse.json({ error: "Access denied to this project" }, { status: 403 });
        }

        const body = await req.json();
        const data = commentSchema.parse(body);

        const rawComment = await prisma.comment.create({
            data: {
                content: data.content,
                taskId: params.id,
                userId: user.id,
            },
        });

        const commentUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { id: true, name: true, imageUrl: true }
        });

        const comment = {
            ...rawComment,
            user: commentUser
        };

        const { publishToChannel, getTaskChannel } = await import("@/lib/ably");
        await publishToChannel(getTaskChannel(task.workspaceId, params.id), "comment:created", comment);

        // Log activity
        const { logActivity } = await import("@/lib/activity");
        await logActivity({
            userId: user.id,
            workspaceId: task.workspaceId,
            action: "comment_created",
            entityType: "comment",
            entityId: rawComment.id,
            metadata: { taskId: params.id, taskTitle: task.title, content: data.content.substring(0, 200) },
            projectId: task.projectId || undefined,
        });

        // Notify workspace members
        const { notifyWorkspaceMembers } = await import("@/lib/notifications");
        await notifyWorkspaceMembers(
            task.workspaceId,
            user.id,
            "task_updated",
            "New Comment",
            `${user.name || "A member"} commented on task: ${task.title}`,
            { taskId: params.id, commentId: comment.id }
        );

        return NextResponse.json(comment);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        console.error("Create comment error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
