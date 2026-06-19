import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { telemetry } from "@/lib/nova/telemetry";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get("workspaceId");
        const hours = parseInt(searchParams.get("hours") || "24", 10);

        if (!workspaceId) {
            return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
        }

        const start = Date.now();
        const dashboard = await telemetry.getDashboard(workspaceId, hours);
        const queryTime = Date.now() - start;

        return NextResponse.json({
            ...dashboard,
            queryTimeMs: queryTime,
        });
    } catch (error: any) {
        logger.error("Nova analytics error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
