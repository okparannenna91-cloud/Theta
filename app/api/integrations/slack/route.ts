import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserWorkspaces } from "@/lib/workspace";
import { getSlackAuthUrl } from "@/lib/integrations/slack";

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.redirect(new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
        }

        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get("workspaceId");

        if (!workspaceId) {
            return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 });
        }

        // Verify user belongs to this workspace
        const workspaces = await getUserWorkspaces(user.id);
        const hasAccess = workspaces.some(w => w.id === workspaceId);

        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied to workspace" }, { status: 403 });
        }

        // Check plan limits for integrations
        try {
            const { prisma } = await import("@/lib/prisma");
            const integrationCount = await prisma.integration.count({
                where: { workspaceId }
            });
            const { enforcePlanLimit } = await import("@/lib/plan-limits");
            await enforcePlanLimit(workspaceId, "integrations", integrationCount);
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        const url = getSlackAuthUrl(workspaceId);
        return NextResponse.redirect(url);
    } catch (error) {
        console.error("Slack integration error:", error);
        return NextResponse.json({ error: "Failed to initiate Slack integration" }, { status: 500 });
    }
}
