import { NextResponse } from "next/server";
import { webhookService } from "@/lib/billing/services/webhook-service";
import { registerProviders } from "@/lib/billing/providers/register";
import { WebhookSignatureError } from "@/lib/billing/errors";
import { logger } from "@/lib/logger";

registerProviders();

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature") || "";

    await webhookService.processEvent("paystack", rawBody, signature);

    return NextResponse.json({ received: true });
  } catch (error: any) {
    logger.error("[Paystack Webhook] Error:", error);
    if (error instanceof WebhookSignatureError) {
      return NextResponse.json({ received: false, error: "Invalid signature" }, { status: 401 });
    }
    return NextResponse.json({ received: false, error: "Webhook processing failed" }, { status: 500 });
  }
}
