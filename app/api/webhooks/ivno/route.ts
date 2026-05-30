
import { NextResponse } from "next/server";
import {
    handleSuccessfulIvnoPayment,
    handleFailedIvnoPayment,
} from "@/lib/ivno-billing";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        console.log("[Ivno] Webhook received:", JSON.stringify(body, null, 2));

        const {
            order_id,
            amount,
            status,
            currency,
        }: {
            event?: string;
            transaction_id?: string;
            order_id: string;
            amount: string | number;
            status: string;
            currency?: string;
            txid_out?: string;
            value_coin?: string | number;
        } = body;

        const parsedAmount = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
        const effectiveCurrency = currency || "USD";

        // Security: Only trust the webhook from Ivno — never activate plans from the return_url.
        if (status === "completed") {
            console.log(`[Ivno] Payment completed for order: ${order_id}`);
            await handleSuccessfulIvnoPayment(order_id, parsedAmount, effectiveCurrency, body);
            return NextResponse.json({ success: true, message: "Payment processed and plan activated." });
        }

        if (status === "pending") {
            console.log(`[Ivno] Payment pending for order: ${order_id}`);
            return NextResponse.json({ success: true, message: "Payment pending — awaiting confirmation." });
        }

        if (status === "failed") {
            console.warn(`[Ivno] Payment failed for order: ${order_id}`);
            await handleFailedIvnoPayment(order_id, parsedAmount, effectiveCurrency, body);
            return NextResponse.json({ success: true, message: "Payment failure recorded." });
        }

        // Unknown status — acknowledge receipt and log
        console.warn(`[Ivno] Unknown payment status "${status}" for order: ${order_id}`);
        return NextResponse.json({ success: true, message: `Event received with status: ${status}` });
    } catch (error) {
        console.error("[Ivno] Webhook Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
