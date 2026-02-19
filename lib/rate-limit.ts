
export interface RateLimitOptions {
    interval: number; // in milliseconds
    uniqueTokenPerInterval: number; // Max users per interval
}

export function rateLimit(options: RateLimitOptions) {
    const tokenCache = new Map();

    return {
        check: (res: Response | any, limit: number, token: string) => {
            const now = Date.now();
            const tokenCount = tokenCache.get(token) || [0];

            if (tokenCount[0] === 0) {
                tokenCache.set(token, [1, now]);
            } else {
                const [count, firstRequestTime] = tokenCount;

                if (now - firstRequestTime > options.interval) {
                    // Reset interval
                    tokenCache.set(token, [1, now]);
                } else if (count >= limit) {
                    // Limit reached
                    return Promise.reject(new Error('Rate limit exceeded'));
                } else {
                    // Increment count
                    tokenCache.set(token, [count + 1, firstRequestTime]);
                }
            }

            // Cleanup old entries to prevent memory leaks
            if (tokenCache.size > options.uniqueTokenPerInterval) {
                const oldestEntries = Array.from(tokenCache.entries())
                    .sort((a, b) => a[1][1] - b[1][1])
                    .slice(0, 100);
                oldestEntries.forEach(([key]) => tokenCache.delete(key));
            }

            return Promise.resolve();
        },
    };
}
