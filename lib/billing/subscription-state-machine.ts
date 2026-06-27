import { SubscriptionStatus, BillingEventType } from "./types";
import { InvalidTransitionError } from "./errors";

const TRANSITIONS: Record<SubscriptionStatus, Partial<Record<string, SubscriptionStatus>>> = {
  trialing: {
    "payment.succeeded": "active",
    "trial.expired": "deactivated",
  },
  active: {
    "payment.failed": "past_due",
    "subscription.canceled": "canceled",
  },
  past_due: {
    "payment.succeeded": "active",
    "dunning.exhausted": "deactivated",
  },
  canceled: {
    "subscription.reactivated": "active",
    "subscription.expired": "deactivated",
    "payment.succeeded": "active",
  },
  deactivated: {
    "payment.succeeded": "active",
  },
};

export const VALID_TRANSITIONS: { from: SubscriptionStatus; to: SubscriptionStatus; event: string; description: string }[] = [
  { from: "trialing", to: "active", event: "payment.succeeded", description: "First payment successful" },
  { from: "trialing", to: "deactivated", event: "trial.expired", description: "Trial period ended without payment" },
  { from: "active", to: "past_due", event: "payment.failed", description: "Recurring charge failed" },
  { from: "active", to: "canceled", event: "subscription.canceled", description: "User canceled subscription" },
  { from: "past_due", to: "active", event: "payment.succeeded", description: "Retry payment succeeded" },
  { from: "past_due", to: "deactivated", event: "dunning.exhausted", description: "All dunning retries exhausted" },
  { from: "canceled", to: "active", event: "subscription.reactivated", description: "User reactivated before period end" },
  { from: "canceled", to: "deactivated", event: "subscription.expired", description: "Subscription period ended" },
  { from: "canceled", to: "active", event: "payment.succeeded", description: "New payment after cancellation" },
  { from: "deactivated", to: "active", event: "payment.succeeded", description: "New payment to reactivate" },
];

export const ACTIVE_STATES: Set<SubscriptionStatus> = new Set(["trialing", "active", "past_due", "canceled"]);
export const BLOCKED_STATES: Set<SubscriptionStatus> = new Set(["deactivated"]);
export const PAYMENT_REQUIRED_STATES: Set<SubscriptionStatus> = new Set(["past_due", "deactivated"]);
export const WRITABLE_STATES: Set<SubscriptionStatus> = new Set(["trialing", "active", "past_due"]);

export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return ACTIVE_STATES.has(status);
}

export function isWriteAllowed(status: SubscriptionStatus): boolean {
  return WRITABLE_STATES.has(status);
}

export function isPaymentRequired(status: SubscriptionStatus): boolean {
  return PAYMENT_REQUIRED_STATES.has(status);
}

export function transition(from: SubscriptionStatus, event: string): SubscriptionStatus {
  const next = TRANSITIONS[from]?.[event];
  if (!next) {
    throw new InvalidTransitionError(from, event);
  }
  return next;
}
