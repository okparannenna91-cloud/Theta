import { NextResponse } from "next/server";
import { webhookService } from "@/lib/billing/services/webhook-service";
import { providerRegistry } from "@/lib/billing/providers/registry";
import { registerProviders } from "@/lib/billing/providers/register";
import { logger } from "@/lib/logger";

registerProviders();

export async function POST(req: Request) {
  try {
    const provider = req.headers.get("x-billing-provider") || "";
    const signature = req.headers.get("x-webhook-signature") || "";
    const rawBody = await req.text();

    if (!provider) {
      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("json")) {
        const body = JSON.parse(rawBody);
        const verifHash = req.headers.get("verif-hash") || "";
        const detectedProvider = detectProviderFromPayload(body, verifHash);
        if (!detectedProvider) {
          logger.warn("[Webhook] Could not detect provider from payload");
          return NextResponse.json({ received: true, warning: "Unknown provider" });
        }

        const sigHeader = verifHash
          ? "flutterwave"
          : req.headers.get("x-paystack-signature")
            ? "paystack"
            : req.headers.get("x-ivno-signature-256") || req.headers.get("x-signature-256")
              ? "ivno"
              : "";
        const signature = verifHash
          ? verifHash
          : req.headers.get("x-paystack-signature") || req.headers.get("x-ivno-signature-256") || req.headers.get("x-signature-256") || "";
        await webhookService.processEvent(detectedProvider, rawBody, signature);
        return NextResponse.json({ received: true });
      }

      return NextResponse.json({ error: "x-billing-provider header is required" }, { status: 400 });
    }

    await webhookService.processEvent(provider, rawBody, signature);
    return NextResponse.json({ received: true });
  } catch (error: any) {
    logger.error("[Webhook] Error:", error);
    return NextResponse.json({ received: true, error: error.message });
  }
}

export async function GET() {
  return NextResponse.json({ message: "Webhook endpoint active", providers: providerRegistry.getAll().map((p) => ({ id: p.id, name: p.name, currencies: p.currencies })) });
}

function detectProviderFromPayload(body: any, verifHash: string): string | null {
  if (verifHash) {
    return "flutterwave";
  }

  if (body.event && body.data) {
    if (body.data?.flw_ref) {
      return "flutterwave";
    }
    if (body.event.startsWith("charge.") || body.event.startsWith("subscription.") || body.event.startsWith("customer.") || body.event.startsWith("refund.") || body.event.startsWith("transfer.")) {
      return "paystack";
    }
  }
  if (body.order_id || body.transaction_id) {
    if (body.status === "completed" || body.status === "pending" || body.status === "failed" || body.status === "expired") {
      return "ivno";
    }
  }
  return null;
}
