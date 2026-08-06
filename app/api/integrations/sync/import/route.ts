import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { importSyncedItem } from "@/lib/services/sync";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { itemId, projectId, boardId } = body;

        if (!itemId || !projectId) {
            return NextResponse.json({ error: "Missing itemId or projectId" }, { status: 400 });
        }

        const item = await prisma.syncedItem.findUnique({ where: { id: itemId } });
        if (!item) {
            return NextResponse.json({ error: "Synced item not found" }, { status: 404 });
        }

        const hasAccess = await verifyWorkspaceAccess(user.id, item.workspaceId);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project || project.workspaceId !== item.workspaceId) {
            return NextResponse.json({ error: "Project not found in this workspace" }, { status: 400 });
        }

        const result = await importSyncedItem(itemId, user.id, projectId, boardId);
        return NextResponse.json(result, { status: result.alreadyImported ? 200 : 201 });
    } catch (error: any) {
        console.error("Import synced item error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
