import { prisma } from "@/lib/prisma";
import { providerRegistry } from "../providers/registry";
import { BillingProvider, WebhookEvent } from "../billing-provider.interface";
import { billingOrchestrator } from "../orchestrator";
import { dunningService } from "./dunning-service";
import { logger } from "@/lib/logger";
import { WebhookSignatureError, DuplicateEventError } from "../errors";

const PROVIDER_SECRETS: Record<string, string | undefined> = {
  paystack: process.env.PAYSTACK_SECRET_KEY,
  ivno: process.env.IVNO_WEBHOOK_SECRET,
  flutterwave: process.env.FLUTTERWAVE_SECRET_HASH,
};

class WebhookService {
  async processEvent(provider: string, rawBody: string, signature: string): Promise<void> {
    const providerInstance = providerRegistry.get(provider);
    if (!providerInstance) {
      logger.error(`[Webhook] Unknown provider: ${provider}`);
      throw new Error(`Unknown billing provider: ${provider}`);
    }

    const secret = PROVIDER_SECRETS[provider];

    if (!secret) {
      logger.error(`[Webhook] No secret configured for ${provider} — rejecting event`);
      throw new WebhookSignatureError();
    }

    const isValid = await providerInstance.verifyWebhookSignature(rawBody, signature, secret);
    if (!isValid) {
      throw new WebhookSignatureError();
    }

    const event = await providerInstance.parseWebhookEvent(rawBody);

    const existing = await prisma.billingEvent.findUnique({
      where: { provider_eventId: { provider, eventId: event.id } },
    });
    if (existing) {
      logger.info(`[Webhook] Duplicate event: ${event.id} for provider ${provider}`);
      return;
    }

    await prisma.billingEvent.create({
      data: {
        provider,
        eventId: event.id,
        eventType: event.type,
        status: "processing",
        rawBody: rawBody as any,
      },
    });

    try {
      await this.routeEvent(event, provider);

      await prisma.billingEvent.updateMany({
        where: { provider, eventId: event.id },
        data: { status: "processed" },
      });
    } catch (error) {
      await prisma.billingEvent.updateMany({
        where: { provider, eventId: event.id },
        data: { status: "failed" },
      });
      throw error;
    }
  }

  private async routeEvent(event: WebhookEvent, provider: string): Promise<void> {
    const workspaceId = await this.resolveWorkspaceId(event, provider);

    switch (event.type) {
      case "payment.succeeded": {
        if (!workspaceId) {
          logger.warn(`[Webhook] payment.succeeded for ${provider} has no workspaceId, skipping`);
          return;
        }

        // Store Flutterwave payment token if present in authorization data
        if (provider === "flutterwave") {
          await this.storeFlutterwaveToken(workspaceId, event.data);
        }

        const amount = event.data.amount ?? event.data.total ?? 0;
        const currency = event.data.currency ?? "USD";
        const chargeId = event.data.id ?? event.data.reference ?? event.id;
        await billingOrchestrator.handlePaymentSucceeded(
          workspaceId,
          typeof amount === "string" ? parseFloat(amount) : amount,
          currency,
          chargeId,
          provider,
          event.data.metadata
        );
        break;
      }

      case "payment.failed": {
        if (!workspaceId) {
          logger.warn(`[Webhook] payment.failed for ${provider} has no workspaceId, skipping`);
          return;
        }
        await billingOrchestrator.handlePaymentFailed(workspaceId, provider, event.data);
        break;
      }

      case "subscription.created": {
        // When a subscription is created/completed, activate it on the workspace
        if (workspaceId) {
          await this.handleSubscriptionCreated(workspaceId, event, provider);
        }
        logger.info(`[Webhook] ${event.type} received for workspace ${workspaceId ?? "unknown"}`);
        break;
      }

      case "subscription.updated":
        logger.info(`[Webhook] subscription.updated received`);
        break;

      case "subscription.canceled": {
        if (workspaceId) {
          logger.info(`[Webhook] subscription.canceled for workspace ${workspaceId}`);
          // The subscription cancellation is handled by the cancel API endpoint
          // Webhook confirms the cancellation happened
        }
        break;
      }

      case "customer.updated":
        logger.info(`[Webhook] customer.updated received`);
        break;

      case "charge.dispute.created":
        logger.warn(`[Webhook] charge.dispute.created received`);
        break;

      case "charge.refunded":
        logger.info(`[Webhook] charge.refunded received`);
        break;

      default:
        logger.warn(`[Webhook] Unhandled event type: ${event.type} from ${provider}`);
        break;
    }
  }

  /**
   * Store Flutterwave payment token from checkout verification
   * The authorization object contains the token needed for future tokenized charges
   */
  private async storeFlutterwaveToken(workspaceId: string, eventData: any): Promise<void> {
    try {
      const authorization = eventData.authorization;
      const token = authorization?.token ?? eventData.token;

      if (!token && !authorization) return;

      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { providerMetadata: true, providerCustomerId: true },
      });

