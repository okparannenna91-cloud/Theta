import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { billingOrchestrator } from "@/lib/billing/orchestrator";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { workspaceId, planId, interval, currency, memberCount } = body as {
      workspaceId: string;
      planId: string;
      interval: "monthly" | "annual";
      currency: string;
      memberCount?: number;
    };

    if (!workspaceId || !planId || !interval) {
      return NextResponse.json({ error: "workspaceId, planId, and interval are required" }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const resolvedMemberCount = memberCount ?? 0;

    const result = await billingOrchestrator.createCheckout({
      workspaceId,
      planId,
      interval,
      currency: currency ?? "USD",
      userId: user.id,
      userEmail: user.email,
      memberCount: resolvedMemberCount,
      successUrl: `${baseUrl}/dashboard/billing?payment=success`,
      cancelUrl: `${baseUrl}/dashboard/billing?payment=cancelled`,
    });

    return NextResponse.json({ url: result.url, sessionId: result.sessionId });
  } catch (error: any) {
    logger.error("[Checkout] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
