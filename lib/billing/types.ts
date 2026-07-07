export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "deactivated";

export type BillingInterval = "monthly" | "annual";
export type Currency = "USD" | "NGN" | "EUR" | "GBP";
export type BillingMode = "subscription" | "one_time";

export type PlanName = "free" | "growth" | "pro" | "theta_plus";

export type BillingEventType =
  | "payment.succeeded"
  | "payment.failed"
  | "subscription.created"
  | "subscription.canceled"
  | "subscription.updated"
  | "customer.updated"
  | "charge.dispute.created"
  | "charge.refunded";

export interface ProrationResult {
  direction: "upgrade" | "downgrade";
  chargeAmount: number;
  creditAmount: number;
  remainingDays: number;
  usedDays: number;
  totalDays: number;
  prorationStart: Date;
  prorationEnd: Date;
  oldDaily: number;
  newDaily: number;
}

export interface EntitlementResult {
  allowed: boolean;
  reason?: string;
  status?: SubscriptionStatus;
  limit?: number;
  current?: number;
}

export interface DunningLevel {
  level: number;
  delayHours: number;
  sendEmail: boolean;
  emailTemplate: string;
}

export interface CronSummary {
  dunning: { processed: number; succeeded: number; deactivated: number; failed: number };
  trialExpiration: number;
  subscriptionExpiration: number;
  dataRetentionCleaned: number;
}

export interface ChangePlanResult {
  status: SubscriptionStatus;
  direction: "upgrade" | "downgrade";
  chargeAmount: number;
  creditAmount: number;
  effectiveDate: Date | null;
  invoice: any | null;
  creditNote: any | null;
}

export interface RetryResult {
  attempted: boolean;
  succeeded: boolean;
  status: SubscriptionStatus;
  chargeResult?: any;
  error?: string;
}
