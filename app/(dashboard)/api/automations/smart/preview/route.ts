import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { SmartAutomation } from "@/lib/nova/smart-automation";
import type { AutomationRule } from "@/lib/nova/smart-automation";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { rule } = body;
    if (!rule) {
      return NextResponse.json(
        { error: "rule is required" },
        { status: 400 }
      );
    }

    const preview = await SmartAutomation.previewRule(rule as AutomationRule);
    return NextResponse.json(preview);
  } catch (error) {
    console.error("Smart automation preview error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
