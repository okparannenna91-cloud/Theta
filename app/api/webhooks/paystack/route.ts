import { NextResponse } from "next/server";
import { webhookService } from "@/lib/billing/services/webhook-service";
import { registerProviders } from "@/lib/billing/providers/register";
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
    return NextResponse.json({ received: true, error: error.message });
  }
}
