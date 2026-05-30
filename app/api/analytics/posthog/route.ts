import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import {
  getWorkspaceMetrics,
  getTopEvents,
  getActiveUsers,
} from "@/lib/analytics-api";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const since = searchParams.get("since") || "-30d";

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const isConfigured = !!(process.env.POSTHOG_PERSONAL_API_KEY && process.env.POSTHOG_PROJECT_ID);

    if (!isConfigured) {
      return NextResponse.json({
        configured: false,
        message: "PostHog analytics API not configured. Set POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID env vars.",
        metrics: null,
        topEvents: null,
        activeUsers: null,
      });
    }

    const [metrics, topEvents, activeUsers] = await Promise.all([
      getWorkspaceMetrics(workspaceId, since),
      getTopEvents(since, 10),
      getActiveUsers(since),
    ]);

    return NextResponse.json({
      configured: true,
      metrics,
      topEvents,
      activeUsers,
    });
  } catch (error) {
    console.error("[PostHog Analytics API]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
