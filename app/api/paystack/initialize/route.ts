import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { paystack } from "@/lib/paystack";
import { BILLING_PLAN_LOOKUP, BillingInterval, getPlanPrice, Currency } from "@/lib/billing-plans";

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { planId, interval = "monthly", currency = "NGN", workspaceId } = body as {
            planId: string;
            interval: BillingInterval;
            currency: Currency;
            workspaceId: string;
        };

        if (!planId || !workspaceId) {
            return NextResponse.json({ error: "planId and workspaceId are required" }, { status: 400 });
        }

        const plan = BILLING_PLAN_LOOKUP[planId];
        if (!plan) {
            return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
        }

        // Get correct price based on currency and interval (Dynamically if NGN)
        const { getPlanPriceDynamic } = await import("@/lib/billing-plans");
        const amount = await getPlanPriceDynamic(plan.id, interval, currency);

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        // Paystack Plan Support: If it's a subscription, we might want to link it to a Paystack Plan
        // However, user guidance said "Triggers recurring charges" implying we handle recursion.
        // So we just charge and store the auth code.

        const metadata = {
            planId: plan.id,
            planKey: plan.planKey,
            userId: user.clerkId,
            dbUserId: user.id,
            workspaceId: workspaceId,
            interval: plan.mode === "one_time" ? "lifetime" : interval,
            currency: currency
        };

        const response = await paystack.initializeTransaction({
            email: user.email,
            amount: amount,
            currency: currency,
            metadata,
            callback_url: `${baseUrl}/dashboard/billing?payment=success`,
        });

        if (response.status && response.data.authorization_url) {
            return NextResponse.json({ url: response.data.authorization_url });
        } else {
            return NextResponse.json({ error: "Failed to initialize payment" }, { status: 500 });
        }
    } catch (error: any) {
        console.error("Paystack Initialization Error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
