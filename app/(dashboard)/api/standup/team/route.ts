import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { StandupReports } from "@/lib/nova/standup-reports";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { teamId, workspaceId } = body;
    if (!teamId || !workspaceId) {
      return NextResponse.json(
        { error: "teamId and workspaceId are required" },
        { status: 400 }
      );
    }

    const access = await verifyWorkspaceAccess(workspaceId, user.id);
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const standup = await StandupReports.generateTeamStandup(
      teamId,
      workspaceId
    );
    return NextResponse.json(standup);
  } catch (error) {
    console.error("Team standup generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
