import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { importSyncedItem, CONTAINER_TYPES, WORK_ITEM_TYPES } from "@/lib/services/sync";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { itemId, projectId, boardId } = body;

        if (!itemId) {
            return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
        }

        const item = await prisma.syncedItem.findUnique({ where: { id: itemId } });
        if (!item) {
            return NextResponse.json({ error: "Synced item not found" }, { status: 404 });
        }

        if (!WORK_ITEM_TYPES.includes(item.type)) {
            return NextResponse.json(
                { error: "This item is a container or catalog item — it cannot be imported as a task." },
                { status: 400 },
            );
        }

        const hasAccess = await verifyWorkspaceAccess(user.id, item.workspaceId);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // When the item's parent container is linked to a project, resolve the
        // project automatically unless the caller supplied one explicitly.
        let targetProjectId = projectId;
        if (!targetProjectId) {
            const parentId = (item.extra as any)?.parentId as string | undefined;
            if (parentId) {
                const container = await prisma.syncedItem.findFirst({
                    where: {
                        workspaceId: item.workspaceId,
                        provider: item.provider,
                        externalId: parentId,
                        type: { in: CONTAINER_TYPES },
                    },
                });
                const linked = (container?.extra as any)?.linkedProjectId as string | undefined;
                if (linked) targetProjectId = linked;
            }
        }

        if (!targetProjectId) {
            return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
        }

        const project = await prisma.project.findUnique({ where: { id: targetProjectId } });
        if (!project || project.workspaceId !== item.workspaceId) {
            return NextResponse.json({ error: "Project not found in this workspace" }, { status: 400 });
        }

        const result = await importSyncedItem(itemId, user.id, targetProjectId, boardId);
        return NextResponse.json(result, { status: result.alreadyImported ? 200 : 201 });
    } catch (error: any) {
        console.error("Import synced item error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
