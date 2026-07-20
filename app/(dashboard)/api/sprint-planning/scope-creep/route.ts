import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { SprintPlanning } from "@/lib/nova/sprint-planning";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sprintId } = body;
    if (!sprintId) {
      return NextResponse.json(
        { error: "sprintId is required" },
        { status: 400 }
      );
    }

    const detection = await SprintPlanning.detectScopeCreep(sprintId);
    return NextResponse.json(detection);
  } catch (error) {
    console.error("Scope creep detection error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
