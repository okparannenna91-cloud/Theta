import { redis } from "@/lib/redis/client";

const DEFAULT_TTL = 30;

export function cacheKey(prefix: string, ...parts: string[]): string {
  return `cache:${prefix}:${parts.join(":")}`;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw as string) as T;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttl = DEFAULT_TTL): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), { ex: ttl });
  } catch {
    // cache write failure is non-fatal
  }
}

export async function cacheGetOrSet<T>(
  key: string,
  fetch: () => Promise<T>,
  ttl = DEFAULT_TTL,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;
  const value = await fetch();
  await cacheSet(key, value, ttl);
  return value;
}

export async function cacheInvalidate(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch {
    // cache invalidation failure is non-fatal
  }
}

export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  try {
    let cursor = 0;
    do {
      const result = await redis.scan(cursor, { match: pattern, count: 100 });
      cursor = Number(result[0]);
      const keys = result[1];
      if (keys.length > 0) {
        await redis.del(...(keys as string[]));
      }
    } while (cursor !== 0);
  } catch {
    // cache invalidation failure is non-fatal
  }
}
