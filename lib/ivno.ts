
export interface IvnoPaymentRequest {
    amount: number;
    currency: string;
    order_id: string;
    description: string;
    return_url: string;
    webhook_url: string;
    email: string;
    domain: string;
}

export interface IvnoPaymentResponse {
    checkout_url: string;
    payment_id?: string;
}

export async function createIvnoPayment(data: IvnoPaymentRequest): Promise<IvnoPaymentResponse> {
    const apiKey = process.env.IVNO_API_KEY;
    const apiSecret = process.env.IVNO_API_SECRET;
    const apiUrl = process.env.IVNO_API_URL || "https://api.ivno.com/v1/payments";

    if (!apiKey || !apiSecret) {
        throw new Error("IVNO_API_KEY or IVNO_API_SECRET is not defined");
    }

    const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
            "X-API-Secret": apiSecret,
            "Authorization": `Bearer ${apiKey}`, // Keeping Bearer just in case, but adding specific headers
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error("Ivno Payment Creation Error:", error);
        throw new Error(`Failed to create Ivno payment: ${response.statusText}`);
    }

    return await response.json();
}
