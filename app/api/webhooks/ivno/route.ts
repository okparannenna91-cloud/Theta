import { NextResponse } from "next/server";
import { webhookService } from "@/lib/billing/services/webhook-service";
import { registerProviders } from "@/lib/billing/providers/register";
import { logger } from "@/lib/logger";

registerProviders();

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-ivno-signature-256") || req.headers.get("x-signature-256") || "";

    await webhookService.processEvent("ivno", rawBody, signature);

    return NextResponse.json({ received: true });
  } catch (error: any) {
    logger.error("[Ivno Webhook] Error:", error);
    return NextResponse.json({ received: true, error: error.message });
  }
}
