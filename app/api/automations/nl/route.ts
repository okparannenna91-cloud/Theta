import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { createAutomationFromNL } from "@/lib/services/nl-automation";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { input, workspaceId } = body;

    if (!input || typeof input !== "string" || !input.trim()) {
      return NextResponse.json({ error: "input is required" }, { status: 400 });
    }

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const result = await createAutomationFromNL(input, workspaceId, user.id);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("NL automation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
