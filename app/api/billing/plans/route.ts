import { NextResponse } from "next/server";
import { BILLING_PLANS } from "@/lib/billing-plans";
import { PLAN_LIMITS } from "@/lib/plan-limits";

export async function GET() {
    try {
        const plans = BILLING_PLANS.map(plan => ({
            name: plan.planKey,
            displayName: plan.name,
            price: {
                monthly: plan.priceMonthlyUSD / 100,
                yearly: Math.floor(plan.priceAnnualUSD / 12 / 100),
            },
            limits: PLAN_LIMITS[plan.planKey],
            features: plan.features,
            popular: plan.planKey === "pro",
        }));

        return NextResponse.json({ plans });
    } catch (error) {
        console.error("Plans API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
