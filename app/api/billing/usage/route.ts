import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUsageStats } from "@/lib/usage-tracking";
import { verifyWorkspaceAccess } from "@/lib/workspace";

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get("workspaceId");

        if (!workspaceId) {
            return NextResponse.json(
                { error: "workspaceId is required" },
                { status: 400 }
            );
        }

        // Verify workspace access
        const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
        if (!hasAccess) {
            return NextResponse.json(
                { error: "Access denied to workspace" },
                { status: 403 }
            );
        }

        const usage = await getUsageStats(workspaceId);

        return NextResponse.json(usage);
    } catch (error) {
        console.error("Usage API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
