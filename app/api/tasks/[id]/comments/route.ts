import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma, findAcrossShards } from "@/lib/prisma";
import { Task, Comment } from "@prisma/client";
import { z } from "zod";

const commentSchema = z.object({
    content: z.string().min(1),
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

        const { data: task, db } = await findAcrossShards<Task>("task", { id: params.id });
        
        if (!task) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        const rawComments = await (db as any).comment.findMany({
            where: { taskId: params.id },
            orderBy: { createdAt: "desc" },
        });

        const userIdsToFetch = new Set<string>();
        rawComments.forEach((c: any) => {
            if (c.userId) userIdsToFetch.add(c.userId);
        });

        const users = await prisma.user.findMany({
            where: { id: { in: Array.from(userIdsToFetch) } },
            select: { id: true, name: true, imageUrl: true }
        });
        
        const userMap = new Map(users.map(u => [u.id, u]));

        const comments = rawComments.map((c: any) => ({
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

        const { data: task, db } = await findAcrossShards<Task>("task", { id: params.id });

        if (!task) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        // Verify workspace access
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

        const body = await req.json();
        const data = commentSchema.parse(body);

        const rawComment = await (db as any).comment.create({
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
