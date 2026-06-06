
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";
import { logger } from "@/lib/logger";

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

        const db = getPrismaClient(workspaceId);
        const workspace = await db.workspace.findUnique({
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
            isIvnoConfigured: !!(process.env.IVNO_API_KEY && process.env.IVNO_API_SECRET),
            isPaystackConfigured: !!(process.env.PAYSTACK_SECRET_KEY && process.env.PAYSTACK_PUBLIC_KEY),
            updatedAt: workspace.updatedAt
        });
    } catch (error: any) {
        logger.error("Subscription API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
