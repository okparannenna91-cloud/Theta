import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get("workspaceId");

        if (!workspaceId) {
            return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
        }

        const prisma = getPrismaClient(workspaceId);

        // Fetch all integrations for this workspace
        const [integrations, workspace] = await Promise.all([
            prisma.integration.findMany({
                where: { workspaceId },
                orderBy: { createdAt: "desc" },
            }),
            prisma.workspace.findUnique({
                where: { id: workspaceId },
                select: { plan: true }
            })
        ]);

        if (!workspace) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        const { getPlanLimits } = await import("@/lib/plan-limits");
        const limits = getPlanLimits(workspace.plan as any);

        // We only return provider name, updatedAt, and basic config. 
        // We NEVER return accessToken or refreshToken to the frontend.
        const safeIntegrations = integrations.map(int => ({
            id: int.id,
            type: int.type,
            // @ts-ignore
            provider: int.provider,
            updatedAt: int.updatedAt,
            config: int.config,
        }));

        return NextResponse.json({
            integrations: safeIntegrations,
            limits: {
                max: limits.maxIntegrations,
                current: safeIntegrations.length,
                hasAccess: limits.hasIntegrations
            }
        });
    } catch (error) {
        console.error("List integrations error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

/**
 * Delete an integration
 */
export async function DELETE(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const integrationId = searchParams.get("id");
        const workspaceId = searchParams.get("workspaceId");

        if (!integrationId || !workspaceId) {
            return NextResponse.json({ error: "Missing integrationId or workspaceId" }, { status: 400 });
        }

        const prisma = getPrismaClient(workspaceId);

        await prisma.integration.delete({
            where: { id: integrationId, workspaceId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete integration error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
