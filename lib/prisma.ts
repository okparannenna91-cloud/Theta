import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

declare global {
  var __prisma: PrismaClient | undefined;
}

const globalForPrisma = globalThis as typeof globalThis & { __prisma?: PrismaClient };

const url = process.env.MONGODB_URI;
if (!url) {
  logger.error("MONGODB_URI is not set. Database will be unavailable.");
}

const createPrismaClient = () => {
  if (!url) {
    return new Proxy({} as PrismaClient, {
      get() {
        return async () => { throw new Error("No database configured — check MONGODB_URI environment variable"); };
      },
    });
  }

  const sanitizedUrl = url.trim().replace(/[^\x20-\x7E]/g, "").replace(/\.+$/, "");
  const params = [
    "connectTimeoutMS=5000",
    "maxPoolSize=50",
    "retryWrites=true",
    "socketTimeoutMS=30000",
  ];
  const finalUrl = sanitizedUrl.includes("?")
    ? `${sanitizedUrl}&${params.join("&")}`
    : `${sanitizedUrl}?${params.join("&")}`;

  const client = new PrismaClient({
    datasources: { db: { url: finalUrl } },
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

  client.$connect().catch((err) => {
    logger.error("CRITICAL: Prisma failed to connect:", err.message);
  });

  return client;
};

export const prisma: PrismaClient = globalForPrisma.__prisma ?? (globalForPrisma.__prisma = createPrismaClient());
