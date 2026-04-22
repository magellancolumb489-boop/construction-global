"use client"

import dynamic from "next/dynamic"
import { memo } from "react"
import type { LatLng } from "@/lib/api/routing"

// Dynamically import the Leaflet implementation so the browser-only
// `leaflet` module never touches the server bundle. The inner component
// handles all Leaflet imports on its own.
const RouteMapInner = dynamic(
  () => import("./route-map-inner").then((m) => m.RouteMapInner),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full h-48 sm:h-56 md:h-64 rounded-lg border border-zinc-200 bg-zinc-100 animate-pulse motion-reduce:animate-none"
        aria-hidden
      />
    ),
  },
)

export interface RouteMapProps {
  from: LatLng | null
  to: LatLng | null
  // GeoJSON LineString geometry returned from /api/route.
  geometry: unknown
  className?: string
  heightClass?: string
}

function areEqual(a: RouteMapProps, b: RouteMapProps): boolean {
  const key = (p: LatLng | null) =>
    p ? `${p.lat.toFixed(4)},${p.lng.toFixed(4)}` : "null"
  return (
    key(a.from) === key(b.from) &&
    key(a.to) === key(b.to) &&
    a.geometry === b.geometry &&
    a.className === b.className &&
    a.heightClass === b.heightClass
  )
}

// Memoized so unrelated parent state changes (quantity, VAT, etc.) do not
// force a full Leaflet re-init.
export const RouteMap = memo(function RouteMap(props: RouteMapProps) {
  return <RouteMapInner {...props} />
}, areEqual)
