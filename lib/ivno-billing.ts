
import { prisma } from "./prisma";
import { BILLING_PLANS } from "./billing-plans";
import { encryptSensitiveFields, decryptSensitiveFields } from "./field-encryption";
import { logger } from "./logger";
import crypto from "crypto";

/** Lookup by planKey (e.g. "growth", "pro", "theta_plus") */
const PLAN_BY_KEY = BILLING_PLANS.reduce<Record<string, typeof BILLING_PLANS[0]>>(
    (acc, plan) => { acc[plan.planKey] = plan; return acc; }, {}
);

const IVNO_MAP_KEY = "ivno:orderMap";

async function storeOrderMapping(orderId: string, workspaceId: string, planKey: string, interval: string): Promise<void> {
    try {
        const { redis } = await import("./redis/client");
        await redis.set(`${IVNO_MAP_KEY}:${orderId}`, JSON.stringify({ workspaceId, planKey, interval }), { ex: 86400 * 7 });
    } catch {
        logger.warn("[Ivno] Redis unavailable for order mapping; order will be looked up by workspace search fallback");
    }
}

async function resolveOrderMapping(orderId: string): Promise<{ workspaceId: string; planKey: string; interval: string } | null> {
    try {
        const { redis } = await import("./redis/client");
        const raw = await redis.get(`${IVNO_MAP_KEY}:${orderId}`);
        if (raw) return JSON.parse(String(raw));
    } catch {
        // fall through
    }
    return null;
}

/**
 * orderId format: theta.{hash}.{timestamp}
 * Uses a short hash of workspaceId + planKey + interval to avoid leaking internal IDs.
 */
export async function buildIvnoOrderId(
    workspaceId: string,
    planKey: string,
    interval: string
): Promise<string> {
    const hash = crypto.createHash("sha256").update(`${workspaceId}:${planKey}:${interval}`).digest("hex").slice(0, 12);
    const orderId = `theta.${hash}.${Date.now()}`;
    await storeOrderMapping(orderId, workspaceId, planKey, interval);
    return orderId;
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
    const mapping = await resolveOrderMapping(orderId);
    if (!mapping) {
        logger.error("[Ivno] Could not resolve order mapping for:", orderId);
        return;
    }

    const { workspaceId, planKey, interval } = mapping;

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
        logger.error("Workspace not found for Ivno payment:", workspaceId);
        return;
    }

    const plan = PLAN_BY_KEY[planKey];
    if (!plan) {
        logger.error("Plan not found for Ivno payment key:", planKey);
        return;
    }

    const nextBillingDate = calculateNextBillingDate(new Date(), (interval || "monthly") as "monthly" | "annual");

    await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
            plan: plan.planKey,
            billingInterval: interval,
            billingProvider: "ivno",
            billingStatus: "active",
            ivnoOrderId: orderId,
            nextBillingDate,
        },
    });

    await prisma.billingLog.create({
        data: encryptSensitiveFields("billingLog", {
            workspaceId,
            action: "payment_success",
            provider: "ivno",
            amount,
            currency,
            metadata: data,
        }) as any,
    });

    logger.info(`[Ivno] Payment successful — workspace: ${workspaceId}, plan: ${plan.planKey}, interval: ${interval}`);
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
    const mapping = await resolveOrderMapping(orderId);
    const workspaceId = mapping?.workspaceId || "unknown";

    try {
        await prisma.billingLog.create({
            data: encryptSensitiveFields("billingLog", {
                workspaceId,
                action: "payment_failed",
                provider: "ivno",
                amount,
                currency,
                metadata: data,
            }) as any,
        });
    } catch (err) {
        logger.error("[Ivno] Failed to log payment failure:", err);
    }

    logger.warn(`[Ivno] Payment failed — orderId: ${orderId}`);
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
