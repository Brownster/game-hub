/**
 * Simple in-memory rate limiter (VULN-006 fix)
 * For production, consider using Redis-based rate limiting
 */

class RateLimiter {
  constructor(windowMs = 1000, maxRequests = 10) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.requests = new Map(); // key -> { count, resetAt }
  }

  /**
   * Check if request is allowed
   * Returns { allowed: boolean, retryAfter?: number }
   */
  checkLimit(key) {
    const now = Date.now();
    const record = this.requests.get(key);

    // No record or window expired
    if (!record || now >= record.resetAt) {
      this.requests.set(key, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return { allowed: true };
    }

    // Within window
    if (record.count < this.maxRequests) {
      record.count++;
      return { allowed: true };
    }

    // Rate limit exceeded
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  /**
   * Reset rate limit for a key
   */
  reset(key) {
    this.requests.delete(key);
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now >= record.resetAt) {
        this.requests.delete(key);
      }
    }
  }
}

// Pre-configured rate limiters for different operations
export const socketConnectionLimiter = new RateLimiter(60000, 10); // 10 connections per minute per IP
export const chatMessageLimiter = new RateLimiter(10000, 5); // 5 messages per 10 seconds per player
export const gameActionLimiter = new RateLimiter(1000, 20); // 20 actions per second per player
export const roomJoinLimiter = new RateLimiter(60000, 5); // 5 room joins per minute per player

// Cleanup expired entries every 5 minutes
setInterval(() => {
  socketConnectionLimiter.cleanup();
  chatMessageLimiter.cleanup();
  gameActionLimiter.cleanup();
  roomJoinLimiter.cleanup();
}, 5 * 60 * 1000).unref();

export default RateLimiter;
