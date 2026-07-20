export type BillingMode = "subscription" | "one_time";
export type BillingInterval = "monthly" | "annual";
export type Currency = "USD" | "NGN";

export type BillingPlan = {
  id: string;
  name: string;
  priceLabel: string;
  basePriceMonthlyUSD: number; // in cents
  perUserPriceMonthlyUSD: number; // in cents
  maxUsers: number | null; 
  currency: "USD" | "NGN";
  mode: BillingMode;
  features: string[];
  description: string;
  planKey: "free" | "growth" | "pro" | "theta_plus";
  paystackPlanCodes?: {
    monthly: string;
    annual: string;
  };
};

/**
 * Dynamic Pricing Model: Total = Base + (Members x Per-User)
 *
 * Free:    $0 + ($0 x members)
 * Growth:  $5 + ($2 x members)
 * Pro:     $10 + ($3 x members)
 * Theta+:  $20 + ($4 x members)
 *
 * Pain Funnel Design:
 * - Free tier is generous enough to build dependency (unlimited projects/tasks)
 * - But capped at 5 members, 3 boards, 256MB storage, 20 Nova requests
 * - Optimal conversion window: Days 14-28 when 2-3 walls are hit
 */
export const BILLING_PLANS: BillingPlan[] = [
  {
    id: "free",
    planKey: "free",
    name: "Free",
    priceLabel: "$0",
    basePriceMonthlyUSD: 0,
    perUserPriceMonthlyUSD: 0,
    maxUsers: 5,
    currency: "USD",
    mode: "subscription",
    description: "Perfect for getting started",
    features: [
      "Up to 5 users",
      "Unlimited projects & tasks",
      "3 Kanban boards",
      "256MB storage",
      "20 Nova AI requests/mo",
      "1 integration",
      "Email support (72h)",
    ],
  },
  {
    id: "growth",
    planKey: "growth",
    name: "Growth",
    priceLabel: "$5",
    basePriceMonthlyUSD: 500,
    perUserPriceMonthlyUSD: 200,
    maxUsers: 15,
    currency: "USD",
    mode: "subscription",
    description: "For small growing teams",
    paystackPlanCodes: {
      monthly: "PLN_growth_monthly",
      annual: "PLN_growth_annual",
    },
    features: [
      "Up to 15 users",
      "Unlimited projects & tasks",
      "Unlimited boards",
      "5GB storage",
      "100 Nova AI requests/mo",
      "3 integrations",
      "10 automations/mo",
      "Custom fields (5/project)",
      "Sprints & Goals",
      "CSV export",
      "Email support (48h)",
    ],
  },
  {
    id: "pro",
    planKey: "pro",
    name: "Pro",
    priceLabel: "$10",
    basePriceMonthlyUSD: 1000,
    perUserPriceMonthlyUSD: 300,
    maxUsers: 50,
    currency: "USD",
    mode: "subscription",
    description: "For professional teams",
    paystackPlanCodes: {
      monthly: "PLN_pro_monthly",
      annual: "PLN_pro_annual",
    },
    features: [
      "Up to 50 users",
      "Unlimited projects, tasks & teams",
      "50GB storage",
      "500 Nova AI requests/mo",
      "Unlimited integrations",
      "Unlimited automations",
      "Unlimited custom fields",
      "Full Sprints & Goals",
      "Advanced analytics",
      "CSV + PDF export",
      "Time tracking with reports",
      "API access (10k/mo)",
      "Email + Chat (12h)",
    ],
  },
  {
    id: "theta_plus",
    planKey: "theta_plus",
    name: "Theta Plus",
    priceLabel: "$20",
    basePriceMonthlyUSD: 2000,
    perUserPriceMonthlyUSD: 400,
    maxUsers: null,
    currency: "USD",
    mode: "subscription",
    description: "For enterprise-grade teams",
    paystackPlanCodes: {
      monthly: "PLN_plus_monthly",
      annual: "PLN_plus_annual",
    },
    features: [
      "Unlimited users",
      "Unlimited everything",
      "500GB storage",
      "2,000 Nova AI requests/mo",
      "White label branding",
      "Advanced permissions",
      "Custom automation",
      "24/7 Priority support",
      "Dedicated manager",
      "API access (100k/mo)",
      "Lifetime activity history",
    ],
  },
];

export const BILLING_PLAN_LOOKUP = BILLING_PLANS.reduce<
  Record<string, BillingPlan>
>((acc, plan) => {
  acc[plan.id] = plan;
  return acc;
}, {});

/**
 * Get plan price based on billing interval, currency and member count
 * Formula: Total = Base + (Active Users x Price Per User)
 */
export function getPlanPrice(
  planId: string,
  interval: BillingInterval,
  memberCount: number = 0,
  currency: Currency = "USD"
): number {
  const plan = BILLING_PLAN_LOOKUP[planId];
  if (!plan) return 0;

  // Formula: Base + (Active Users * Price Per User)
  const baseMonthly = plan.basePriceMonthlyUSD;
  const perUserMonthly = plan.perUserPriceMonthlyUSD;
  
  let totalMonthlyUSD = baseMonthly + (memberCount * perUserMonthly);
  
  // Apply annual discount if applicable (20%)
  let finalAmountUSD = interval === "annual" 
    ? Math.floor(totalMonthlyUSD * 12 * 0.8) 
    : totalMonthlyUSD;

  if (currency === "NGN") {
     throw new Error("NGN pricing requires dynamic conversion. Use getPlanPriceDynamic().");
  }

  return finalAmountUSD;
}

/**
 * Get plan price with dynamic currency conversion for NGN
 */
export async function getPlanPriceDynamic(
  planId: string,
  interval: BillingInterval,
  memberCount: number = 0,
  currency: Currency = "USD"
): Promise<number> {
  const plan = BILLING_PLAN_LOOKUP[planId];
  if (!plan) return 0;

  if (currency === "USD") {
    return getPlanPrice(planId, interval, memberCount, "USD");
  }

  // Handle NGN dynamically
  const { convertUsdToNgn } = await import("./currency");
  const usdAmount = getPlanPrice(planId, interval, memberCount, "USD");
  return await convertUsdToNgn(usdAmount);
}

/**
 * Calculate discount percentage for annual billing
 */
export function getAnnualDiscount(): number {
  return 20; // 20% discount for annual billing
}
