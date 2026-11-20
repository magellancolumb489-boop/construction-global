import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { rateLimit } from "@/lib/rate-limit"

/**
 * Server-side proxy to Nominatim (OpenStreetMap). Auth-only, rate-limited.
 *
 * - Requires a logged-in user (prevents anonymous enumeration of the proxy).
 * - 60 req/min per user via lib/rate-limit.ts: shared Upstash Redis window
 *   when UPSTASH_REDIS_REST_URL/TOKEN are set, else per-instance memory.
 * - `limit` query (1..5) controls single vs multi-result shape so the
 *   same endpoint serves both autocomplete and single-shot origin geocoding.
 */
const RATE_LIMIT = 60 // requests
const WINDOW_MS = 60_000 // per 60s rolling window


/** Nominatim address sub-object returned when addressdetails=1 */
interface NominatimAddress {
  road?: string
  house_number?: string
  city?: string
  town?: string
  village?: string
  municipality?: string
  suburb?: string
  county?: string
  state?: string
  country?: string
  postcode?: string
}

interface NominatimResult {
  lat: string
  lon: string
  display_name: string
  address?: NominatimAddress
}

/** Normalize Nominatim address sub-object into the parts shape the UI consumes */
function normalizeParts(addr: NominatimAddress | undefined) {
  if (!addr) return undefined
  const roadParts = [addr.road, addr.house_number].filter(Boolean)
  const street = roadParts.join(" ") || ""
  const city =
    addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? addr.suburb ?? ""
  const county = addr.county ?? addr.state ?? ""
  const country = addr.country ?? ""
  const postcode = addr.postcode
  return { street, city, county, country, ...(postcode ? { postcode } : {}) }
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

  // Shared Redis window when Upstash is configured (lib/rate-limit.ts), else per-instance memory.
  if (!(await rateLimit("geocode:" + user.id, RATE_LIMIT, WINDOW_MS / 1000)).allowed) {
    return NextResponse.json(
      { error: "Prea multe cereri. Reincercati in cateva secunde." },
      { status: 429 }
    )
  }

  // addressdetails=1 returns a structured address sub-object so we can
  // split the result into street / city / county / country for autofill.
  const url =
    "https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=" +
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
        parts: normalizeParts(row.address),
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
    parts: normalizeParts(first.address),
  })
}
