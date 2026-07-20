import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { previewAutomation, type ParsedAutomationRule } from "@/lib/services/nl-automation";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { rule } = body;

    if (!rule || typeof rule !== "object") {
      return NextResponse.json({ error: "rule is required" }, { status: 400 });
    }

    const preview = previewAutomation(rule as ParsedAutomationRule);
    return NextResponse.json({ preview });
  } catch (error) {
    console.error("Automation preview error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
