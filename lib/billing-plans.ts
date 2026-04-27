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

export const BILLING_PLANS: BillingPlan[] = [
  {
    id: "free",
    planKey: "free",
    name: "Free",
    priceLabel: "$0",
    basePriceMonthlyUSD: 0,
    perUserPriceMonthlyUSD: 0,
    maxUsers: 3,
    currency: "USD",
    mode: "subscription",
    description: "Perfect for getting started",
    features: [
      "Up to 3 users",
      "3 projects",
      "25 tasks",
      "1 team",
      "100MB storage",
      "10 Boots AI requests/mo",
      "2 Kanban boards",
      "Email support (72h)",
    ],
  },
  {
    id: "growth-monthly",
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
      monthly: "PLN_growth_dynamic",
      annual: "PLN_growth_annual_dynamic",
    },
    features: [
      "Up to 15 users",
      "15 projects",
      "150 tasks",
      "5 teams",
      "5GB storage",
      "100 Boots AI requests/mo",
      "10 Kanban boards",
      "2 integrations",
      "Email support (24h)",
    ],
  },
  {
    id: "pro-monthly",
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
      monthly: "PLN_pro_dynamic",
      annual: "PLN_pro_annual_dynamic",
    },
    features: [
      "Up to 50 users",
      "100 projects",
      "Unlimited tasks & teams",
      "50GB storage",
      "500 Boots AI requests/mo",
      "Unlimited Kanban boards",
      "All integrations",
      "Advanced analytics",
      "API access (10k/mo)",
      "Email + Chat (12h)",
    ],
  },
  {
    id: "theta-plus-monthly",
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
      monthly: "PLN_plus_dynamic",
      annual: "PLN_plus_annual_dynamic",
    },
    features: [
      "Unlimited users",
      "Unlimited projects & tasks",
      "Unlimited teams",
      "500GB storage",
      "2,000 Boots AI requests/mo",
      "Advanced permissions",
      "Custom automation",
      "White label branding",
      "24/7 Priority support",
      "Dedicated manager",
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
     // For this iteration, we'll use a fixed conversion factor of 1250 if dynamic fails
     return finalAmountUSD * 1250;
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
  try {
    const { convertUsdToNgn } = await import("./currency");
    const usdAmount = getPlanPrice(planId, interval, memberCount, "USD");
    return await convertUsdToNgn(usdAmount);
  } catch (error) {
    console.warn("[Billing] Dynamic conversion failed, using fixed fallback");
    return getPlanPrice(planId, interval, memberCount, "NGN");
  }
}

/**
 * Calculate discount percentage for annual billing
 */
export function getAnnualDiscount(): number {
  return 20; // 20% discount for annual billing
}

