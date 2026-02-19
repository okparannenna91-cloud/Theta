import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCheckoutClient } from "@/lib/checkout";
import { BILLING_PLAN_LOOKUP } from "@/lib/billing-plans";

type SessionRequest = {
  planId?: string;
};

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Safety check for secret key before proceeding
    if (!process.env.CHECKOUT_SECRET_KEY) {
      console.error("CRITICAL: CHECKOUT_SECRET_KEY is missing in environment");
      return NextResponse.json({ error: "Payment system unavailable" }, { status: 503 });
    }

    const { planId } = await req.json();
    if (!planId) {
      return NextResponse.json({ error: "planId is required" }, { status: 400 });
    }

    const plan = BILLING_PLAN_LOOKUP[planId];
    if (!plan) {
      return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
    }

    const checkout = getCheckoutClient();
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const amount = plan.currency === "NGN" ? plan.priceMonthlyNGN : plan.priceMonthlyUSD;

    const session: any = await checkout.sessions.request({
      amount,
      currency: plan.currency,
      reference: `theta_${plan.id}_${Date.now()}`,
      payment_type: plan.mode === "subscription" ? "Recurring" : "Regular",
      success_url: `${baseUrl}/dashboard?success=true`,
      failure_url: `${baseUrl}/dashboard?success=false`,
      cancel_url: `${baseUrl}/dashboard?canceled=true`,
      customer: {
        email: user.email,
        name: user.name || undefined,
      },
      billing_descriptor: {
        name: "THETA",
      },
      metadata: {
        planId: plan.id,
        mode: plan.mode,
        userId: user.clerkId || user.id,
      },
      display_items: [
        {
          name: plan.name,
          amount,
          quantity: 1,
        },
      ],
    });

    const redirectUrl = session?._links?.redirect?.href;

    if (!redirectUrl) {
      console.error("No redirect URL in session response:", JSON.stringify(session));
      return NextResponse.json(
        { error: "Failed to create Checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ redirectUrl });
  } catch (error) {
    console.error("Checkout session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


