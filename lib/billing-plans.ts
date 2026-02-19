export type BillingMode = "subscription" | "one_time";
export type BillingInterval = "monthly" | "annual";
export type Currency = "USD" | "NGN";

export type BillingPlan = {
  id: string;
  name: string;
  priceLabel: string;
  priceLabelNGN: string;
  priceMonthlyUSD: number; // in cents
  priceAnnualUSD: number;  // in cents
  priceMonthlyNGN: number; // in kobo
  priceAnnualNGN: number;  // in kobo
  currency: "USD" | "NGN";
  mode: BillingMode;
  features: string[];
  description: string;
  planKey: "free" | "growth" | "pro" | "theta_plus" | "lifetime";
  fastSpringPaths?: {
    monthly: string;
    annual: string;
  };
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
    priceLabelNGN: "₦0",
    priceMonthlyUSD: 0,
    priceAnnualUSD: 0,
    priceMonthlyNGN: 0,
    priceAnnualNGN: 0,
    currency: "USD",
    mode: "subscription",
    description: "Perfect for getting started",
    features: [
      "3 projects",
      "25 tasks",
      "1 team",
      "5 team members",
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
    priceLabel: "$12",
    priceLabelNGN: "₦15,000",
    priceMonthlyUSD: 1200,
    priceAnnualUSD: 11520,
    priceMonthlyNGN: 1500000, // 15,000.00 NGN
    priceAnnualNGN: 14400000, // 144,000.00 NGN (20% discount)
    currency: "USD",
    mode: "subscription",
    description: "For small growing teams",
    fastSpringPaths: {
      monthly: "theta-growth-monthly",
      annual: "theta-growth-annual",
    },
    paystackPlanCodes: {
      monthly: "PLN_growth_monthly",
      annual: "PLN_growth_annual",
    },
    features: [
      "15 projects",
      "150 tasks",
      "5 teams",
      "15 team members",
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
    priceLabel: "$29",
    priceLabelNGN: "₦35,000",
    priceMonthlyUSD: 2900,
    priceAnnualUSD: 27840,
    priceMonthlyNGN: 3500000,
    priceAnnualNGN: 33600000,
    currency: "USD",
    mode: "subscription",
    description: "For professional teams",
    fastSpringPaths: {
      monthly: "theta-pro-monthly",
      annual: "theta-pro-annual",
    },
    paystackPlanCodes: {
      monthly: "PLN_pro_monthly",
      annual: "PLN_pro_annual",
    },
    features: [
      "100 projects",
      "Unlimited tasks & teams",
      "50 team members",
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
    priceLabel: "$99",
    priceLabelNGN: "₦120,000",
    priceMonthlyUSD: 9900,
    priceAnnualUSD: 95040,
    priceMonthlyNGN: 12000000,
    priceAnnualNGN: 115200000,
    currency: "USD",
    mode: "subscription",
    description: "For enterprise-grade teams",
    fastSpringPaths: {
      monthly: "theta-plus-monthly",
      annual: "theta-plus-annual",
    },
    paystackPlanCodes: {
      monthly: "PLN_plus_monthly",
      annual: "PLN_plus_annual",
    },
    features: [
      "Unlimited projects & tasks",
      "Unlimited teams & members",
      "500GB storage",
      "2,000 Boots AI requests/mo",
      "Advanced permissions",
      "Custom automation",
      "White label branding",
      "24/7 Priority support",
      "Dedicated manager",
    ],
  },
  {
    id: "lifetime",
    planKey: "lifetime",
    name: "Theta Lifetime",
    priceLabel: "$999",
    priceLabelNGN: "₦1,200,000",
    priceMonthlyUSD: 99900,
    priceAnnualUSD: 99900,
    priceMonthlyNGN: 120000000,
    priceAnnualNGN: 120000000,
    currency: "USD",
    mode: "one_time",
    description: "One-time payment, lifetime access",
    fastSpringPaths: {
      monthly: "theta-lifetime",
      annual: "theta-lifetime",
    },
    paystackPlanCodes: {
      monthly: "LIFETIME_NGN",
      annual: "LIFETIME_NGN",
    },
    features: [
      "All Theta Plus features",
      "Lifetime access",
      "No recurring fees",
      "Priority early access",
      "All future updates",
      "Highest priority support",
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
 * Get plan price based on billing interval and currency
 * Synchronous version uses hardcoded fallbacks for NGN
 */
export function getPlanPrice(
  planId: string,
  interval: BillingInterval,
  currency: Currency = "USD"
): number {
  const plan = BILLING_PLAN_LOOKUP[planId];
  if (!plan) return 0;

  if (currency === "NGN") {
    if (plan.mode === "one_time") return plan.priceMonthlyNGN;
    return interval === "annual" ? plan.priceAnnualNGN : plan.priceMonthlyNGN;
  }

  if (plan.mode === "one_time") {
    return plan.priceMonthlyUSD;
  }

  return interval === "annual" ? plan.priceAnnualUSD : plan.priceMonthlyUSD;
}

/**
 * Get plan price with dynamic currency conversion for NGN
 */
export async function getPlanPriceDynamic(
  planId: string,
  interval: BillingInterval,
  currency: Currency = "USD"
): Promise<number> {
  const plan = BILLING_PLAN_LOOKUP[planId];
  if (!plan) return 0;

  if (currency === "USD") {
    return getPlanPrice(planId, interval, "USD");
  }

  // Handle NGN dynamically
  try {
    const { convertUsdToNgn } = await import("./currency");
    const usdAmount = getPlanPrice(planId, interval, "USD");
    return await convertUsdToNgn(usdAmount);
  } catch (error) {
    console.warn("[Billing] Dynamic conversion failed, using hardcoded price");
    return getPlanPrice(planId, interval, "NGN");
  }
}

/**
 * Calculate discount percentage for annual billing
 */
export function getAnnualDiscount(): number {
  return 20; // 20% discount for annual billing
}

