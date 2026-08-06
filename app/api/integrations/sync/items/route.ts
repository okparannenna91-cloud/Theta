import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { listSyncedItems } from "@/lib/services/sync";

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get("workspaceId");
        const provider = searchParams.get("provider");

        if (!workspaceId || !provider) {
            return NextResponse.json({ error: "Missing workspaceId or provider" }, { status: 400 });
        }

        const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const items = await listSyncedItems(workspaceId, provider);
        return NextResponse.json({ items });
    } catch (error) {
        console.error("List synced items error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
