/**
 * Flow³ confirmation state machine.
 *
 * Medium-risk actions (per DecisionFramework) are not executed immediately.
 * The bridge/tool layer stores a pending confirmation in Redis, surfaces it to
 * the user (LibreChat card or plain text), and only executes after the user
 * approves with the issued token.
 *
 * Redis key: flow:confirm:{conversationId}   (TTL 15 min)
 *
 * NOTE: This is intentionally a new `flow:` namespace — the legacy `nova:*`
 * keys are untouched until the Phase 4 rename.
 */
import { createHash, randomBytes } from "node:crypto";
import { redis } from "@/lib/redis/client";
import { logger } from "@/lib/logger";

export const CONFIRMATION_TTL_SECONDS = 15 * 60;

export type ConfirmationStatus = "LOW" | "MEDIUM" | "HIGH";

export interface PendingConfirmation {
  /** Opaque approval token issued to the caller. */
  token: string;
  conversationId: string;
  userId: string;
  workspaceId: string;
  toolName: string;
  args: Record<string, unknown>;
  reason: string;
  intent: string;
  riskLevel: ConfirmationStatus;
  createdAt: string;
  expiresAt: string;
}

export interface RequestConfirmationInput {
  conversationId: string;
  userId: string;
  workspaceId: string;
  toolName: string;
  args: Record<string, unknown>;
  reason: string;
  intent: string;
  riskLevel: ConfirmationStatus;
}

function keyFor(conversationId: string): string {
  return `flow:confirm:${conversationId}`;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Store a pending confirmation for a conversation and return the issued record.
 * Only one pending confirmation can exist per conversation at a time.
 */
export async function requestConfirmation(input: RequestConfirmationInput): Promise<PendingConfirmation> {
  const now = new Date();
  const token = randomBytes(24).toString("hex");
  const pending: PendingConfirmation = {
    token,
    conversationId: input.conversationId,
    userId: input.userId,
    workspaceId: input.workspaceId,
    toolName: input.toolName,
    args: input.args,
    reason: input.reason,
    intent: input.intent,
    riskLevel: input.riskLevel,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + CONFIRMATION_TTL_SECONDS * 1000).toISOString(),
  };

  try {
    await redis.set(keyFor(input.conversationId), JSON.stringify(pending), { ex: CONFIRMATION_TTL_SECONDS });
  } catch (error) {
    logger.error("[Confirmation] Failed to store pending confirmation:", error);
    throw error;
  }

  logger.info("[Confirmation] Pending confirmation stored", {
    conversationId: input.conversationId,
    toolName: input.toolName,
    riskLevel: input.riskLevel,
  });

  return pending;
}

/** Fetch the currently pending confirmation for a conversation (if any). */
export async function getPendingConfirmation(conversationId: string): Promise<PendingConfirmation | null> {
  try {
    const raw = (await redis.get(keyFor(conversationId))) as string | null;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingConfirmation;
    if (!parsed.token || !parsed.toolName) return null;
    if (new Date(parsed.expiresAt).getTime() < Date.now()) {
      await clearConfirmation(conversationId);
      return null;
    }
    return parsed;
  } catch (error) {
    logger.error("[Confirmation] Failed to read pending confirmation:", error);
    return null;
  }
}

export async function hasPendingConfirmation(conversationId: string): Promise<boolean> {
  return (await getPendingConfirmation(conversationId)) !== null;
}

/**
 * Resolve a pending confirmation.
 * - approved: deletes the record and returns it (caller executes the tool).
 * - denied: deletes the record and returns null.
 * Validation: token must match AND the userId must be the one who initiated it.
 */
export async function resolveConfirmation(input: {
  conversationId: string;
  token: string;
  userId: string;
  approved: boolean;
}): Promise<PendingConfirmation | null> {
  const pending = await getPendingConfirmation(input.conversationId);
  if (!pending) return null;

  const tokenMatches = hashToken(pending.token) === hashToken(input.token);
  const ownerMatches = pending.userId === input.userId;
  if (!tokenMatches || !ownerMatches) {
    logger.warn("[Confirmation] Token/owner mismatch — rejecting resolution", {
      conversationId: input.conversationId,
      userId: input.userId,
    });
    return null;
  }

  await clearConfirmation(input.conversationId);
  return input.approved ? pending : null;
}

export async function clearConfirmation(conversationId: string): Promise<void> {
  try {
    await redis.del(keyFor(conversationId));
  } catch (error) {
    logger.error("[Confirmation] Failed to clear pending confirmation:", error);
  }
}