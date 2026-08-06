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

        if (!itemId) {
            return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
        }

        const item = await prisma.syncedItem.findUnique({ where: { id: itemId } });
        if (!item) {
            return NextResponse.json({ error: "Synced item not found" }, { status: 404 });
        }

        if (item.type === "repo") {
            return NextResponse.json(
                { error: "Repositories are linked to projects, not imported as tasks." },
                { status: 400 },
            );
        }

        const hasAccess = await verifyWorkspaceAccess(user.id, item.workspaceId);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // When the issue's repo is linked to a project, resolve the project
        // automatically unless the caller supplied one explicitly.
        let targetProjectId = projectId;
        if (!targetProjectId && item.provider === "github" && item.type === "issue") {
            const repoFullName = (item.extra as any)?.repo as string | undefined;
            if (repoFullName) {
                const repoItems = await prisma.syncedItem.findMany({
                    where: { workspaceId: item.workspaceId, type: "repo" },
                });
                const repoItem = repoItems.find((r) => r.title === repoFullName);
                const linked = (repoItem?.extra as any)?.linkedProjectId as string | undefined;
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
