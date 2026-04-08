import { NextRequest, NextResponse } from "next/server"

/**
 * Server-side proxy to Nominatim (OpenStreetMap) to avoid browser CORS and to send a valid User-Agent.
 * Used by the listing wizard to resolve pickup_lat / pickup_lng for concrete transport distance.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim()
  if (!q || q.length < 3) {
    return NextResponse.json({ error: "Adresa este prea scurta." }, { status: 400 })
  }

  const url =
    "https://nominatim.openstreetmap.org/search?format=json&q=" +
    encodeURIComponent(q) +
    "&limit=1&countrycodes=ro"

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      // Nominatim requires identifying User-Agent per usage policy
      "User-Agent": "ConstructionHubListingWizard/1.0",
    },
    cache: "no-store",
  })

  if (!res.ok) {
    return NextResponse.json({ error: "Geocodarea a esuat. Incercati din nou." }, { status: 502 })
  }

  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>
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
