
import { prisma } from "./prisma";
import { paystack } from "./paystack";
import { BILLING_PLAN_LOOKUP, getPlanPrice } from "./billing-plans";
import { sendEmail } from "./email";

/**
 * Handle recurring charge for a workspace using Paystack
 */
export async function processPaystackRecurringCharge(workspaceId: string) {
    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: { members: { include: { user: true }, where: { role: "owner" } } }
    });

    if (!workspace || workspace.billingProvider !== "paystack" || !workspace.paystackAuthCode) {
        return;
    }

    const owner = workspace.members[0]?.user;
    if (!owner) return;

    const plan = BILLING_PLAN_LOOKUP[workspace.plan];
    if (!plan || plan.mode === "one_time") return;

    const amount = getPlanPrice(workspace.id, workspace.billingInterval as any, "NGN");

    try {
        const reference = `sub_${workspaceId}_${Date.now()}`;
        const result = await paystack.chargeAuthorization({
            email: owner.email,
            amount,
            authorization_code: workspace.paystackAuthCode,
            reference,
            metadata: { workspaceId, planKey: workspace.plan }
        });

        if (result.status && result.data.status === "success") {
            await handleSuccessfulPayment(workspaceId, amount, "NGN", result.data);
        } else {
            await handleFailedPayment(workspaceId, "payment_failed", result.data);
        }
    } catch (error: any) {
        console.error(`Paystack recurring charge failed for ${workspaceId}:`, error.message);
        await handleFailedPayment(workspaceId, "charge_error", { error: error.message });
    }
}

/**
 * Update workspace after successful payment
 */
export async function handleSuccessfulPayment(workspaceId: string, amount: number, currency: string, data: any) {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) return;

    const nextBillingDate = calculateNextBillingDate(new Date(), workspace.billingInterval as any);

    await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
            billingStatus: "active",
            nextBillingDate,
        }
    });

    await prisma.billingLog.create({
        data: {
            workspaceId,
            action: "payment_success",
            provider: "paystack",
            amount: amount / 100, // Convert kobo to NGN
            currency,
            metadata: data
        }
    });

    // Send success email
    // await sendEmail(...)
}

/**
 * Handle failed payment and implement retry logic
 */
export async function handleFailedPayment(workspaceId: string, action: string, data: any) {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) return;

    // Log the failure
    await prisma.billingLog.create({
        data: {
            workspaceId,
            action,
            provider: "paystack",
            metadata: data
        }
    });

    // Update status to past_due
    await prisma.workspace.update({
        where: { id: workspaceId },
        data: { billingStatus: "past_due" }
    });

    // In a real system, you'd increment a 'retryCount' and schedule another charge.
    // For this implementation, we'll mark as past_due and log it.

    console.log(`Workspace ${workspaceId} marked as past_due.`);
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

/**
 * Run a daily check for due Paystack subscriptions
 */
export async function runPaystackBillingCron() {
    const now = new Date();

    const dueWorkspaces = await prisma.workspace.findMany({
        where: {
            billingProvider: "paystack",
            billingStatus: { in: ["active", "past_due"] },
            nextBillingDate: { lte: now },
            paystackAuthCode: { not: null }
        }
    });

    console.log(`Found ${dueWorkspaces.length} Paystack subscriptions due for charge.`);

    for (const workspace of dueWorkspaces) {
        await processPaystackRecurringCharge(workspace.id);
    }
}
