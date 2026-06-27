import { paystack } from "@/lib/paystack";
import { prisma } from "@/lib/prisma";
import { BillingProvider, CustomerResult, CheckoutParams, CheckoutResult, PaymentIntentParams, PaymentIntentResult, SubscriptionParams, SubscriptionResult, SubscriptionData, ChargeParams, ChargeResult, RefundResult, PaymentMethodData, InvoiceParams, InvoiceResult, WebhookEvent } from "../billing-provider.interface";
import { Currency } from "../types";

export class PaystackProvider implements BillingProvider {
  readonly id = "paystack";
  readonly name = "Paystack";
  readonly currencies: Currency[] = ["NGN"];
  readonly capabilities = ["subscriptions", "payment_intents", "checkout_sessions", "payment_methods", "refunds", "webhooks"] as const;

  async createCustomer(email: string, name?: string, metadata?: Record<string, string>): Promise<CustomerResult> {
    const response = await paystackFetch("/customer", {
      method: "POST",
      body: JSON.stringify({ email, first_name: name, metadata }),
    });
    return { id: response.data.customer_code, email: response.data.email, name: response.data.first_name, metadata };
  }

  async getCustomer(customerId: string): Promise<CustomerResult> {
    const response = await paystackFetch(`/customer/${customerId}`);
    return { id: response.data.customer_code, email: response.data.email, name: response.data.first_name };
  }

  async updateCustomer(customerId: string, data: Partial<{ email: string; name: string; metadata: Record<string, string> }>): Promise<void> {
    await paystackFetch(`/customer/${customerId}`, {
      method: "PUT",
      body: JSON.stringify({ email: data.email, first_name: data.name, metadata: data.metadata }),
    });
  }

  async createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult> {
    const lineItem = params.lineItems[0];
    if (!lineItem) throw new Error("No line items provided");

    const response = await paystack.initializeTransaction({
      email: params.customerEmail,
      amount: lineItem.amount,
      currency: params.currency ?? "NGN",
      metadata: { ...params.metadata, workspaceId: params.metadata?.workspaceId },
      callback_url: params.successUrl,
    });

    return { url: response.data.authorization_url, sessionId: response.data.access_code };
  }

