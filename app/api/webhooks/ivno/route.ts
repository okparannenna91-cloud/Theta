
import crypto from "crypto";
import { NextResponse } from "next/server";
import {
    handleSuccessfulIvnoPayment,
    handleFailedIvnoPayment,
} from "@/lib/ivno-billing";

export async function POST(req: Request) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get("x-ivno-signature-256") || req.headers.get("x-signature-256") || "";
        const secret = process.env.IVNO_WEBHOOK_SECRET;
        if (secret) {
            if (!signature) {
                console.error("[Ivno] Webhook rejected: missing signature header");
                return NextResponse.json({ error: "Missing signature" }, { status: 401 });
            }
            const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
            const actual = signature.startsWith("sha256=") ? signature.slice(7) : signature;
            const expectedBuf = Buffer.from(expected);
            const actualBuf = Buffer.from(actual);
            if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
                console.error("[Ivno] Webhook rejected: invalid signature");
                return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
            }
        } else {
            console.warn("[Ivno] IVNO_WEBHOOK_SECRET not set — signature verification disabled");
        }

        const body = JSON.parse(rawBody);
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

        const parsedAmount = typeof amount === "string" ? parseFloat(amount) || 0 : (amount ?? 0);
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
