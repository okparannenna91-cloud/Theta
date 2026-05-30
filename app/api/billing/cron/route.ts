
import { NextResponse } from "next/server";
import { runPaystackBillingCron } from "@/lib/paystack-billing";

export async function GET(req: Request) {
    // Basic security: Check for a secret key in the headers or query params
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        console.log("Starting Paystack billing cron...");
        await runPaystackBillingCron();
        return NextResponse.json({ success: true, message: "Billing cron completed" });
    } catch (error: any) {
        console.error("Billing cron failed:", error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
