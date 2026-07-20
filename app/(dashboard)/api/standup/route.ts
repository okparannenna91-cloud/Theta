import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { StandupReports } from "@/lib/nova/standup-reports";
import { redis } from "@/lib/redis/client";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, workspaceId, period } = body;
    if (!userId || !workspaceId) {
      return NextResponse.json(
        { error: "userId and workspaceId are required" },
        { status: 400 }
      );
    }

    const access = await verifyWorkspaceAccess(workspaceId, user.id);
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const standup = await StandupReports.generateStandup(
      userId,
      workspaceId,
      period
    );
    return NextResponse.json(standup);
  } catch (error) {
    console.error("Standup generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const userId = searchParams.get("userId");
    const date = searchParams.get("date");
    if (!workspaceId || !userId) {
      return NextResponse.json(
        { error: "workspaceId and userId are required" },
        { status: 400 }
      );
    }

    const access = await verifyWorkspaceAccess(workspaceId, user.id);
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const standupDate = date || new Date().toISOString().split("T")[0];
    const cacheKey = `standup:${workspaceId}:${userId}:${standupDate}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    return NextResponse.json(
      { error: "No standup found for this date" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Standup retrieval error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
