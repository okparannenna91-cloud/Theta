
import { redis } from "@/lib/redis/client";

export interface RateLimitOptions {
    interval: number;
    uniqueTokenPerInterval: number;
}

export function rateLimit(options: RateLimitOptions) {
    return {
        check: async (_res: Response | any, limit: number, token: string) => {
            try {
                const key = `ratelimit:${token}`;
                const windowSeconds = Math.ceil(options.interval / 1000);
                const count = await redis.incr(key);
                if (count === 1) {
                    await redis.expire(key, windowSeconds);
                }
                if (count > limit) {
                    throw new Error('Rate limit exceeded');
                }
                return Promise.resolve();
            } catch (error: any) {
                if (error.message === 'Rate limit exceeded') {
                    return Promise.reject(error);
                }
                return Promise.resolve();
            }
        },
    };
}
