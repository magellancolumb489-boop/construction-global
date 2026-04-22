import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

// Auth-only, rate-limited proxy to the OSRM public demo driving router.
// Mirrors the hardening pattern of /api/geocode (auth + rolling-window).
// Keeps the upstream host out of the browser so CSP stays tight and the
// outbound User-Agent is controlled server-side.

const RATE_LIMIT = 60 // requests
const WINDOW_MS = 60_000 // per 60s rolling window
const buckets = new Map<string, number[]>()

// 24h in-process route cache (~11m key resolution)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const CACHE_MAX = 2000
interface CachedRoute {
  value: { distanceKm: number; durationMin: number; geometry: unknown }
  at: number
}
const routeCache = new Map<string, CachedRoute>()

// Rolling-window per-user rate-limiter. Per-instance only; swap to Upstash
// once provisioned if stricter guarantees are needed.
function isRateLimited(key: string): boolean {
  const now = Date.now()
  const prev = buckets.get(key) ?? []
  const recent = prev.filter((t) => now - t < WINDOW_MS)
  if (recent.length >= RATE_LIMIT) {
    buckets.set(key, recent)
    return true
  }
  recent.push(now)
  buckets.set(key, recent)
  if (buckets.size > 10_000) {
    for (const [k, arr] of buckets) {
      if (arr.every((t) => now - t >= WINDOW_MS)) buckets.delete(k)
    }
  }
  return false
}

// Round to ~11m precision so nearby requests collapse onto one cache entry.
function roundCoord(n: number): string {
  return n.toFixed(4)
}

function cacheKey(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): string {
  return `${roundCoord(from.lat)},${roundCoord(from.lng)}->${roundCoord(to.lat)},${roundCoord(to.lng)}`
}

// Simple LRU-ish eviction: drop expired entries first, then oldest by insertion.
function pruneCache(): void {
  const now = Date.now()
  for (const [k, v] of routeCache) {
    if (now - v.at > CACHE_TTL_MS) routeCache.delete(k)
  }
  while (routeCache.size > CACHE_MAX) {
    const firstKey = routeCache.keys().next().value
    if (!firstKey) break
    routeCache.delete(firstKey)
  }
}

const pointSchema = z.object({
  lat: z.number().finite().gte(-90).lte(90),
  lng: z.number().finite().gte(-180).lte(180),
})

const bodySchema = z
  .object({ from: pointSchema, to: pointSchema })
  .refine(
    ({ from, to }) =>
      Math.abs(from.lat - to.lat) > 1e-6 || Math.abs(from.lng - to.lng) > 1e-6,
    { message: "Punctele de plecare si sosire coincid." },
  )

interface OsrmRoute {
  distance: number
  duration: number
  geometry: unknown
}

interface OsrmResponse {
  code: string
  routes?: OsrmRoute[]
}

export async function POST(req: NextRequest) {
  // 1. Parse + validate JSON body before doing any auth work.
  let parsed: z.infer<typeof bodySchema>
  try {
    const json = await req.json()
    const result = bodySchema.safeParse(json)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message ?? "Cerere invalida." },
        { status: 400 },
      )
    }
    parsed = result.data
  } catch {
    return NextResponse.json({ error: "Cerere invalida." }, { status: 400 })
  }

  // 2. Auth gate: never expose the proxy to anonymous callers.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 3. Rate-limit per user.
  if (isRateLimited(user.id)) {
    return NextResponse.json(
      { error: "Prea multe cereri. Reincercati in cateva secunde." },
      { status: 429 },
    )
  }

  // 4. Cache hit short-circuits the outbound OSRM call.
  const key = cacheKey(parsed.from, parsed.to)
  const cached = routeCache.get(key)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return NextResponse.json(cached.value, {
      headers: { "x-route-cache": "hit" },
    })
  }

  // OSRM expects lon,lat order.
  const coords =
    `${parsed.from.lng},${parsed.from.lat};${parsed.to.lng},${parsed.to.lat}`
  const url =
    `https://router.project-osrm.org/route/v1/driving/${coords}` +
    `?overview=full&geometries=geojson&alternatives=false&steps=false`

  let res: Response
  try {
    res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "StrictShop/1.0",
      },
      cache: "no-store",
    })
  } catch {
    return NextResponse.json(
      { error: "Ruta nu a putut fi calculata. Reincercati." },
      { status: 502 },
    )
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: "Ruta nu a putut fi calculata. Reincercati." },
      { status: 502 },
    )
  }

  const data = (await res.json()) as OsrmResponse
  if (data.code !== "Ok" || !data.routes?.[0]) {
    return NextResponse.json(
      { error: "Nu exista o ruta intre puncte." },
      { status: 502 },
    )
  }

  const route = data.routes[0]
  const payload = {
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
    geometry: route.geometry,
  }

  routeCache.set(key, { value: payload, at: Date.now() })
  pruneCache()

  return NextResponse.json(payload, { headers: { "x-route-cache": "miss" } })
}
