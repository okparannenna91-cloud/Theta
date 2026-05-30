import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { getEventCounts } from "@/lib/analytics-api";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const event = searchParams.get("event");
    const since = searchParams.get("since") || "-30d";

    if (!workspaceId || !event) {
      return NextResponse.json(
        { error: "workspaceId and event are required" },
        { status: 400 }
      );
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const insight = await getEventCounts(event, since);

    if (!insight) {
      return NextResponse.json({
        event,
        points: [],
        total: 0,
        average: 0,
      });
    }

    const total = insight.count;
    const points = insight.trend;
    const average = points.length > 0 ? Math.round(total / points.length) : 0;

    return NextResponse.json({ event, points, total, average });
  } catch (error) {
    console.error("[PostHog Chart API]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
