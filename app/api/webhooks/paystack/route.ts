import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleSuccessfulPayment } from "@/lib/paystack-billing";
import { sendPaymentSuccessEmail } from "@/lib/email";

export async function POST(req: Request) {
    try {
        const rawBody = await req.text();
        const paystackSignature = req.headers.get("x-paystack-signature");

        if (!paystackSignature) {
            return NextResponse.json({ error: "Missing signature" }, { status: 400 });
        }

        // Verify signature
        const hash = crypto
            .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
            .update(rawBody)
            .digest("hex");

        if (hash !== paystackSignature) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
        }

        const event = JSON.parse(rawBody);

        // Handle charge.success (First payment or recurring)
        if (event.event === "charge.success") {
            const data = event.data;
            const metadata = data.metadata;

            // We expect workspaceId in metadata
            const workspaceId = metadata?.workspaceId;
            const planKey = metadata?.planKey;
            const interval = metadata?.interval || "monthly";

            if (!workspaceId) {
                console.error("Payload missing workspaceId in metadata:", metadata);
                return NextResponse.json({ received: true });
            }

            // Extract authorization code for recurring payments
            const authCode = data.authorization?.authorization_code;
            const customerCode = data.customer?.customer_code;
            const amount = data.amount; // in kobo
            const currency = data.currency;

            // Update workspace
            await prisma.workspace.update({
                where: { id: workspaceId },
                data: {
                    plan: planKey || "free",
                    billingInterval: interval,
                    billingProvider: "paystack",
                    billingStatus: "active",
                    paystackAuthCode: authCode,
                    paystackCustomerId: customerCode,
                    currency: currency,
                    billingEmail: data.customer?.email,
                }
            });

            // Use our central handler to set next billing date and log it
            await handleSuccessfulPayment(workspaceId, amount, currency, data);

            // Send confirmation email
            if (data.customer?.email) {
                await sendPaymentSuccessEmail(
                    data.customer.email,
                    planKey || "Growth",
                    `${currency} ${amount / 100}`
                );
            }

            console.log(`Paystack payment successful for workspace ${workspaceId}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("Paystack Webhook Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
