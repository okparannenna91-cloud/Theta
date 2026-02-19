
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get("workspaceId");

        if (!workspaceId) {
            return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
        }

        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: {
                id: true,
                name: true,
                plan: true,
                billingInterval: true,
                billingStatus: true,
                billingProvider: true,
                nextBillingDate: true,
                currency: true,
                updatedAt: true
            }
        });

        if (!workspace) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        return NextResponse.json({
            workspace,
            status: workspace.billingStatus || "active", // Default to active for free plans
            isFastSpringConfigured: !!process.env.FASTSPRING_HMAC_KEY,
            updatedAt: workspace.updatedAt
        });
    } catch (error: any) {
        console.error("Subscription API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
