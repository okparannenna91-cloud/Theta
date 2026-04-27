
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createIvnoPayment } from "@/lib/ivno";
import { buildIvnoOrderId } from "@/lib/ivno-billing";
import { BILLING_PLANS, BillingInterval, getPlanPrice } from "@/lib/billing-plans";

// Build a lookup by planKey so we can accept planId = planKey from the frontend
const PLAN_BY_KEY = BILLING_PLANS.reduce<Record<string, typeof BILLING_PLANS[0]>>(
    (acc, plan) => { acc[plan.planKey] = plan; return acc; }, {}
);

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { planId, interval = "monthly", workspaceId } = body as {
            planId: string;
            interval: BillingInterval;
            workspaceId: string;
        };

        if (!planId || !workspaceId) {
            return NextResponse.json({ error: "planId and workspaceId are required" }, { status: 400 });
        }

        // Accept planId as either plan.id (e.g. "growth-monthly") or plan.planKey (e.g. "growth")
        const plan =
            PLAN_BY_KEY[planId] ??
            BILLING_PLANS.find((p) => p.id === planId);

        if (!plan) {
            return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
        }

        // Count active members for dynamic billing
        const { prisma } = await import("@/lib/prisma");
        const activeMemberCount = await prisma.workspaceMember.count({
            where: { 
                workspaceId: workspaceId,
                status: "active"
            }
        });

        // Get correct price in USD (Ivno processes in USD)
        const amountCents = getPlanPrice(plan.id, interval, activeMemberCount, "USD");
        if (amountCents === 0 && plan.planKey !== "free") {
            return NextResponse.json({ error: "Invalid price for plan" }, { status: 400 });
        }
        // Ivno expects USD amount (dollars, not cents)
        const amount = amountCents / 100;

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const webhookUrl = `${baseUrl}/api/webhooks/ivno`;
        const returnUrl = `${baseUrl}/dashboard/billing?payment=success`;

        // Build the order ID using the dot-delimited format to avoid underscore conflicts
        const orderId = buildIvnoOrderId(
            workspaceId,
            plan.planKey,
            plan.mode === "one_time" ? "lifetime" : effectiveInterval
        );

        const paymentData = {
            amount,
            currency: "USD",
            order_id: orderId,
            description: `Theta PM — ${plan.name} Plan${plan.mode === "subscription" ? ` (${effectiveInterval})` : ""}`,
            return_url: returnUrl,
            webhook_url: webhookUrl,
            email: user.email!,
            domain: new URL(baseUrl).hostname,
        };

        const response = await createIvnoPayment(paymentData);

        if (response.payment_url) {
            return NextResponse.json({ url: response.payment_url });
        } else {
            return NextResponse.json({ error: "Failed to initialize Ivno payment — no payment_url returned" }, { status: 500 });
        }
    } catch (error: any) {
        console.error("[Ivno] Initialization Error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
