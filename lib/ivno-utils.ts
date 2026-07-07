import crypto from "crypto";
import { logger } from "@/lib/logger";

const IVNO_MAP_KEY = "ivno:orderMap";

async function storeOrderMapping(orderId: string, workspaceId: string, planKey: string, interval: string): Promise<void> {
  try {
    const { redis } = await import("@/lib/redis/client");
    await redis.set(`${IVNO_MAP_KEY}:${orderId}`, JSON.stringify({ workspaceId, planKey, interval }), { ex: 86400 * 7 });
  } catch {
    logger.warn("[Ivno] Redis unavailable for order mapping; order will be looked up by workspace search fallback");
  }
}

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
