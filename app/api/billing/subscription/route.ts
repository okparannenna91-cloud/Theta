import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { differenceInDays } from "date-fns";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        plan: true,
        billingInterval: true,
        subscriptionStatus: true,
        billingStatus: true,
        billingProvider: true,
        nextBillingDate: true,
        currency: true,
        trialEndsAt: true,
        trialStartedAt: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        canceledAt: true,
        dunningLevel: true,
        retryCount: true,
        updatedAt: true,
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const status = workspace.subscriptionStatus || workspace.billingStatus || "active";
    const now = new Date();
    const trialDaysRemaining = workspace.trialEndsAt
      ? Math.max(0, differenceInDays(workspace.trialEndsAt, now))
      : 0;

    return NextResponse.json({
      workspace: {
        ...workspace,
        subscriptionStatus: status,
        trialDaysRemaining,
      },
      status,
      trialDaysRemaining,
      isIvnoConfigured: !!(process.env.IVNO_API_KEY && process.env.IVNO_API_SECRET),
      isPaystackConfigured: !!(process.env.PAYSTACK_SECRET_KEY && process.env.PAYSTACK_PUBLIC_KEY),
      updatedAt: workspace.updatedAt,
    });
  } catch (error: any) {
    logger.error("Subscription API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
