/**
 * Fixed-window, in-memory rate limiter.
 *
 * IMPORTANT LIMITATION, stated plainly: state lives in the Node process, so
 * with several instances behind a load balancer each enforces the limit
 * separately and the effective ceiling is (limit x instances). It is a real
 * guard against a single client hammering an endpoint, not a distributed
 * quota. Moving to Redis would change only this file.
 *
 * Written generically rather than AI-specific so it can also cover the auth
 * endpoints, which a previous audit flagged as the largest remaining gap.
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();
let lastSweep = 0;
const SWEEP_INTERVAL_MS = 60_000;

/** Drops expired windows so the map cannot grow without bound. */
function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Records one hit against `key` and reports whether it is allowed.
 * Call this only on the path you actually want to meter — for AI content
 * that means immediately before generating, so serving a cached answer
 * never consumes a user's quota.
 */
export function consumeRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = windows.get(key);
  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, retryAfterSeconds: 0 };
}
