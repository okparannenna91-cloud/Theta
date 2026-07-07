import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUsageStats } from "@/lib/usage-tracking";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { getPlanLimits, type PlanName } from "@/lib/plan-limits";

export async function GET(req: Request) {
    let workspaceId: string | null = null;
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        workspaceId = searchParams.get("workspaceId");

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

        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { plan: true }
        });

        const plan = (workspace?.plan as PlanName) || "free";
        const limits = getPlanLimits(plan);

        return NextResponse.json({
            ...usage,
            maxFileSize: limits.maxFileSize,
        });
    } catch (error: any) {
        console.error("Usage API endpoint error:", {
            message: error.message,
            stack: error.stack,
            workspaceId
        });
        return NextResponse.json(
            { error: "Internal server error", details: error.message },
            { status: 500 }
        );
    }
}
