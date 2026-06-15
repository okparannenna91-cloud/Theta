import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

/**
 * THETA PM - CORE DATABASE ARCHITECTURE (MULTI-SHARD SINGLETON)
 * 
 * This module manages the connection lifecycle for 3 active MongoDB shards.
 * It implements a universal singleton pattern to prevent connection pool exhaustion 
 * in serverless environments (Next.js/Vercel).
 */

declare global {
  var __prismaShards: {
    shard1?: PrismaClient;
    shard2?: PrismaClient;
    shard3?: PrismaClient;
  } | undefined;
}

// Initialize the global store
const globalStore = globalThis.__prismaShards || {};
if (!globalThis.__prismaShards) {
  globalThis.__prismaShards = globalStore;
}

const createClient = (shardName: string, url: string | undefined) => {
  if (!url) {
    logger.warn(`No URI provided for ${shardName}. Shard will be disabled.`);
    return undefined;
  }
  
  // Robust sanitization: trim and remove non-printable characters or trailing dots
  const sanitizedUrl = url.trim().replace(/[^\x20-\x7E]/g, '').replace(/\.+$/, '');
  if (!sanitizedUrl) return undefined;
  
  // Advanced Serverless Configuration:
  // - connectTimeoutMS: 5000 (Fast fail for bad shards)
  // - maxPoolSize: 10 (Ideal for serverless to prevent exhaustion)
  // - retryWrites: true (Robustness against intermittent network blips)
  // - socketTimeoutMS: 30000 (standard)
  const params = [
    "connectTimeoutMS=5000",
    "maxPoolSize=50",
    "retryWrites=true",
    "socketTimeoutMS=30000"
  ];
  
  const finalUrl = sanitizedUrl.includes('?') 
    ? `${sanitizedUrl}&${params.join('&')}` 
    : `${sanitizedUrl}?${params.join('&')}`;

  const maskedUrl = finalUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  logger.debug(`Re-using/Creating ${shardName} client. URI: ${maskedUrl}`);

  try {
    const client = new PrismaClient({
      datasources: {
        db: {
          url: finalUrl,
        },
      },
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });

    // Connection Resilience: Pre-connect check (lazy in Prisma, but we log errors)
    client.$connect().catch(err => {
      logger.error(`CRITICAL: ${shardName} failed to connect:`, err.message);
    });

    return client;
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error(`FAILED to initialize ${shardName}:`, errMsg);
    return undefined;
  }
};

// Shard URI Mapping
const uris = [
  process.env.MONGODB_URI_1 || process.env.MONGODB_URI,
  process.env.MONGODB_URI_2,
  process.env.MONGODB_URI_3,
];

// Initialize/Retrieve Shards from Global Singleton
function requireShard(name: string, uri: string | undefined, fallback: PrismaClient | undefined): PrismaClient {
  const client = createClient(name, uri);
  if (!client) {
    if (fallback) {
      logger.error(`CRITICAL: ${name} failed to initialize — using fallback. Data for ${name} will be stored on the fallback shard!`);
    }
    return fallback ?? (() => { throw new Error(`${name} failed to initialize and no fallback available`); })();
  }
  return client;
}

export const prismaShard1 = globalStore.shard1 || (globalStore.shard1 = createClient("Shard 1", uris[0])!);
export const prismaShard2 = globalStore.shard2 || (globalStore.shard2 = requireShard("Shard 2", uris[1], prismaShard1));
export const prismaShard3 = globalStore.shard3 || (globalStore.shard3 = requireShard("Shard 3", uris[2], prismaShard1));

export const prisma = prismaShard1;

/**
 * Consistent hashing to select a shard based on workspaceId.
 */
export function getPrismaClient(workspaceId?: string | null): PrismaClient {
  if (!workspaceId || typeof workspaceId !== 'string' || ["undefined", "null", ""].includes(workspaceId.trim())) {
    return prisma;
  }

  const sanitizedId = workspaceId.trim().toLowerCase();
  const hash = sanitizedId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const shardIndex = hash % 3;

  switch (shardIndex) {
    case 0: return prismaShard1;
    case 1: return prismaShard2 || prismaShard1;
    case 2: return prismaShard3 || prismaShard1;
    default: return prisma;
  }
}

/**
 * Searches across shards for a specific record with timeouts.
 * When workspaceId is provided, only the owning shard is queried
 * to prevent cross-tenant data leakage.
 * 
 * NOTE: workspaceId should ALWAYS be provided when known.
 * The cross-shard fallback (without workspaceId) is slower, logs a warning,
 * and should only be used as a last resort for lookups where workspaceId
 * is genuinely unavailable.
 */
export async function findAcrossShards<T>(
  modelName: string,
  where: any,
  options: { timeoutMs?: number; workspaceId?: string } = {}
): Promise<{ data: T | null; db: PrismaClient }> {
  const timeoutMs = options.timeoutMs || 3000;

  // If workspaceId is known, scope query to its shard only
  if (options.workspaceId) {
    const scopedClient = getPrismaClient(options.workspaceId);
    try {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const record = await Promise.race([
        // @ts-ignore
        scopedClient[modelName].findFirst({ where }),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(`Timeout (${timeoutMs}ms) on scoped shard`)), timeoutMs);
        }),
      ]);
      clearTimeout(timer);
      if (record) return { data: record as T, db: scopedClient };
    } catch (err: any) {
      logger.warn(`Scoped shard query for ${modelName} failed: ${err.message}`);
      return { data: null, db: scopedClient };
    }
    return { data: null, db: scopedClient };
  }

  // Fallback: search all shards (legacy behavior)
  const shards = [
    { client: prismaShard1, name: "Shard 1" },
    { client: prismaShard2, name: "Shard 2" },
    { client: prismaShard3, name: "Shard 3" },
  ];

  logger.warn(`Cross-shard fallback for ${modelName} — no workspaceId provided`);

  const searchInShard = async (shardObj: any) => {
    const shard = shardObj.client;
    if (!shard) return null;
    
    try {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timeout (${timeoutMs}ms) on ${shardObj.name}`)), timeoutMs);
      });
      
      // @ts-ignore
      const queryPromise = shard[modelName].findFirst({ where });
      
      const record = await Promise.race([queryPromise, timeoutPromise]);
      clearTimeout(timer);
      if (record) return { data: record as T, db: shard as PrismaClient };
      return null;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.warn(`Cross-shard query on ${shardObj.name} for ${modelName} failed: ${errMsg}`);
      return null;
    }
  };

  const results = await Promise.allSettled(shards.map(searchInShard));
  for (const r of results) {
    if (r.status === "fulfilled" && r.value !== null) return r.value;
  }

  return { data: null, db: prismaShard1 };
}
