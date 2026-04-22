// Client-side helpers that hit the internal /api/geocode and /api/route
// proxies. Both endpoints are auth-gated and rate-limited server-side.
// Keep all upstream URLs out of the browser so CSP remains tight.

export interface GeocodeResult {
  lat: number
  lng: number
  displayName: string
}

export interface LatLng {
  lat: number
  lng: number
}

export interface RouteResult {
  distanceKm: number
  durationMin: number
  geometry: unknown // GeoJSON LineString
}

export type RoutingErrorCode =
  | "unauthorized"
  | "rate_limited"
  | "bad_request"
  | "no_route"
  | "network"
  | "unknown"

export class RoutingError extends Error {
  code: RoutingErrorCode
  constructor(code: RoutingErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

// Status-to-error mapping shared by both helpers.
function mapStatusToError(status: number, body: { error?: string }): RoutingError {
  if (status === 401) {
    return new RoutingError("unauthorized", body.error ?? "Sesiune expirata.")
  }
  if (status === 429) {
    return new RoutingError(
      "rate_limited",
      body.error ?? "Prea multe cereri. Reincearca in cateva secunde.",
    )
  }
  if (status === 400) {
    return new RoutingError("bad_request", body.error ?? "Cerere invalida.")
  }
  if (status === 502) {
    return new RoutingError("no_route", body.error ?? "Ruta nu a putut fi calculata.")
  }
  return new RoutingError("unknown", body.error ?? `Eroare ${status}`)
}

// Small LRU-style client caches collapse repeated calls while typing.
const GEO_CACHE_MAX = 128
const geoCache = new Map<string, GeocodeResult[]>()

const ROUTE_CACHE_MAX = 128
const routeCache = new Map<string, RouteResult>()

function lruSet<V>(map: Map<string, V>, key: string, value: V, max: number) {
  // Touch the entry to make it most-recent.
  if (map.has(key)) map.delete(key)
  map.set(key, value)
  while (map.size > max) {
    const first = map.keys().next().value
    if (!first) break
    map.delete(first)
  }
}

function roundCoord(n: number): string {
  return n.toFixed(4)
}

function routeKey(from: LatLng, to: LatLng): string {
  return `${roundCoord(from.lat)},${roundCoord(from.lng)}->${roundCoord(to.lat)},${roundCoord(to.lng)}`
}

/**
 * Autocomplete-grade search: returns up to `limit` suggestions for a query.
 * Accepts an `AbortSignal` so callers can cancel stale in-flight requests.
 */
export async function searchAddress(
  q: string,
  limit = 5,
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const trimmed = q.trim()
  if (trimmed.length < 3) return []

  const clamped = Math.min(Math.max(limit, 1), 5)
  const cacheKey = `${clamped}::${trimmed.toLowerCase()}`
  const cached = geoCache.get(cacheKey)
  if (cached) return cached

  const url = `/api/geocode?q=${encodeURIComponent(trimmed)}&limit=${clamped}`
  let res: Response
  try {
    res = await fetch(url, { signal, cache: "no-store" })
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") throw err
    throw new RoutingError("network", "Fara conexiune.")
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw mapStatusToError(res.status, body)

  const results: GeocodeResult[] = Array.isArray(body.results)
    ? body.results
    : []
  lruSet(geoCache, cacheKey, results, GEO_CACHE_MAX)
  return results
}

/**
 * Single-shot resolver used to locate the supplier origin from a free-text
 * `location` string when pickup_lat/lng is missing. Caches by query.
 */
export async function geocodeOne(q: string): Promise<GeocodeResult | null> {
  const trimmed = q.trim()
  if (trimmed.length < 3) return null

  const cacheKey = `1::${trimmed.toLowerCase()}`
  const cached = geoCache.get(cacheKey)
  if (cached) return cached[0] ?? null

  const url = `/api/geocode?q=${encodeURIComponent(trimmed)}&limit=1`
  let res: Response
  try {
    res = await fetch(url, { cache: "no-store" })
  } catch {
    throw new RoutingError("network", "Fara conexiune.")
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw mapStatusToError(res.status, body)

  if (body.lat == null || body.lng == null) {
    lruSet(geoCache, cacheKey, [], GEO_CACHE_MAX)
    return null
  }
  const one: GeocodeResult = {
    lat: body.lat,
    lng: body.lng,
    displayName: body.displayName ?? trimmed,
  }
  lruSet(geoCache, cacheKey, [one], GEO_CACHE_MAX)
  return one
}

/**
 * Driving route between two points via /api/route. Results are cached
 * client-side keyed by ~11m-precision coords so typing elsewhere won't
 * re-post while origin/destination remain the same.
 */
export async function computeRoute(
  from: LatLng,
  to: LatLng,
  signal?: AbortSignal,
): Promise<RouteResult> {
  const key = routeKey(from, to)
  const cached = routeCache.get(key)
  if (cached) {
    // Refresh recency so hot pairs stay in the cache.
    lruSet(routeCache, key, cached, ROUTE_CACHE_MAX)
    return cached
  }

  let res: Response
  try {
    res = await fetch("/api/route", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ from, to }),
      cache: "no-store",
      signal,
    })
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") throw err
    throw new RoutingError("network", "Fara conexiune.")
  }

  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw mapStatusToError(res.status, body)

  const result: RouteResult = {
    distanceKm: Number(body.distanceKm) || 0,
    durationMin: Number(body.durationMin) || 0,
    geometry: body.geometry,
  }
  lruSet(routeCache, key, result, ROUTE_CACHE_MAX)
  return result
}
