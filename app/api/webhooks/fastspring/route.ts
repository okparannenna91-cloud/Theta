// Verified against latest Prisma schema - Fresh Generate
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    verifyFastSpringSignature,
    FastSpringEvent,
    mapFastSpringProductToPlan,
    mapFastSpringProductToInterval
} from "@/lib/fastspring";
import {
    sendPaymentSuccessEmail,
    sendPaymentFailedEmail
} from "@/lib/email";

export async function POST(req: Request) {
    try {
        const signature = req.headers.get("X-FS-Signature");
        const secret = process.env.FASTSPRING_HMAC_KEY;

        // Read the raw body
        const bodyText = await req.text();

        if (secret) {
            const isValid = verifyFastSpringSignature(bodyText, signature, secret);
            if (!isValid) {
                console.error("Invalid FastSpring signature");
                return new NextResponse("Invalid signature", { status: 401 });
            }
        }

        let payload: any;
        try {
            payload = JSON.parse(bodyText);
        } catch (e) {
            console.error("Failed to parse FastSpring payload", e);
            return new NextResponse("Invalid JSON", { status: 400 });
        }

        const events: FastSpringEvent[] = Array.isArray(payload.events)
            ? payload.events
            : [payload];

        for (const event of events) {
            await processEvent(event);
        }

        return new NextResponse("OK", { status: 200 });

    } catch (error) {
        console.error("FastSpring webhook error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

async function processEvent(event: FastSpringEvent) {
    console.log(`Processing FastSpring event: ${event.type} (${event.id})`);

    try {
        switch (event.type) {
            case "subscription.activated":
                await handleSubscriptionActivated(event);
                break;
            case "subscription.updated":
                await handleSubscriptionUpdated(event);
                break;
            case "subscription.canceled":
            case "subscription.deactivated":
                await handleSubscriptionCanceled(event);
                break;
            case "order.completed":
                await handleOrderCompleted(event);
                break;
            case "payment.failed":
                await handlePaymentFailed(event);
                break;
            default:
                console.log(`Unhandled FastSpring event type: ${event.type}`);
        }
    } catch (e) {
        console.error(`Error processing event ${event.id}:`, e);
    }
}

async function handleSubscriptionActivated(event: FastSpringEvent) {
    const data = event.data;
    const workspaceId = data.tags?.workspaceId;

    if (!workspaceId) return;

    const productPath = data.product || "";
    const plan = mapFastSpringProductToPlan(productPath);
    const interval = mapFastSpringProductToInterval(productPath);

    await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
            plan: plan,
            billingInterval: interval || 'monthly',
            subscriptionId: data.id,
            fastSpringCustomerId: data.account,
            billingProvider: "fastspring",
            billingStatus: "active",
            nextBillingDate: data.nextChargeDate ? new Date(data.nextChargeDate) : null,
            currency: "USD",
            isLifetime: false,
        },
    });

    await prisma.billingLog.create({
        data: {
            workspaceId,
            action: "subscription_activated",
            provider: "fastspring",
            metadata: data
        }
    });

    console.log(`Activated FastSpring subscription for workspace ${workspaceId}`);

    // Send confirmation email
    if (data.contact?.email || data.account) {
        await sendPaymentSuccessEmail(
            data.contact?.email || data.account,
            plan,
            data.totalDisplay || plan
        );
    }
}

async function handleSubscriptionUpdated(event: FastSpringEvent) {
    const data = event.data;
    const workspaceId = data.tags?.workspaceId;

    if (!workspaceId) {
        const workspace = await prisma.workspace.findFirst({ where: { subscriptionId: data.id } });
        if (workspace) {
            await updateWorkspaceSubscription(workspace.id, data);
        }
        return;
    }

    await updateWorkspaceSubscription(workspaceId, data);
}

async function updateWorkspaceSubscription(workspaceId: string, data: any) {
    const productPath = data.product || "";
    const plan = mapFastSpringProductToPlan(productPath);
    const interval = mapFastSpringProductToInterval(productPath);

    await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
            plan: plan,
            billingInterval: interval || 'monthly',
            subscriptionId: data.id,
            billingStatus: data.state === 'active' ? 'active' : 'canceled',
            nextBillingDate: data.nextChargeDate ? new Date(data.nextChargeDate) : null,
        },
    });

    await prisma.billingLog.create({
        data: {
            workspaceId,
            action: "subscription_updated",
            provider: "fastspring",
            metadata: data
        }
    });
}

async function handleSubscriptionCanceled(event: FastSpringEvent) {
    const data = event.data;
    const subId = data.id;

    const workspace = await prisma.workspace.findFirst({ where: { subscriptionId: subId } });
    if (!workspace) return;

    const isDeactivated = event.type === 'subscription.deactivated' || data.state === 'deactivated';

    await prisma.workspace.update({
        where: { id: workspace.id },
        data: {
            billingStatus: isDeactivated ? 'deactivated' : 'canceled',
            // If deactivated, we might want to downgrade to free immediately or later.
            // Guidance says "Grant / revoke access based on webhook events".
            plan: isDeactivated ? 'free' : workspace.plan
        }
    });

    await prisma.billingLog.create({
        data: {
            workspaceId: workspace.id,
            action: event.type,
            provider: "fastspring",
            metadata: data
        }
    });
}

async function handleOrderCompleted(event: FastSpringEvent) {
    const data = event.data;
    const workspaceId = data.tags?.workspaceId;
    if (!workspaceId) return;

    const items = data.items || [];
    const isLifetime = items.some((item: any) => item.product.includes('lifetime'));

    if (isLifetime) {
        await prisma.workspace.update({
            where: { id: workspaceId },
            data: {
                plan: 'lifetime',
                isLifetime: true,
                billingProvider: "fastspring",
                billingStatus: "active",
                currency: "USD",
                fastSpringOrderId: data.id,
                subscriptionId: null
            }
        });

        await prisma.billingLog.create({
            data: {
                workspaceId,
                action: "order_completed_lifetime",
                provider: "fastspring",
                metadata: data
            }
        });
    }
}

async function handlePaymentFailed(event: FastSpringEvent) {
    const data = event.data;
    const subId = data.id;
    const workspace = await prisma.workspace.findFirst({ where: { subscriptionId: subId } });

    if (workspace) {
        await prisma.workspace.update({
            where: { id: workspace.id },
            data: { billingStatus: "past_due" }
        });

        await prisma.billingLog.create({
            data: {
                workspaceId: workspace.id,
                action: "payment_failed",
                provider: "fastspring",
                metadata: data
            }
        });

        // Send failure email
        const billingEmail = workspace.billingEmail;
        if (billingEmail) {
            await sendPaymentFailedEmail(billingEmail, workspace.plan);
        }
    }
}
