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
        const hours = parseInt(searchParams.get("hours") || "24", 10);

        if (!workspaceId) {
            return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
        }

        const since = new Date(Date.now() - hours * 60 * 60 * 1000);

        const events = await prisma.activity.findMany({
            where: {
                workspaceId,
                entityType: "AI_STREAM",
                action: "STREAM_EVENT",
                createdAt: { gte: since },
            },
            orderBy: { createdAt: "desc" },
            take: 500,
        });

        const totals: Record<string, number> = {};
        for (const event of events) {
            const eventType = (event.metadata as any)?.eventType || "unknown";
            totals[eventType] = (totals[eventType] || 0) + 1;
        }

        totals.total = events.length;

        return NextResponse.json({
            period: { hours, since: since.toISOString() },
            totals,
            recent: events.slice(0, 50).map((e) => ({
                id: e.id,
                eventType: (e.metadata as any)?.eventType,
                userId: e.userId,
                createdAt: e.createdAt,
                metadata: e.metadata,
            })),
        });
    } catch (error: any) {
        console.error("AI Monitoring GET error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
