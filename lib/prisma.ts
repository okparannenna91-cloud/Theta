import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  shard1: PrismaClient | undefined;
  shard2: PrismaClient | undefined;
  shard3: PrismaClient | undefined;
  shard4: PrismaClient | undefined;
};

const createClient = (url: string | undefined) => {
  if (!url) return undefined;
  return new PrismaClient({
    datasources: {
      db: {
        url,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
};

// Initialize shards
export const prismaShard1 = globalForPrisma.shard1 ?? createClient(process.env.MONGODB_URI_1 || process.env.MONGODB_URI);
export const prismaShard2 = globalForPrisma.shard2 ?? createClient(process.env.MONGODB_URI_2 || process.env.MONGODB_URI);
export const prismaShard3 = globalForPrisma.shard3 ?? createClient(process.env.MONGODB_URI_3 || process.env.MONGODB_URI);
export const prismaShard4 = globalForPrisma.shard4 ?? createClient(process.env.MONGODB_URI_4 || process.env.MONGODB_URI);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.shard1 = prismaShard1;
  globalForPrisma.shard2 = prismaShard2;
  globalForPrisma.shard3 = prismaShard3;
  globalForPrisma.shard4 = prismaShard4;
}

// Default export (Legacy support & Global collections)
// In this architecture, Shard 1 is the primary DB for Users and Workspace metadata
export const prisma = prismaShard1 as PrismaClient;

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
