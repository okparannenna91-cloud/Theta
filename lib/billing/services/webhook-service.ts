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

    if (secret) {
      const isValid = await providerInstance.verifyWebhookSignature(rawBody, signature, secret);
      if (!isValid) {
        throw new WebhookSignatureError();
      }
    } else {
      logger.warn(`[Webhook] No secret configured for ${provider}, signature verification disabled`);
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

      case "subscription.created":
      case "subscription.updated":
        logger.info(`[Webhook] ${event.type} received, no action needed`);
        break;

      case "subscription.canceled":
        logger.info(`[Webhook] subscription.canceled received`);
        break;

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
