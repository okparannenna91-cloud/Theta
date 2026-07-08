import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { BillingProvider, CustomerResult, CheckoutParams, CheckoutResult, PaymentIntentParams, PaymentIntentResult, SubscriptionParams, SubscriptionResult, SubscriptionData, ChargeParams, ChargeResult, RefundResult, PaymentMethodData, InvoiceParams, InvoiceResult, WebhookEvent } from "../billing-provider.interface";
import { Currency } from "../types";
import { ProviderNotSupportedError } from "../errors";
import { logger } from "@/lib/logger";

const FLW_BASE = "https://api.flutterwave.com/v3";

export class FlutterwaveProvider implements BillingProvider {
  readonly id = "flutterwave";
  readonly name = "Flutterwave";
  readonly currencies: Currency[] = ["USD", "EUR", "GBP"];
  readonly capabilities = ["payment_intents", "checkout_sessions", "refunds", "webhooks"] as const;

  async createCustomer(email: string, name?: string, metadata?: Record<string, string>): Promise<CustomerResult> {
    const response = await flwFetch("/customers", {
      method: "POST",
      body: JSON.stringify({ email, name, ...metadata }),
    });
    return {
      id: response.data.id.toString(),
      email: response.data.email,
      name: response.data.name,
      metadata,
    };
  }

  async getCustomer(customerId: string): Promise<CustomerResult> {
    const response = await flwFetch(`/customers/${customerId}`);
    return { id: response.data.id.toString(), email: response.data.email, name: response.data.name };
  }

  async updateCustomer(customerId: string, data: Partial<{ email: string; name: string; metadata: Record<string, string> }>): Promise<void> {
    await flwFetch(`/customers/${customerId}`, {
      method: "PUT",
      body: JSON.stringify({ email: data.email, name: data.name }),
    });
  }

