import { logger } from "./logger";

const PAYSTACK_API_URL = "https://api.paystack.co";

function getSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error("PAYSTACK_SECRET_KEY is not defined");
  }
  return key;
}

export interface PaystackInitializeResponse {
    status: boolean;
    message: string;
    data: {
        authorization_url: string;
        access_code: string;
        reference: string;
    };
}

export interface PaystackVerifyResponse {
    status: boolean;
    message: string;
    data: {
        id: number;
        domain: string;
        status: string;
        reference: string;
        amount: number;
        message: any;
        gateway_response: string;
        paid_at: string;
        created_at: string;
        channel: string;
        currency: string;
        ip_address: string;
        metadata: any;
        customer: {
            id: number;
            first_name: string;
            last_name: string;
            email: string;
            customer_code: string;
            phone: any;
            metadata: any;
            risk_action: string;
        };
        plan: any;
    };
}

async function paystackFetch(path: string, options: RequestInit = {}): Promise<any> {
  const secretKey = getSecretKey();
  const url = `${PAYSTACK_API_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || `Paystack API error: ${response.statusText}`);
  }
  return result;
}

export const paystack = {
    async initializeTransaction(data: {
        email: string;
        amount: number;
        reference?: string;
        callback_url?: string;
        metadata?: any;
        plan?: string;
        currency?: string;
    }): Promise<PaystackInitializeResponse> {
        try {
            return await paystackFetch("/transaction/initialize", {
                method: "POST",
                body: JSON.stringify({ ...data, currency: data.currency || "NGN" }),
            });
        } catch (error: any) {
            logger.error("Paystack Initialize Error:", error.message);
            throw error;
        }
    },

    async verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
        try {
            return await paystackFetch(`/transaction/verify/${reference}`, {
                method: "GET",
            });
        } catch (error: any) {
            logger.error("Paystack Verify Error:", error.message);
            throw error;
        }
    },

    async createPlan(data: {
        name: string;
        interval: "hourly" | "daily" | "weekly" | "monthly" | "annually";
        amount: number;
        currency?: string;
    }) {
        try {
            return await paystackFetch("/plan", {
                method: "POST",
                body: JSON.stringify({ ...data, currency: "NGN" }),
            });
        } catch (error: any) {
            logger.error("Paystack Create Plan Error:", error.message);
            throw error;
        }
    },

    async chargeAuthorization(data: {
        email: string;
        amount: number;
        authorization_code: string;
        reference?: string;
        metadata?: any;
        currency?: string;
    }) {
        try {
            return await paystackFetch("/transaction/charge_authorization", {
                method: "POST",
                body: JSON.stringify({ ...data, currency: data.currency || "NGN" }),
            });
        } catch (error: any) {
            logger.error("Paystack Charge Authorization Error:", error.message);
            throw error;
        }
    }
};
