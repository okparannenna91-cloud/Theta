
import crypto from 'crypto';

/**
 * FastSpring Webhook Event Types
 */
export type FastSpringEventType =
    | 'subscription.activated'
    | 'subscription.canceled'
    | 'subscription.updated'
    | 'subscription.deactivated'
    | 'order.completed'
    | 'payment.failed';

/**
 * FastSpring Webhook Payload Structure
 * Note: This is a simplified interface based on common FastSpring payloads.
 */
export interface FastSpringEvent {
    id: string;
    type: FastSpringEventType;
    live: boolean;
    processed: boolean;
    created: number; // timestamp
    data: any; // The actual object (Order, Subscription, etc.)
}

export interface FastSpringOrder {
    id: string;
    reference: string;
    buyerReference: string;
    total: number;
    currency: string;
    status: string;
    items: Array<{
        product: string;
        description: string;
        quantity: number;
        display: string;
        sku: string;
    }>;
    tags?: {
        workspaceId?: string;
    };
}

export interface FastSpringSubscription {
    id: string;
    state: string; // active, canceled, deacivated
    product: string;
    nextChargeDate: number; // timestamp
    tags?: {
        workspaceId?: string;
    };
}

/**
 * Verify FastSpring Webhook Signature
 * FastSpring sends a signature in the 'X-FS-Signature' header.
 * The signature is an HMAC-SHA256 hash of the request body using your FastSpring generated private key.
 */
export function verifyFastSpringSignature(
    payload: string,
    signature: string | null,
    secret: string
): boolean {
    if (!signature || !secret) return false;

    const hash = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('base64');

    return hash === signature;
}

/**
 * Map FastSpring Product to Internal Plan
 */
export function mapFastSpringProductToPlan(productPath: string): string {
    // Normalize product path if needed, e.g., 'theta-pro-monthly' -> 'pro'
    // This logic depends on how products are named in FastSpring
    if (productPath.includes('pro')) return 'pro';
    if (productPath.includes('growth')) return 'growth';
    if (productPath.includes('plus')) return 'theta_plus';
    if (productPath.includes('lifetime')) return 'lifetime';
    return 'free';
}

/**
 * Map FastSpring Product to Billing Interval
 */
export function mapFastSpringProductToInterval(productPath: string): string | null {
    if (productPath.includes('monthly')) return 'monthly';
    if (productPath.includes('annual') || productPath.includes('yearly')) return 'annual';
    if (productPath.includes('lifetime')) return 'lifetime';
    return null;
}