  async createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult> {
    const lineItem = params.lineItems[0];
    if (!lineItem) throw new Error("No line items provided");

    const txRef = `theta_${params.metadata?.workspaceId ?? "anon"}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

    const response = await flwFetch("/payments", {
      method: "POST",
      body: JSON.stringify({
        tx_ref: txRef,
        amount: this.toFlwAmount(lineItem.amount, params.currency ?? "USD"),
        currency: params.currency ?? "USD",
        redirect_url: params.successUrl,
        customer: {
          email: params.customerEmail,
        },
        customizations: {
          title: "Theta",
          description: lineItem.description,
        },
        meta: {
          ...params.metadata,
          ...(lineItem.planKey ? { planKey: lineItem.planKey } : {}),
          ...(lineItem.interval ? { interval: lineItem.interval } : {}),
        },
      }),
    });

    return { url: response.data.link, sessionId: response.data.id.toString() };
  }

  async createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntentResult> {
    const txRef = `pi_${crypto.randomBytes(12).toString("hex")}`;

    const response = await flwFetch("/payments", {
      method: "POST",
      body: JSON.stringify({
        tx_ref: txRef,
        amount: this.toFlwAmount(params.amount, params.currency),
        currency: params.currency,
        customer: { email: params.description ?? "customer@theta.com" },
        meta: params.metadata,
      }),
    });

    return { id: response.data.id.toString(), status: "pending", clientSecret: response.data.link };
  }

  async createSubscription(customerId: string, params: SubscriptionParams): Promise<SubscriptionResult> {
    throw new ProviderNotSupportedError("flutterwave", "createSubscription");
  }

  async updateSubscription(subscriptionId: string, params: Partial<SubscriptionParams>): Promise<SubscriptionResult> {
    throw new ProviderNotSupportedError("flutterwave", "updateSubscription");
  }

  async cancelSubscription(subscriptionId: string, options?: { cancelAtPeriodEnd?: boolean }): Promise<void> {
    return;
  }

  async retrieveSubscription(subscriptionId: string): Promise<SubscriptionData> {
    throw new ProviderNotSupportedError("flutterwave", "retrieveSubscription");
  }

  async chargeCustomer(customerId: string, amount: number, currency: string, params?: ChargeParams): Promise<ChargeResult> {
    const workspace = await prisma.workspace.findFirst({
      where: { providerCustomerId: customerId },
    });

    if (!workspace) {
      throw new Error(`No workspace found for Flutterwave customer ${customerId}`);
    }

    const token = this.extractToken(workspace.providerMetadata);
    if (!token) {
      throw new Error("No card token found for recurring charge. Customer must complete a checkout first.");
    }

    const txRef = `chg_${workspace.id}_${Date.now()}`;
    const response = await flwFetch("/tokenized-charges", {
      method: "POST",
      body: JSON.stringify({
        token,
        currency,
        amount: this.toFlwAmount(amount, currency),
        email: params?.metadata?.email ?? "",
        tx_ref: txRef,
        meta: params?.metadata,
      }),
    });

    const status = response.data?.status ?? "pending";
    const paid = status === "successful";

    return {
      id: response.data?.id?.toString() ?? txRef,
      status,
      amount,
      currency,
      paid,
      refunded: false,
      customerId,
      failureMessage: paid ? undefined : response.data?.processor_response ?? response.message,
    };
  }

  async refundPayment(chargeId: string, amount?: number): Promise<RefundResult> {
    const body: any = {};
    if (amount != null) body.amount = this.toFlwAmount(amount, "USD");

    const response = await flwFetch(`/transactions/${chargeId}/refund`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    return {
      id: response.data?.id?.toString() ?? chargeId,
      status: response.data?.status ?? "pending",
      amount: response.data?.amount ?? amount ?? 0,
      currency: response.data?.currency ?? "USD",
    };
  }

  async listPaymentMethods(customerId: string): Promise<PaymentMethodData[]> {
    const methods = await prisma.paymentMethod.findMany({
      where: { providerCustomerId: customerId, provider: "flutterwave" },
    });
    return methods.map((m) => ({
      id: m.providerMethodId,
      type: m.type,
      last4: m.last4 ?? undefined,
      brand: m.brand ?? undefined,
      expMonth: m.expMonth ?? undefined,
      expYear: m.expYear ?? undefined,
      isDefault: m.isDefault,
      customerId: m.providerCustomerId,
    }));
  }

  async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    logger.info(`[Flutterwave] attachPaymentMethod: storing token ${paymentMethodId} for customer ${customerId}`);
    const workspace = await prisma.workspace.findFirst({ where: { providerCustomerId: customerId }, select: { id: true } });
    if (!workspace) {
      logger.error(`[Flutterwave] No workspace found for customer ${customerId}`);
      return;
    }
    await prisma.paymentMethod.upsert({
      where: { provider_providerMethodId: { provider: "flutterwave", providerMethodId: paymentMethodId } },
      update: {},
      create: {
        provider: "flutterwave",
        providerMethodId: paymentMethodId,
        providerCustomerId: customerId,
        type: "card",
        isDefault: true,
        workspaceId: workspace.id,
      },
    });
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    await prisma.paymentMethod.deleteMany({
      where: { provider: "flutterwave", providerMethodId: paymentMethodId },
    });
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    await prisma.paymentMethod.updateMany({
      where: { providerCustomerId: customerId, provider: "flutterwave" },
      data: { isDefault: false },
    });
    await prisma.paymentMethod.updateMany({
      where: { provider: "flutterwave", providerMethodId: paymentMethodId },
      data: { isDefault: true },
    });
  }

  async verifyWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean> {
    try {
      const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
      const actual = signature.startsWith("sha256=") ? signature.slice(7) : signature;
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
    } catch {
      return false;
    }
  }

  async parseWebhookEvent(payload: string): Promise<WebhookEvent> {
    const body = JSON.parse(payload);
    const eventType = this.mapFlwEvent(body.event);
    const txId = body.data?.id?.toString() ?? body.data?.tx_ref ?? `flw_${Date.now()}`;

    const data = { ...(body.data ?? body) };
    if (data.meta && !data.metadata) {
      data.metadata = data.meta;
    }

    return {
      id: txId,
      type: eventType,
      rawType: body.event ?? "unknown",
      data,
      created: Date.now(),
    };
  }

  async createInvoice(params: InvoiceParams): Promise<InvoiceResult> {
    throw new ProviderNotSupportedError("flutterwave", "createInvoice");
  }

  async finalizeInvoice(invoiceId: string): Promise<void> {
    throw new ProviderNotSupportedError("flutterwave", "finalizeInvoice");
  }

  async voidInvoice(invoiceId: string): Promise<void> {
    throw new ProviderNotSupportedError("flutterwave", "voidInvoice");
  }

  private extractToken(metadata: any): string | null {
    if (!metadata) return null;
    if (typeof metadata === "string") {
      try {
        const parsed = JSON.parse(metadata);
        return parsed?.token ?? null;
      } catch {
        return null;
      }
    }
    return (metadata as any)?.token ?? null;
  }

  private toFlwAmount(amountInCents: number, _currency: string): number {
    return amountInCents / 100;
  }

  private mapFlwEvent(event: string): any {
    const mapping: Record<string, any> = {
      "charge.completed": "payment.succeeded",
      "charge.success": "payment.succeeded",
      "charge.failed": "payment.failed",
      "transfer.completed": "subscription.updated",
      "transfer.failed": "payment.failed",
    };
    return mapping[event] ?? "subscription.updated";
  }
}

async function flwFetch(path: string, options: RequestInit = {}): Promise<any> {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secretKey) throw new Error("FLUTTERWAVE_SECRET_KEY is not defined");

  const url = `${FLW_BASE}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> ?? {}) },
  });

  const result = await response.json();

  if (!response.ok || result.status === "error") {
    throw new Error(result.message || `Flutterwave API error: ${response.statusText}`);
  }

  return result;
}
