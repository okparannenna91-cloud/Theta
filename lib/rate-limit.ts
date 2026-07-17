
import { redis } from "@/lib/redis/client";

export interface RateLimitOptions {
    interval: number;
    uniqueTokenPerInterval: number;
}

const SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

-- Remove expired entries outside the sliding window
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

-- Count current entries in the window
local count = redis.call('ZCARD', key)

if count < limit then
  -- Under limit: add this request and set expiry
  redis.call('ZADD', key, now, now .. '-' .. math.random(1000000))
  redis.call('EXPIRE', key, math.ceil(window / 1000))
  return 1
else
  -- At or over limit: reject
  return 0
end
`;

export function rateLimit(options: RateLimitOptions) {
    return {
        check: async (_res: Response | any, limit: number, token: string) => {
            try {
                const key = `ratelimit:${token}`;
                const now = Date.now();
                const result = await redis.eval(
                    SLIDING_WINDOW_SCRIPT,
                    [key],
                    [options.interval, limit, now]
                );
                if (result === 0) {
                    throw new Error('Rate limit exceeded');
                }
                return Promise.resolve();
            } catch (error: any) {
                if (error.message === 'Rate limit exceeded') {
                    return Promise.reject(error);
                }
                // Fail open: Redis errors should not block app functionality
                return Promise.resolve();
            }
        },
    };
}
