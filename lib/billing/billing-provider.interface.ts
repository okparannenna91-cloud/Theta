import { Currency, BillingEventType } from "./types";

export interface CustomerResult {
  id: string;
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

export interface CheckoutLineItem {
  priceId?: string;
  planKey?: string;
  interval?: "monthly" | "annual";
  amount: number;
  currency: string;
  quantity: number;
  description: string;
}

export interface CheckoutParams {
  customerId?: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  lineItems: CheckoutLineItem[];
  mode: "subscription" | "payment" | "setup";
  metadata?: Record<string, string>;
  currency?: string;
  allowPromotionCodes?: boolean;
}

export interface CheckoutResult {
  url: string;
  sessionId: string;
}

export interface PaymentIntentParams {
  customerId: string;
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, string>;
  paymentMethodId?: string;
  offSession?: boolean;
  confirm?: boolean;
}

export interface PaymentIntentResult {
  id: string;
  status: string;
  clientSecret?: string;
  nextAction?: any;
}

export interface SubscriptionParams {
  planKey: string;
  interval: "monthly" | "annual";
  quantity?: number;
  metadata?: Record<string, string>;
  trialPeriodDays?: number;
  customerId: string;
}

export interface SubscriptionResult {
  id: string;
  status: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  metadata?: Record<string, string>;
  customerId: string;
}

export interface SubscriptionData {
  id: string;
  status: string;
  planKey?: string;
  interval?: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  canceledAt?: number;
  metadata?: Record<string, string>;
  customerId: string;
}

export interface ChargeParams {
  description?: string;
  metadata?: Record<string, string>;
  paymentMethodId?: string;
  offSession?: boolean;
}

export interface ChargeResult {
  id: string;
  status: string;
  amount: number;
  currency: string;
  paid: boolean;
  refunded: boolean;
  metadata?: Record<string, string>;
  customerId?: string;
  paymentMethodId?: string;
  failureMessage?: string;
}

export interface RefundResult {
  id: string;
  status: string;
  amount: number;
  currency: string;
}

export interface PaymentMethodData {
  id: string;
  type: string;
  last4?: string;
  brand?: string;
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
  customerId: string;
}

export interface InvoiceParams {
  customerId: string;
  subscriptionId?: string;
  currency: string;
  description?: string;
  metadata?: Record<string, string>;
  dueDays?: number;
  lineItems: { description: string; amount: number; quantity: number }[];
}

export interface InvoiceResult {
  id: string;
  number: string;
  status: string;
  total: number;
  currency: string;
  invoiceUrl?: string;
  pdfUrl?: string;
}

export interface WebhookEvent {
  id: string;
  type: BillingEventType;
  rawType: string;
  data: any;
  created: number;
}

export type BillingCapability = "subscriptions" | "payment_intents" | "checkout_sessions" | "invoicing" | "payment_methods" | "refunds" | "webhooks";

export interface BillingProvider {
  id: string;
  name: string;
  currencies: Currency[];
  readonly capabilities: readonly BillingCapability[];

  createCustomer(email: string, name?: string, metadata?: Record<string, string>): Promise<CustomerResult>;
  getCustomer(customerId: string): Promise<CustomerResult>;
  updateCustomer(customerId: string, data: Partial<{ email: string; name: string; metadata: Record<string, string> }>): Promise<void>;

  createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult>;
  createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntentResult>;

  createSubscription(customerId: string, params: SubscriptionParams): Promise<SubscriptionResult>;
  updateSubscription(subscriptionId: string, params: Partial<SubscriptionParams>): Promise<SubscriptionResult>;
  cancelSubscription(subscriptionId: string, options?: { cancelAtPeriodEnd?: boolean }): Promise<void>;
  retrieveSubscription(subscriptionId: string): Promise<SubscriptionData>;

  chargeCustomer(customerId: string, amount: number, currency: string, params?: ChargeParams): Promise<ChargeResult>;
  refundPayment(chargeId: string, amount?: number): Promise<RefundResult>;

  listPaymentMethods(customerId: string): Promise<PaymentMethodData[]>;
  attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<void>;
  detachPaymentMethod(paymentMethodId: string): Promise<void>;
  setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void>;

  verifyWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean>;
  parseWebhookEvent(payload: string): Promise<WebhookEvent>;

  createInvoice(params: InvoiceParams): Promise<InvoiceResult>;
  finalizeInvoice(invoiceId: string): Promise<void>;
  voidInvoice(invoiceId: string): Promise<void>;
}
