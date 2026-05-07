import { PrismaClient } from "@prisma/client";

/**
 * THETA PM - CORE DATABASE ARCHITECTURE (MULTI-SHARD SINGLETON)
 * 
 * This module manages the connection lifecycle for 4 distinct MongoDB shards.
 * It implements a universal singleton pattern to prevent connection pool exhaustion 
 * in serverless environments (Next.js/Vercel).
 */

declare global {
  var __prismaShards: {
    shard1?: PrismaClient;
    shard2?: PrismaClient;
    shard3?: PrismaClient;
    shard4?: PrismaClient;
  } | undefined;
}

// Initialize the global store
const globalStore = globalThis.__prismaShards || {};
if (!globalThis.__prismaShards) {
  globalThis.__prismaShards = globalStore;
}

const createClient = (shardName: string, url: string | undefined) => {
  if (!url) {
    console.warn(`[Prisma Audit] No URI provided for ${shardName}. Shard will be disabled.`);
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
    "maxPoolSize=10",
    "retryWrites=true",
    "socketTimeoutMS=30000"
  ];
  
  const finalUrl = sanitizedUrl.includes('?') 
    ? `${sanitizedUrl}&${params.join('&')}` 
    : `${sanitizedUrl}?${params.join('&')}`;

  const maskedUrl = finalUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  console.log(`[Prisma Audit] Re-using/Creating ${shardName} client. URI: ${maskedUrl}`);

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
      console.error(`[Prisma Audit] CRITICAL: ${shardName} failed to connect:`, err.message);
    });

    return client;
  } catch (err: any) {
    console.error(`[Prisma Audit] FAILED to initialize ${shardName}:`, err.message);
    return undefined;
  }
};

// Shard URI Mapping
const uris = [
  process.env.MONGODB_URI_1 || process.env.MONGODB_URI,
  process.env.MONGODB_URI_2,
  process.env.MONGODB_URI_3,
  process.env.MONGODB_URI_4
];

// Initialize/Retrieve Shards from Global Singleton
export const prismaShard1 = globalStore.shard1 || (globalStore.shard1 = createClient("Shard 1", uris[0])!);
export const prismaShard2 = globalStore.shard2 || (globalStore.shard2 = createClient("Shard 2", uris[1]) || prismaShard1);
export const prismaShard3 = globalStore.shard3 || (globalStore.shard3 = createClient("Shard 3", uris[2]) || prismaShard1);
export const prismaShard4 = globalStore.shard4 || (globalStore.shard4 = createClient("Shard 4", uris[3]) || prismaShard1);

// Default export (Legacy support & Global collections)
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
  const shardIndex = hash % 4;

  switch (shardIndex) {
    case 0: return prismaShard1;
    case 1: return prismaShard2 || prismaShard1;
    case 2: return prismaShard3 || prismaShard1;
    case 3: return prismaShard4 || prismaShard1;
    default: return prisma;
  }
}

/**
 * Searches across all shards for a specific record in PARALLEL with timeouts.
 * Optimized for serverless performance.
 */
export async function findAcrossShards<T>(
  modelName: string,
  where: any,
  options: { timeoutMs?: number } = {}
): Promise<{ data: T | null; db: PrismaClient }> {
  const timeoutMs = options.timeoutMs || 3000;
  const shards = [
    { client: prismaShard1, name: "Shard 1" },
    { client: prismaShard2, name: "Shard 2" },
    { client: prismaShard3, name: "Shard 3" },
    { client: prismaShard4, name: "Shard 4" }
  ];

  const searchInShard = async (shardObj: any) => {
    const shard = shardObj.client;
    if (!shard) return null;
    
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), timeoutMs)
      );
      
      // @ts-ignore
      const queryPromise = shard[modelName].findFirst({ where });
      
      const record = await Promise.race([queryPromise, timeoutPromise]);
      if (record) return { data: record as T, db: shard as PrismaClient };
      return null;
    } catch (e) {
      console.warn(`[Shard Search] ${shardObj.name} search failed or timed out for ${modelName}`);
      return null;
    }
  };

  try {
    const results = await Promise.all(shards.map(searchInShard));
    const firstMatch = results.find(r => r !== null);
    
    if (firstMatch) return firstMatch;
  } catch (err) {
    console.error(`[Shard Search] Global search error:`, err);
  }

  return { data: null, db: prismaShard1 };
}
