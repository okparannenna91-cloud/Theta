import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  shard1: PrismaClient | undefined;
  shard2: PrismaClient | undefined;
  shard3: PrismaClient | undefined;
  shard4: PrismaClient | undefined;
};

const createClient = (url: string | undefined) => {
  if (!url) return undefined;
  
  // Robust sanitization: trim and remove non-printable characters or trailing dots
  const sanitizedUrl = url.trim().replace(/[^\x20-\x7E]/g, '').replace(/\.+$/, '');
  if (!sanitizedUrl) return undefined;
  
  // Ensure the URI has a timeout to prevent infinite DNS hangs in Prisma engine
  const finalUrl = sanitizedUrl.includes('?') 
    ? `${sanitizedUrl}&connectTimeoutMS=30000` 
    : `${sanitizedUrl}?connectTimeoutMS=30000`;

  // Diagnostic: Log masked URI to verify formatting on Vercel
  const maskedUrl = finalUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  console.log(`[Prisma Init] Initializing client with masked URI: ${maskedUrl}`);

  return new PrismaClient({
    datasources: {
      db: {
        url: finalUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
};

// Default MongoDB URI - Ensure this is set for Shard 1 (Primary)
const primaryUri = process.env.MONGODB_URI_1 || process.env.MONGODB_URI;

if (!primaryUri && process.env.NODE_ENV !== "test") {
  console.error("CRITICAL: MONGODB_URI or MONGODB_URI_1 is missing from environment variables.");
}

// Initialize shards with URI reuse optimization
const uri1 = process.env.MONGODB_URI_1 || process.env.MONGODB_URI;
const uri2 = process.env.MONGODB_URI_2;
const uri3 = process.env.MONGODB_URI_3;
const uri4 = process.env.MONGODB_URI_4;

export const prismaShard1 = (globalForPrisma.shard1 ?? createClient(uri1)) as PrismaClient;

// Optimization: If secondary shard URIs are missing or identical to Shard 1, reuse Shard 1's client
export const prismaShard2 = (uri2 && uri2 !== uri1) 
    ? (globalForPrisma.shard2 ?? createClient(uri2)) as PrismaClient 
    : prismaShard1;

export const prismaShard3 = (uri3 && uri3 !== uri1 && uri3 !== uri2) 
    ? (globalForPrisma.shard3 ?? createClient(uri3)) as PrismaClient 
    : prismaShard1;

export const prismaShard4 = (uri4 && uri4 !== uri1 && uri4 !== uri2 && uri4 !== uri3) 
    ? (globalForPrisma.shard4 ?? createClient(uri4)) as PrismaClient 
    : prismaShard1;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.shard1 = prismaShard1;
  if (uri2 && uri2 !== uri1) globalForPrisma.shard2 = prismaShard2;
  if (uri3 && uri3 !== uri1 && uri3 !== uri2) globalForPrisma.shard3 = prismaShard3;
  if (uri4 && uri4 !== uri1 && uri4 !== uri2 && uri4 !== uri3) globalForPrisma.shard4 = prismaShard4;
}

// Default export (Legacy support & Global collections)
// In this architecture, Shard 1 is the primary DB for Users and Workspace metadata
export const prisma = prismaShard1;

/**
 * Consistent hashing to select a shard based on workspaceId.
 * This ensures that all data for a specific workspace remains on the same shard.
 */
export function getPrismaClient(workspaceId?: string | null): PrismaClient {
  if (!workspaceId) return prisma;

  // Use the workspaceId string to determine the shard
  // Simple ASCII sum modulus approach
  const hash = workspaceId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const shardIndex = hash % 4;

  switch (shardIndex) {
    case 0: return prismaShard1 as PrismaClient;
    case 1: return (prismaShard2 || prismaShard1) as PrismaClient;
    case 2: return (prismaShard3 || prismaShard1) as PrismaClient;
    case 3: return (prismaShard4 || prismaShard1) as PrismaClient;
    default: return prisma;
  }
}

/**
 * Searches across all shards for a specific record.
 * Use this only when workspaceId is not available.
 */
export async function findAcrossShards<T>(
  modelName: string,
  where: any
): Promise<{ data: T | null; db: PrismaClient }> {
  const shards = [prismaShard1, prismaShard2, prismaShard3, prismaShard4];

  for (const shard of shards) {
    if (!shard) continue;
    try {
      // @ts-ignore - Dynamic access to prisma models
      const record = await shard[modelName].findUnique({ where });
      if (record) return { data: record as T, db: shard as PrismaClient };
    } catch (e) {
      continue;
    }
  }

  return { data: null, db: prismaShard1 as PrismaClient };
}
