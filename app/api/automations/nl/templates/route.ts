import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAutomationTemplates } from "@/lib/services/nl-automation";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = getAutomationTemplates();
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Automation templates error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
