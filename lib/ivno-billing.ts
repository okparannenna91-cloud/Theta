
import { prisma } from "./prisma";
import { BILLING_PLANS } from "./billing-plans";

/** Lookup by planKey (e.g. "growth", "pro", "theta_plus") */
const PLAN_BY_KEY = BILLING_PLANS.reduce<Record<string, typeof BILLING_PLANS[0]>>(
    (acc, plan) => { acc[plan.planKey] = plan; return acc; }, {}
);

/**
 * orderId format: theta.{workspaceId}.{planKey}.{interval}.{timestamp}
 * Dots are used as delimiters to avoid conflicts with planKeys like "theta_plus".
 */
export function buildIvnoOrderId(
    workspaceId: string,
    planKey: string,
    interval: string
): string {
    return `theta.${workspaceId}.${planKey}.${interval}.${Date.now()}`;
}

/**
 * Handle successful Ivno payment
 */
export async function handleSuccessfulIvnoPayment(
    orderId: string,
    amount: number,
    currency: string,
    data: any
) {
    // Parse order_id: theta.{workspaceId}.{planKey}.{interval}.{timestamp}
    const parts = orderId.split(".");
    if (parts.length < 5 || parts[0] !== "theta") {
        console.error("Invalid Ivno orderId format:", orderId);
        return;
    }

    const workspaceId = parts[1];
    const planKey = parts[2] as "free" | "growth" | "pro" | "theta_plus" | "lifetime";
    const interval = parts[3] as "monthly" | "annual";

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
        console.error("Workspace not found for Ivno payment:", workspaceId);
        return;
    }

    const plan = PLAN_BY_KEY[planKey];
    if (!plan) {
        console.error("Plan not found for Ivno payment key:", planKey);
        return;
    }

    const isLifetime = plan.planKey === "lifetime";
    const nextBillingDate = isLifetime
        ? null
        : calculateNextBillingDate(new Date(), interval || "monthly");

    await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
            plan: plan.planKey,
            billingInterval: isLifetime ? null : interval,
            billingProvider: "ivno",
            billingStatus: "active",
            ivnoOrderId: orderId,
            nextBillingDate,
            isLifetime,
        },
    });

    await prisma.billingLog.create({
        data: {
            workspaceId,
            action: "payment_success",
            provider: "ivno",
            amount,
            currency,
            metadata: data,
        },
    });

    console.log(`[Ivno] Payment successful — workspace: ${workspaceId}, plan: ${plan.planKey}, interval: ${isLifetime ? "lifetime" : interval}`);
}

/**
 * Handle a failed Ivno payment (log only — do not activate any plan)
 */
export async function handleFailedIvnoPayment(
    orderId: string,
    amount: number,
    currency: string,
    data: any
) {
    const parts = orderId.split(".");
    const workspaceId = parts.length >= 2 ? parts[1] : "unknown";

    try {
        await prisma.billingLog.create({
            data: {
                workspaceId,
                action: "payment_failed",
                provider: "ivno",
                amount,
                currency,
                metadata: data,
            },
        });
    } catch (err) {
        console.error("[Ivno] Failed to log payment failure:", err);
    }

    console.warn(`[Ivno] Payment failed — orderId: ${orderId}`);
}

/**
 * Calculate next billing date based on interval
 */
function calculateNextBillingDate(fromDate: Date, interval: "monthly" | "annual"): Date {
    const next = new Date(fromDate);
    if (interval === "annual") {
        next.setFullYear(next.getFullYear() + 1);
    } else {
        next.setMonth(next.getMonth() + 1);
    }
    return next;
}
