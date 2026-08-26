import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { canAccessProjectResource } from "@/lib/project-permissions";
import { publishToChannel, getWorkspaceChannel, getBoardChannel, getTaskChannel } from "@/lib/ably";

export async function PATCH(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        if (!body.updates || !Array.isArray(body.updates) || body.updates.length === 0) {
            return NextResponse.json({ error: "updates array is required" }, { status: 400 });
        }

        const results: { id: string; success: boolean; error?: string }[] = [];

        for (const update of body.updates) {
            try {
                const { id, ...data } = update;
                if (!id) {
                    results.push({ id: "", success: false, error: "Missing id" });
                    continue;
                }

                const existing = await prisma.task.findUnique({ where: { id } });
                if (!existing) {
                    results.push({ id, success: false, error: "Not found" });
                    continue;
                }

                const hasWorkspaceAccess = await verifyWorkspaceAccess(user.id, existing.workspaceId);
                if (!hasWorkspaceAccess) {
                    results.push({ id, success: false, error: "Access denied" });
                    continue;
                }

                const hasProjectAccess = await canAccessProjectResource(user.id, existing.workspaceId, existing.projectId);
                if (!hasProjectAccess) {
                    results.push({ id, success: false, error: "Access denied to this project" });
                    continue;
                }

                const updated = await prisma.task.update({
                    where: { id },
                    data: {
                        ...(data.startDate !== undefined ? { startDate: data.startDate ? new Date(data.startDate) : null } : {}),
                        ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
                        ...(data.title !== undefined ? { title: data.title } : {}),
                        ...(data.status !== undefined ? { status: data.status } : {}),
                        ...(data.priority !== undefined ? { priority: data.priority } : {}),
                        ...(data.progress !== undefined ? { progress: data.progress } : {}),
                        ...(data.isMilestone !== undefined ? { isMilestone: data.isMilestone } : {}),
                        ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
                        ...(data.schedulingMode !== undefined ? { schedulingMode: data.schedulingMode } : {}),
                        ...(data.order !== undefined ? { order: data.order } : {}),
                    },
                });

                const workspaceChannel = getWorkspaceChannel(updated.workspaceId);
                const sideEffects: Promise<unknown>[] = [
                    publishToChannel(workspaceChannel, "task:updated", updated),
                ];
                if (existing.boardId) {
                    sideEffects.push(publishToChannel(getBoardChannel(updated.workspaceId, existing.boardId), "task:updated", updated));
                }
                sideEffects.push(publishToChannel(getTaskChannel(updated.workspaceId, updated.id), "task:updated", updated));
                await Promise.all(sideEffects);

                results.push({ id, success: true });
            } catch (err: any) {
                results.push({ id: update.id || "", success: false, error: err.message });
            }
        }

        return NextResponse.json({ results });
    } catch (error) {
        console.error("Batch update error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
