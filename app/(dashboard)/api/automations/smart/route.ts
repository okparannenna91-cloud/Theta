import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { SmartAutomation } from "@/lib/nova/smart-automation";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId, command } = body;
    if (!workspaceId || !command) {
      return NextResponse.json(
        { error: "workspaceId and command are required" },
        { status: 400 }
      );
    }

    const access = await verifyWorkspaceAccess(workspaceId, user.id);
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rule = await SmartAutomation.parseNLToRule(command);
    return NextResponse.json(rule);
  } catch (error) {
    console.error("Smart automation parse error:", error);
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
    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    const access = await verifyWorkspaceAccess(workspaceId, user.id);
    if (!access) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rules = await SmartAutomation.getSuggestedRules(workspaceId);
    return NextResponse.json(rules);
  } catch (error) {
    console.error("Smart automation suggestions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