  async createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntentResult> {
    const response = await paystackFetch("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: params.customerId,
        amount: params.amount,
        currency: params.currency,
        metadata: params.metadata,
      }),
    });
    return { id: response.data.reference, status: "pending", clientSecret: response.data.access_code };
  }

  async createSubscription(customerId: string, params: SubscriptionParams): Promise<SubscriptionResult> {
    const planCode = await this.resolvePaystackPlanCode(params.planKey, params.interval);
    const response = await paystackFetch("/subscription", {
      method: "POST",
      body: JSON.stringify({
        customer: customerId,
        plan: planCode,
        start_date: new Date().toISOString(),
      }),
    });
    return {
      id: response.data.subscription_code,
      status: response.data.status,
      currentPeriodStart: Date.now(),
      currentPeriodEnd: Date.now() + (params.interval === "annual" ? 365 : 30) * 24 * 60 * 60 * 1000,
      customerId,
    };
  }

  async updateSubscription(subscriptionId: string, params: Partial<SubscriptionParams>): Promise<SubscriptionResult> {
    const response = await paystackFetch(`/subscription/${subscriptionId}`, {
      method: "PUT",
      body: JSON.stringify({ plan: params.planKey }),
    });
    return {
      id: response.data.subscription_code,
      status: response.data.status,
      currentPeriodStart: Date.now(),
      currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
      customerId: response.data.customer?.customer_code ?? "",
    };
  }

  async cancelSubscription(subscriptionId: string, options?: { cancelAtPeriodEnd?: boolean }): Promise<void> {
    await paystackFetch(`/subscription/${subscriptionId}/manage/disable`, {
      method: "POST",
      body: JSON.stringify({ code: subscriptionId, token: "" }),
    });
  }

  async retrieveSubscription(subscriptionId: string): Promise<SubscriptionData> {
    const response = await paystackFetch(`/subscription/${subscriptionId}`);
    const data = response.data;
    return {
      id: data.subscription_code,
      status: data.status,
      interval: data.plan?.interval,
      currentPeriodStart: new Date(data.createdAt).getTime(),
      currentPeriodEnd: new Date(data.next_payment_date).getTime(),
      cancelAtPeriodEnd: data.status === "cancelled",
      customerId: data.customer?.customer_code ?? "",
    };
  }

  async chargeCustomer(customerId: string, amount: number, currency: string, params?: ChargeParams): Promise<ChargeResult> {
    const workspace = await prisma.workspace.findFirst({ where: { providerCustomerId: customerId } });
    const authCode = workspace?.paystackAuthCode;
    if (!authCode) {
      throw new Error("No authorization code found for recurring charge");
    }
    const reference = `chg_${workspace?.id ?? "unknown"}_${Date.now()}`;
    const response = await paystack.chargeAuthorization({
      email: params?.metadata?.email ?? "",
      amount,
      authorization_code: authCode,
      reference,
      metadata: params?.metadata,
      currency,
    });

    return {
      id: response.data?.reference ?? reference,
      status: response.data?.status ?? "pending",
      amount: response.data?.amount ?? amount,
      currency: response.data?.currency ?? currency,
      paid: response.data?.status === "success",
      refunded: false,
      customerId,
      failureMessage: response.data?.gateway_response !== "Successful" ? response.data?.gateway_response : undefined,
    };
  }

  async refundPayment(chargeId: string, amount?: number): Promise<RefundResult> {
    const response = await paystackFetch("/refund", {
      method: "POST",
      body: JSON.stringify({ transaction: chargeId, amount }),
    });
    return { id: response.data?.id ?? chargeId, status: "succeeded", amount: response.data?.amount ?? amount ?? 0, currency: "NGN" };
  }

  async listPaymentMethods(customerId: string): Promise<PaymentMethodData[]> {
    const response = await paystackFetch(`/customer/${customerId}`);
    const authorizations = response.data?.authorizations ?? [];
    return authorizations.map((auth: any) => ({
      id: auth.authorization_code,
      type: "card",
      last4: auth.last4,
      brand: auth.brand,
      expMonth: auth.exp_month,
      expYear: auth.exp_year,
      isDefault: true,
      customerId,
    }));
  }

  async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    await paystackFetch(`/customer/${customerId}/update`, {
      method: "PUT",
      body: JSON.stringify({ authorization_code: paymentMethodId }),
    });
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    return;
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    return;
  }

  async verifyWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean> {
    const crypto = await import("crypto");
    const hash = crypto.createHmac("sha512", secret).update(payload).digest("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  async parseWebhookEvent(payload: string): Promise<WebhookEvent> {
    const body = JSON.parse(payload);
    const eventType = this.mapPaystackEvent(body.event);
    return {
      id: body.data?.reference ?? body.data?.id ?? `${body.event}_${Date.now()}`,
      type: eventType,
      rawType: body.event,
      data: body.data,
      created: new Date(body.data?.paid_at ?? Date.now()).getTime(),
    };
  }

  async createInvoice(params: InvoiceParams): Promise<InvoiceResult> {
    const response = await paystackFetch("/paymentrequest", {
      method: "POST",
      body: JSON.stringify({
        customer: params.customerId,
        amount: params.lineItems.reduce((s, i) => s + i.amount, 0),
        currency: params.currency,
        description: params.description,
        due_date: new Date(Date.now() + (params.dueDays ?? 30) * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        line_items: params.lineItems.map((li) => ({
          name: li.description,
          amount: li.amount,
          quantity: li.quantity,
        })),
      }),
    });
    return { id: response.data?.id ?? "", number: response.data?.request_code ?? "", status: "pending", total: params.lineItems.reduce((s, i) => s + i.amount, 0), currency: params.currency };
  }

  async finalizeInvoice(invoiceId: string): Promise<void> {
    await paystackFetch(`/paymentrequest/${invoiceId}/finalize`, { method: "POST" });
  }

  async voidInvoice(invoiceId: string): Promise<void> {
    await paystackFetch(`/paymentrequest/${invoiceId}/archive`, { method: "POST" });
  }

  private async resolvePaystackPlanCode(planKey: string, interval: string): Promise<string> {
    const { BILLING_PLANS } = await import("@/lib/billing-plans");
    const plan = BILLING_PLANS.find((p) => p.planKey === planKey);
    const code = plan?.paystackPlanCodes?.[interval as "monthly" | "annual"];
    if (!code) throw new Error(`No Paystack plan code for ${planKey} ${interval}`);
    return code;
  }

  private mapPaystackEvent(event: string): any {
    const mapping: Record<string, any> = {
      "charge.success": "payment.succeeded",
      "charge.failed": "payment.failed",
      "subscription.create": "subscription.created",
      "subscription.disable": "subscription.canceled",
      "subscription.expiring": "subscription.updated",
      "customer.update": "customer.updated",
      "charge.dispute.create": "charge.dispute.created",
      "refund.processed": "charge.refunded",
    };
    return mapping[event] ?? "subscription.updated";
  }
}

async function paystackFetch(path: string, options: RequestInit = {}): Promise<any> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY is not defined");
  const baseUrl = "https://api.paystack.co";
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || `Paystack API error: ${response.statusText}`);
  return result;
}
