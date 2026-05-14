import { Redis } from "@upstash/redis";

// Initialize the Upstash Redis client
// This will be used for rate limiting, caching AI responses, and queueing
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});
