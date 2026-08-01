import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { canAccessProjectResource } from "@/lib/project-permissions";
import { publishToChannel, getWorkspaceChannel } from "@/lib/ably";
import { updateParentTask } from "@/lib/task-utils";

const reorderSchema = z.object({
    items: z.array(z.object({ id: z.string(), order: z.number().int().min(0) })).min(1),
});

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
        const { items } = reorderSchema.parse(body);

        // Only reorder tasks that actually belong to this parent
        const children = await prisma.task.findMany({
            where: { parentId: params.id, id: { in: items.map((i) => i.id) } },
            select: { id: true },
        });
        const childIds = new Set(children.map((c) => c.id));

        await Promise.all(
            items
                .filter((i) => childIds.has(i.id))
                .map((i) =>
                    prisma.task.update({ where: { id: i.id }, data: { order: i.order } })
                )
        );

        const workspaceChannel = getWorkspaceChannel(task.workspaceId);
        await publishToChannel(workspaceChannel, "subtasks:reordered", {
            parentTaskId: params.id,
            items,
        });

        const { createActivity } = await import("@/lib/activity");
        await createActivity(
            user.id,
            task.workspaceId,
            "updated",
            "task",
            params.id,
            { taskTitle: task.title, entityName: `Subtasks reordered`, changes: {} },
            task.projectId
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        console.error("Reorder subtasks error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
