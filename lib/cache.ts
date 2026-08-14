import { redis } from "@/lib/redis/client";

const DEFAULT_TTL = 30;

// In-process TTL cache. Hits are ~0ms (no network), so cached routes can never
// be slower than their uncached DB work. Upstash remains as a cross-instance
// fallback layer (fire-and-forget writes, never awaited on the critical path).
const memStore = new Map<string, { value: unknown; expiresAt: number }>();
const MAX_MEM_ENTRIES = 2000;
const REMOTE_TIMEOUT_MS = 500;
const CACHE_ENABLED = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

export function cacheKey(prefix: string, ...parts: string[]): string {
  return `cache:${prefix}:${parts.join(":")}`;
}

function memGet<T>(key: string): T | null {
  const entry = memStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    memStore.delete(key);
    return null;
  }
  return entry.value as T;
}

function memSet<T>(key: string, value: T, ttl: number): void {
  if (memStore.size >= MAX_MEM_ENTRIES) {
    const now = Date.now();
    for (const [k, e] of memStore) {
      if (e.expiresAt < now) memStore.delete(k);
    }
  }
  memStore.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
}

function memDelete(pattern: string): void {
  const prefix = pattern.split("*")[0];
  if (!prefix) return;
  for (const k of memStore.keys()) {
    if (k.startsWith(prefix)) memStore.delete(k);
  }
}

function withRemoteTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    p.then(
      (v) => v,
      () => null
    ),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const hit = memGet<T>(key);
  if (hit !== null) return hit;
  if (!CACHE_ENABLED) return null;
  const raw = await withRemoteTimeout(redis.get(key), REMOTE_TIMEOUT_MS);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw as string) as T;
    memSet(key, parsed, DEFAULT_TTL);
    return parsed;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttl = DEFAULT_TTL): Promise<void> {
  memSet(key, value, ttl);
  if (!CACHE_ENABLED) return;
  void withRemoteTimeout(redis.set(key, JSON.stringify(value), { ex: ttl }), REMOTE_TIMEOUT_MS);
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
  memStore.delete(key);
  if (!CACHE_ENABLED) return;
  void withRemoteTimeout(redis.del(key), REMOTE_TIMEOUT_MS);
}

export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  memDelete(pattern);
  if (!CACHE_ENABLED) return;
  // Remote scan/del is best-effort and time-boxed so it can never block a request
  await withRemoteTimeout(
    (async () => {
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
    })(),
    REMOTE_TIMEOUT_MS
  );
}
