
export interface IvnoPaymentRequest {
    amount: number;
    currency: string;
    order_id: string;
    description: string;
    return_url: string;
    webhook_url: string;
    email: string;
    domain: string;
    include_fee?: boolean;
}

export interface IvnoPaymentResponse {
    success: boolean;
    payment_url: string;
    transaction_id: string;
    orderId: string;
    amount: number;
    currency: string;
}

export async function createIvnoPayment(data: IvnoPaymentRequest): Promise<IvnoPaymentResponse> {
    const apiKey = process.env.IVNO_API_KEY;
    const apiSecret = process.env.IVNO_API_SECRET;
    // According to full docs: https://app.ivno.io/api/ivno/v1/payments/create
    const apiUrl = process.env.IVNO_API_URL || "https://app.ivno.io/api/ivno/v1/payments/create";

    if (!apiKey || !apiSecret) {
        throw new Error("IVNO_API_KEY or IVNO_API_SECRET is not defined");
    }

    console.log(`[Ivno] Initializing payment at ${apiUrl}...`);

    const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Api-Key": apiKey,
            "X-Api-Secret": apiSecret,
        },
        body: JSON.stringify({
            ...data,
            include_fee: data.include_fee ?? true
        }),
    });

    const text = await response.text();
    let result: any;

    try {
        result = JSON.parse(text);
    } catch (e) {
        console.error("[Ivno] Received non-JSON response:", text);
        throw new Error(`Ivno API error (Non-JSON): ${text.substring(0, 150)}...`);
    }

    if (!response.ok || result.success === false) {
        console.error("Ivno Payment Creation Error:", result);
        throw new Error(result.message || result.error || `Failed to create Ivno payment: ${response.statusText}`);
    }

    return result as IvnoPaymentResponse;
}
