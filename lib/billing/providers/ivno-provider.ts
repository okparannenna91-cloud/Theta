import crypto from "crypto";
import { createIvnoPayment } from "@/lib/ivno";
import { buildIvnoOrderId } from "@/lib/ivno-utils";
import { BillingProvider, CustomerResult, CheckoutParams, CheckoutResult, PaymentIntentParams, PaymentIntentResult, SubscriptionParams, SubscriptionResult, SubscriptionData, ChargeParams, ChargeResult, RefundResult, PaymentMethodData, InvoiceParams, InvoiceResult, WebhookEvent } from "../billing-provider.interface";
import { Currency } from "../types";
import { ProviderNotSupportedError } from "../errors";
import { logger } from "@/lib/logger";

export class IvnoProvider implements BillingProvider {
  readonly id = "ivno";
  readonly name = "Ivno";
  readonly currencies: Currency[] = ["USD", "EUR", "GBP"];
  readonly capabilities = ["payment_intents", "checkout_sessions", "webhooks"] as const;

  async createCustomer(email: string, name?: string, metadata?: Record<string, string>): Promise<CustomerResult> {
    return { id: `ivno_${metadata?.workspaceId ?? crypto.createHash("sha256").update(email).digest("hex").slice(0, 12)}`, email, name, metadata };
  }

  async getCustomer(customerId: string): Promise<CustomerResult> {
    return { id: customerId, email: "" };
  }

  async updateCustomer(customerId: string, data: Partial<{ email: string; name: string; metadata: Record<string, string> }>): Promise<void> {
    return;
  }

  async createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult> {
    const lineItem = params.lineItems[0];
    if (!lineItem) throw new Error("No line items provided");

    const workspaceId = params.metadata?.workspaceId ?? "unknown";
    const planKey = lineItem.planKey ?? "unknown";
    const interval = lineItem.interval ?? "monthly";

    const orderId = await buildIvnoOrderId(workspaceId, planKey, interval);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const response = await createIvnoPayment({
      amount: lineItem.amount / 100,
      currency: lineItem.currency,
      order_id: orderId,
      description: lineItem.description,
      return_url: params.successUrl,
      webhook_url: `${baseUrl}/api/webhooks/billing`,
      email: params.customerEmail,
      domain: baseUrl,
    });

    return { url: response.payment_url, sessionId: response.transaction_id };
  }

  async createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntentResult> {
    const orderId = `pi_${crypto.createHash("sha256").update(`${params.customerId}_${Date.now()}`).digest("hex").slice(0, 16)}`;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const response = await createIvnoPayment({
      amount: params.amount / 100,
      currency: params.currency,
      order_id: orderId,
      description: params.description ?? "Theta payment",
      return_url: `${baseUrl}/dashboard/billing?payment=success`,
      webhook_url: `${baseUrl}/api/webhooks/billing`,
      email: params.customerId,
      domain: baseUrl,
    });

    return { id: response.transaction_id, status: "pending", clientSecret: response.payment_url };
  }

  async createSubscription(customerId: string, params: SubscriptionParams): Promise<SubscriptionResult> {
    throw new ProviderNotSupportedError("ivno", "createSubscription");
  }

  async updateSubscription(subscriptionId: string, params: Partial<SubscriptionParams>): Promise<SubscriptionResult> {
    throw new ProviderNotSupportedError("ivno", "updateSubscription");
  }

  async cancelSubscription(subscriptionId: string, options?: { cancelAtPeriodEnd?: boolean }): Promise<void> {
    return;
  }

  async retrieveSubscription(subscriptionId: string): Promise<SubscriptionData> {
    throw new ProviderNotSupportedError("ivno", "retrieveSubscription");
  }

  async chargeCustomer(customerId: string, amount: number, currency: string, params?: ChargeParams): Promise<ChargeResult> {
    const orderId = `chg_${crypto.createHash("sha256").update(`${customerId}_${Date.now()}`).digest("hex").slice(0, 12)}`;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const response = await createIvnoPayment({
      amount: amount / 100,
      currency,
      order_id: orderId,
      description: params?.description ?? "Theta recurring charge",
      return_url: `${baseUrl}/dashboard/billing`,
      webhook_url: `${baseUrl}/api/webhooks/billing`,
      email: customerId,
      domain: baseUrl,
    });

    return {
      id: response.transaction_id,
      status: "pending",
      amount,
      currency,
      paid: false,
      refunded: false,
      customerId,
    };
  }

  async refundPayment(chargeId: string, amount?: number): Promise<RefundResult> {
    logger.warn(`[Ivno] Refund requested for ${chargeId} — manual processing required`);
    return { id: chargeId, status: "pending", amount: amount ?? 0, currency: "USD" };
  }

  async listPaymentMethods(customerId: string): Promise<PaymentMethodData[]> {
    return [];
  }

  async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    return;
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    return;
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    return;
  }

  async verifyWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean> {
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    const actual = signature.startsWith("sha256=") ? signature.slice(7) : signature;
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
    } catch {
      return false;
    }
  }

  async parseWebhookEvent(payload: string): Promise<WebhookEvent> {
    const body = JSON.parse(payload);
    const eventType = this.mapIvnoEvent(body.status);
    return {
      id: body.order_id ?? body.transaction_id ?? `ivno_${Date.now()}`,
      type: eventType,
      rawType: body.status ?? "unknown",
      data: body,
      created: Date.now(),
    };
  }

  async createInvoice(params: InvoiceParams): Promise<InvoiceResult> {
    return { id: `ivno_inv_${Date.now()}`, number: `INV-IVNO-${Date.now()}`, status: "pending", total: params.lineItems.reduce((s, i) => s + i.amount, 0), currency: params.currency };
  }

  async finalizeInvoice(invoiceId: string): Promise<void> {
    return;
  }

  async voidInvoice(invoiceId: string): Promise<void> {
    return;
  }

  private mapIvnoEvent(status: string): any {
    const mapping: Record<string, any> = {
      "completed": "payment.succeeded",
      "pending": "subscription.updated",
      "failed": "payment.failed",
      "expired": "payment.failed",
    };
    return mapping[status] ?? "subscription.updated";
  }
}
