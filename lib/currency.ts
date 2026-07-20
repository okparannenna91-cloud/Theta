/**
 * Currency Utility
 * Handles dynamic exchange rate fetching (USD to NGN)
 */

const FALLBACK_RATE = 1450; // Current approx market rate
const CACHE_KEY = "usd_ngn_rate";
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

interface RateCache {
    rate: number;
    timestamp: number;
}

let memoryCache: RateCache | null = null;

/**
 * Fetch the latest USD to NGN exchange rate.
 * Uses a public API with memory caching to avoid rate limits.
 */
export async function getExchangeRate(): Promise<number> {
    // 1. Check Memory Cache
    if (memoryCache && (Date.now() - memoryCache.timestamp) < CACHE_DURATION) {
        return memoryCache.rate;
    }

    try {
        // We use a free-tier friendly API (requesting just the pair)
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await response.json();

        if (data && data.rates && data.rates.NGN) {
            const rate = data.rates.NGN;
            memoryCache = { rate, timestamp: Date.now() };
            console.log(`[Currency] Updated USD/NGN rate: ${rate}`);
            return rate;
        }
    } catch (error) {
        console.error("[Currency] Failed to fetch exchange rate:", error);
        if (memoryCache) {
            console.warn("[Currency] Using stale cached rate due to API failure");
            return memoryCache.rate;
        }
        throw new Error("Unable to fetch exchange rate. Please try again later.");
    }

    throw new Error("Unable to fetch exchange rate. No rate data in API response.");
}

/**
 * Convert USD Cents to NGN Kobo using current market rate
 */
export async function convertUsdToNgn(usdCents: number): Promise<number> {
    const rate = await getExchangeRate();
    // (Cents / 100) * rate * 100 = Cents * rate
    // We keep it in Kobo (lowest unit)
    return Math.round(usdCents * rate);
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: "USD" | "NGN"): string {
    if (currency === "USD") {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(amount / 100);
    }

    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        currencyDisplay: "symbol",
    }).format(amount / 100);
}
