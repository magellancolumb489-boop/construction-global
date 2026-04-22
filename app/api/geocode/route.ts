import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Server-side proxy to Nominatim (OpenStreetMap). Auth-only, rate-limited.
 *
 * - Requires a logged-in user (prevents anonymous enumeration of the proxy).
 * - Simple in-memory rolling window per user-id: 60 req/min.
 *   This bucket is per-serverless-instance; for hard guarantees swap to
 *   @upstash/ratelimit when Upstash is provisioned.
 * - `limit` query (1..5) controls single vs multi-result shape so the
 *   same endpoint serves both autocomplete and single-shot origin geocoding.
 */
const RATE_LIMIT = 60 // requests
const WINDOW_MS = 60_000 // per 60s rolling window
const buckets = new Map<string, number[]>()

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const prev = buckets.get(key) ?? []
  // Drop timestamps outside the rolling window
  const recent = prev.filter((t) => now - t < WINDOW_MS)
  if (recent.length >= RATE_LIMIT) {
    buckets.set(key, recent)
    return true
  }
  recent.push(now)
  buckets.set(key, recent)
  // Opportunistic cleanup to prevent unbounded memory growth
  if (buckets.size > 10_000) {
    for (const [k, arr] of buckets) {
      if (arr.every((t) => now - t >= WINDOW_MS)) buckets.delete(k)
    }
  }
  return false
}

interface NominatimResult {
  lat: string
  lon: string
  display_name: string
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim()
  if (!q || q.length < 3) {
    return NextResponse.json({ error: "Adresa este prea scurta." }, { status: 400 })
  }
  if (q.length > 200) {
    return NextResponse.json({ error: "Adresa este prea lunga." }, { status: 400 })
  }

  // Clamp limit into [1,5]; default 1 for backwards compatibility.
  const rawLimit = parseInt(req.nextUrl.searchParams.get("limit") ?? "1", 10)
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), 5)
    : 1

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (isRateLimited(user.id)) {
    return NextResponse.json(
      { error: "Prea multe cereri. Reincercati in cateva secunde." },
      { status: 429 }
    )
  }

  const url =
    "https://nominatim.openstreetmap.org/search?format=json&q=" +
    encodeURIComponent(q) +
    `&limit=${limit}&countrycodes=ro`

  let res: Response
  try {
    res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ConstructionHubListingWizard/1.0",
      },
      cache: "no-store",
    })
  } catch {
    return NextResponse.json(
      { error: "Geocodarea a esuat. Incercati din nou." },
      { status: 502 }
    )
  }

  if (!res.ok) {
    return NextResponse.json({ error: "Geocodarea a esuat. Incercati din nou." }, { status: 502 })
  }

  const data = (await res.json()) as NominatimResult[]

  // Multi-result: always return an array (can be empty).
  if (limit > 1) {
    return NextResponse.json({
      results: data.map((row) => ({
        lat: parseFloat(row.lat),
        lng: parseFloat(row.lon),
        displayName: row.display_name,
      })),
    })
  }

  // Legacy single-result shape so existing callers keep working.
  const first = data[0]
  if (!first) {
    return NextResponse.json({ lat: null, lng: null, displayName: null })
  }
  return NextResponse.json({
    lat: parseFloat(first.lat),
    lng: parseFloat(first.lon),
    displayName: first.display_name,
  })
}
