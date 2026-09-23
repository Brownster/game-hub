import { describe, it } from "node:test";
import assert from "node:assert";
import RateLimiter from "../src/util/rateLimiter.js";

describe("Rate Limiter", () => {
  it("should allow requests within limit", () => {
    const limiter = new RateLimiter(1000, 3); // 3 requests per second

    const result1 = limiter.checkLimit("user1");
    assert.ok(result1.allowed);

    const result2 = limiter.checkLimit("user1");
    assert.ok(result2.allowed);

    const result3 = limiter.checkLimit("user1");
    assert.ok(result3.allowed);
  });

  it("should block requests over limit", () => {
    const limiter = new RateLimiter(1000, 2); // 2 requests per second

    limiter.checkLimit("user2");
    limiter.checkLimit("user2");

    const result = limiter.checkLimit("user2");
    assert.ok(!result.allowed);
    assert.ok(result.retryAfter > 0);
  });

  it("should reset after time window", async () => {
    const limiter = new RateLimiter(100, 1); // 1 request per 100ms

    limiter.checkLimit("user3");

    const blockedResult = limiter.checkLimit("user3");
    assert.ok(!blockedResult.allowed);

    // Wait for window to reset
    await new Promise(resolve => setTimeout(resolve, 150));

    const allowedResult = limiter.checkLimit("user3");
    assert.ok(allowedResult.allowed);
  });

  it("should track different keys separately", () => {
    const limiter = new RateLimiter(1000, 1);

    const result1 = limiter.checkLimit("userA");
    assert.ok(result1.allowed);

    const result2 = limiter.checkLimit("userB");
    assert.ok(result2.allowed);

    const result3 = limiter.checkLimit("userA");
    assert.ok(!result3.allowed);

    const result4 = limiter.checkLimit("userB");
    assert.ok(!result4.allowed);
  });

  it("should reset limit for specific key", () => {
    const limiter = new RateLimiter(1000, 1);

    limiter.checkLimit("user4");
    const blockedResult = limiter.checkLimit("user4");
    assert.ok(!blockedResult.allowed);

    limiter.reset("user4");

    const allowedResult = limiter.checkLimit("user4");
    assert.ok(allowedResult.allowed);
  });
});
