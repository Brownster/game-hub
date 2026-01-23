import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://redis:6379";
const testRedis = globalThis.__TEST_REDIS__;

export const redis =
  testRedis ||
  new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
  });

if (!testRedis) {
  redis.on("error", (err) => {
    console.error("[redis] error", err);
  });
}
