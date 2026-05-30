const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_API_URL = "https://api.paystack.co";

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

export const paystack = {
    /**
     * Initialize a transaction
     */
    async initializeTransaction(data: {
        email: string;
        amount: number; // in lowest currency unit (e.g. Kobo for NGN, Cents for USD)
        reference?: string;
        callback_url?: string;
        metadata?: any;
        plan?: string; // Optional: Paystack Plan Code for recurring subscriptions
        currency?: string;
    }): Promise<PaystackInitializeResponse> {
        try {
            const response = await fetch(`${PAYSTACK_API_URL}/transaction/initialize`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ ...data, currency: data.currency || "NGN" }),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || "Failed to initialize Paystack transaction");
            }
            return result;
        } catch (error: any) {
            console.error("Paystack Initialize Error:", error.message);
            throw error;
        }
    },

    /**
     * Verify a transaction
     */
    async verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
        try {
            const response = await fetch(`${PAYSTACK_API_URL}/transaction/verify/${reference}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                },
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || "Failed to verify Paystack transaction");
            }
            return result;
        } catch (error: any) {
            console.error("Paystack Verify Error:", error.message);
            throw error;
        }
    },

    /**
     * Create a plan
     */
    async createPlan(data: {
        name: string;
        interval: "hourly" | "daily" | "weekly" | "monthly" | "annually";
        amount: number;
        currency?: string;
    }) {
        try {
            const response = await fetch(`${PAYSTACK_API_URL}/plan`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ ...data, currency: "NGN" }), // Allow NGN
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || "Failed to create Paystack plan");
            }
            return result;
        } catch (error: any) {
            console.error("Paystack Create Plan Error:", error.message);
            throw error;
        }
    },

    /**
     * Charge an authorization (Recurring)
     */
    async chargeAuthorization(data: {
        email: string;
        amount: number;
        authorization_code: string;
        reference?: string;
        metadata?: any;
        currency?: string;
    }) {
        try {
            const response = await fetch(`${PAYSTACK_API_URL}/transaction/charge_authorization`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ ...data, currency: data.currency || "NGN" }),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || "Failed to charge Paystack authorization");
            }
            return result;
        } catch (error: any) {
            console.error("Paystack Charge Authorization Error:", error.message);
            throw error;
        }
    }
};