      if (!workspace) return;

      const existing = (workspace.providerMetadata as Record<string, any>) ?? {};

      // Store the token and authorization details
      const updatedMetadata = {
        ...existing,
        ...(token ? { token, payment_token: token } : {}),
        ...(authorization ? {
          authorization_code: authorization.authorization_code,
          card_type: authorization.card_type,
          last4: authorization.last4,
          exp_month: authorization.exp_month,
          exp_year: authorization.exp_year,
          bin: authorization.bin,
          channel: authorization.channel,
        } : {}),
        tokenStoredAt: new Date().toISOString(),
      };

      await prisma.workspace.update({
        where: { id: workspaceId },
        data: { providerMetadata: updatedMetadata as any },
      });

      // Also store as a payment method record
      if (authorization?.authorization_code) {
        const pm = await prisma.paymentMethod.upsert({
          where: {
            provider_providerMethodId: {
              provider: "flutterwave",
              providerMethodId: authorization.authorization_code,
            },
          },
          update: { isDefault: true },
          create: {
            provider: "flutterwave",
            providerMethodId: authorization.authorization_code,
            providerCustomerId: workspace.providerCustomerId ?? "",
            workspaceId,
            type: "card",
            last4: authorization.last4,
            brand: authorization.card_type,
            expMonth: authorization.exp_month,
            expYear: authorization.exp_year,
            isDefault: true,
          },
        });
        logger.info(`[Webhook] Payment method stored for workspace ${workspaceId}: ${authorization.authorization_code}`);
      }

      logger.info(`[Webhook] Flutterwave payment token stored for workspace ${workspaceId}`);
    } catch (error: any) {
      logger.error(`[Webhook] Failed to store Flutterwave token for workspace ${workspaceId}: ${error.message}`);
    }
  }

  /**
   * Handle subscription creation/activation from webhook
   * Ensures providerSubscriptionId is properly set
   */
  private async handleSubscriptionCreated(workspaceId: string, event: WebhookEvent, provider: string): Promise<void> {
    try {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: {
          subscriptionStatus: true,
          plan: true,
          billingInterval: true,
          providerSubscriptionId: true,
          providerCustomerId: true,
        },
      });

      if (!workspace) return;

      const subscriptionId = event.data?.id?.toString() ?? event.data?.subscription_code ?? "";

      // If workspace doesn't have a subscription ID yet, set it
      if (!workspace.providerSubscriptionId && subscriptionId) {
        await prisma.workspace.update({
          where: { id: workspaceId },
          data: { providerSubscriptionId: subscriptionId },
        });

        // Also update the subscription record if it exists
        await prisma.subscription.updateMany({
          where: { workspaceId },
          data: { providerSubscriptionId: subscriptionId },
        });

        logger.info(`[Webhook] Provider subscription ID set for workspace ${workspaceId}: ${subscriptionId}`);
      }

      // If workspace is still in trialing status, activate it
      if (workspace.subscriptionStatus === "trialing" && workspace.plan !== "free") {
        await billingOrchestrator.handlePaymentSucceeded(
          workspaceId,
          0,
          "USD",
          event.id,
          provider,
          { source: "webhook_subscription_created" }
        );
        logger.info(`[Webhook] Workspace ${workspaceId} activated from subscription creation`);
      }
    } catch (error: any) {
      logger.error(`[Webhook] Failed to handle subscription created for workspace ${workspaceId}: ${error.message}`);
    }
  }

  private async resolveWorkspaceId(event: WebhookEvent, provider: string): Promise<string | null> {
    const metadata = event.data?.metadata ?? event.data?.meta;
    if (metadata?.workspaceId) return metadata.workspaceId;

    if (event.data?.workspaceId) return event.data.workspaceId;

    if (event.data?.order_id || event.data?.orderId) {
      const orderId = event.data.order_id ?? event.data.orderId;
      const mapping = await this.resolveOrderMapping(orderId);
      if (mapping?.workspaceId) return mapping.workspaceId;
    }

    if (event.data?.customer?.email || event.data?.email) {
      const email = event.data.customer?.email ?? event.data.email;
      const workspace = await prisma.workspace.findFirst({
        where: { billingEmail: email },
        select: { id: true },
      });
      if (workspace) return workspace.id;
    }

    return null;
  }

  private async resolveOrderMapping(orderId: string): Promise<{ workspaceId: string; planKey: string; interval: string } | null> {
    try {
      const { redis } = await import("@/lib/redis/client");
      const raw = await redis.get(`ivno:orderMap:${orderId}`);
      if (raw) return JSON.parse(String(raw));
    } catch {
      const workspace = await prisma.workspace.findFirst({
        where: { ivnoOrderId: orderId },
        select: { id: true, plan: true, billingInterval: true },
      });
      if (workspace) {
        return { workspaceId: workspace.id, planKey: workspace.plan, interval: workspace.billingInterval ?? "monthly" };
      }
    }
    return null;
  }
}

export const webhookService = new WebhookService();
