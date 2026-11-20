import "server-only"

/**
 * Fixed-window rate limiter.
 *
 * With UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN set, counts live in
 * Redis (shared by every serverless instance — a real global budget, AUDIT
 * O11/S12). Without them it falls back to per-instance memory, which is what
 * the app had before. Uses the Upstash REST API directly: no SDK dependency.
 *
 * Fails open on Redis errors (logs once per call) so a cache outage never
 * takes down geocoding or checkout.
 */
export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetSeconds: number
}

const memory = new Map<string, { count: number; resetAt: number }>()

function memoryLimit(key: string, limit: number, windowSec: number): RateLimitResult {
  const now = Date.now()
  const entry = memory.get(key)
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 })
    if (memory.size > 10_000) {
      for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k)
    }
    return { allowed: true, remaining: limit - 1, resetSeconds: windowSec }
  }
  entry.count += 1
  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    resetSeconds: Math.ceil((entry.resetAt - now) / 1000),
  }
}

async function redisLimit(
  url: string,
  token: string,
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const windowId = Math.floor(Date.now() / 1000 / windowSec)
  const redisKey = `rl:${key}:${windowId}`
  // One round trip: INCR then EXPIRE (NX keeps the first TTL).
  const res = await fetch(`${url.replace(/\/+$/, "")}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", redisKey],
      ["EXPIRE", redisKey, String(windowSec), "NX"],
    ]),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`upstash ${res.status}`)
  const out = (await res.json()) as { result?: number; error?: string }[]
  const count = Number(out[0]?.result ?? 0)
  const resetSeconds = windowSec - (Math.floor(Date.now() / 1000) % windowSec)
  return { allowed: count <= limit, remaining: Math.max(0, limit - count), resetSeconds }
}

export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (url && token) {
    try {
      return await redisLimit(url, token, key, limit, windowSec)
    } catch (err) {
      console.warn("[rate-limit] redis unavailable, using memory:", err instanceof Error ? err.message : err)
    }
  }
  return memoryLimit(key, limit, windowSec)
}
