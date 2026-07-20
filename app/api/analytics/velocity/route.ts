import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { getVelocityChart } from "@/lib/analytics/task-analytics";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const weeks = parseInt(searchParams.get("weeks") || "12", 10);

    if (!workspaceId) return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });

    const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!hasAccess) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const data = await getVelocityChart(workspaceId, weeks);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Velocity API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
