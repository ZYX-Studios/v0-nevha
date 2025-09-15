// Very simple in-memory rate limiter (per-process). Suitable for basic throttling.
// For production-grade limits across regions/instances, use Redis or a hosted rate-limit service.

const counters = new Map<string, { count: number; windowStart: number }>()

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetMs: number
}

export function rateLimitPass(key: string, windowMs = 5 * 60 * 1000, limit = 10): RateLimitResult {
  const now = Date.now()
  const entry = counters.get(key)
  if (!entry) {
    counters.set(key, { count: 1, windowStart: now })
    return { allowed: true, remaining: limit - 1, resetMs: windowMs }
  }
  const elapsed = now - entry.windowStart
  if (elapsed > windowMs) {
    // Reset window
    counters.set(key, { count: 1, windowStart: now })
    return { allowed: true, remaining: limit - 1, resetMs: windowMs }
  }
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetMs: windowMs - elapsed }
  }
  entry.count += 1
  return { allowed: true, remaining: limit - entry.count, resetMs: windowMs - elapsed }
}

export function getClientIp(req: Request): string {
  // Try common proxy headers; fallback to a constant for local dev
  const xfwd = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1"
  // x-forwarded-for may contain a CSV list. Take the first IP.
  const first = xfwd.split(",")[0].trim()
  return first || "127.0.0.1"
}
