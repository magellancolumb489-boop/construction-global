"use client"

import { useEffect, useMemo, useRef } from "react"
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
} from "react-leaflet"
import L, { type LatLngBoundsLiteral, type LatLngExpression } from "leaflet"
import "leaflet/dist/leaflet.css"
import type { RouteMapProps } from "./route-map"

// Minimal divIcon markers (A/B) — avoid shipping Leaflet's default image
// assets and keep CSS bundled from the package.
const iconA = L.divIcon({
  className: "route-marker",
  html: `<div style="
    width:22px;height:22px;border-radius:9999px;
    background:#10b981;color:#fff;font-size:11px;font-weight:700;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 1px 3px rgba(0,0,0,.35);border:2px solid #fff;">A</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

const iconB = L.divIcon({
  className: "route-marker",
  html: `<div style="
    width:22px;height:22px;border-radius:9999px;
    background:#0284c7;color:#fff;font-size:11px;font-weight:700;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 1px 3px rgba(0,0,0,.35);border:2px solid #fff;">B</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

interface GeoJSONLineString {
  type: "LineString"
  coordinates: [number, number][] // [lng, lat] pairs
}

function isLineString(g: unknown): g is GeoJSONLineString {
  if (!g || typeof g !== "object") return false
  const maybe = g as { type?: unknown; coordinates?: unknown }
  if (maybe.type !== "LineString") return false
  return Array.isArray(maybe.coordinates)
}

// Fit the viewport to the bounds of the polyline (or the A/B pair as fallback).
function FitBounds({
  bounds,
}: {
  bounds: LatLngBoundsLiteral | null
}) {
  const map = useMap()
  const lastKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (!bounds || bounds.length < 2) return
    const key = JSON.stringify(bounds)
    if (lastKeyRef.current === key) return
    lastKeyRef.current = key
    map.fitBounds(bounds, { padding: [32, 32], animate: true })
  }, [bounds, map])
  return null
}

export function RouteMapInner({
  from,
  to,
  geometry,
  className,
  heightClass,
}: RouteMapProps) {
  const polylinePositions: LatLngExpression[] = useMemo(() => {
    if (isLineString(geometry)) {
      return geometry.coordinates.map(([lng, lat]) => [lat, lng])
    }
    if (from && to) return [[from.lat, from.lng], [to.lat, to.lng]]
    return []
  }, [geometry, from, to])

  const bounds: LatLngBoundsLiteral | null = useMemo(() => {
    if (polylinePositions.length >= 2) {
      return polylinePositions.map((p) => {
        if (Array.isArray(p)) return [p[0], p[1]] as [number, number]
        const latLng = p as { lat: number; lng: number }
        return [latLng.lat, latLng.lng] as [number, number]
      })
    }
    if (from) return [[from.lat, from.lng]]
    return null
  }, [polylinePositions, from])

  const center: LatLngExpression = from
    ? [from.lat, from.lng]
    : to
      ? [to.lat, to.lng]
      : [45.9432, 24.9668] // geographic center of Romania

  if (!from && !to) {
    return (
      <div
        className={[
          heightClass ?? "h-48 sm:h-56 md:h-64",
          "rounded-lg border border-dashed border-zinc-300 bg-zinc-50 flex items-center justify-center text-xs text-zinc-500",
          className ?? "",
        ].join(" ")}
      >
        Alegeti adresa de livrare pentru a vedea ruta.
      </div>
    )
  }

  return (
    <div
      className={[
        heightClass ?? "h-48 sm:h-56 md:h-64",
        "rounded-lg overflow-hidden border border-zinc-200",
        className ?? "",
      ].join(" ")}
    >
      <MapContainer
        center={center}
        zoom={from && to ? 8 : 12}
        scrollWheelZoom={false}
        className="w-full h-full"
        attributionControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        {from && <Marker position={[from.lat, from.lng]} icon={iconA} />}
        {to && <Marker position={[to.lat, to.lng]} icon={iconB} />}
        {polylinePositions.length >= 2 && (
          <Polyline
            positions={polylinePositions}
            pathOptions={{ color: "#18181b", weight: 3, opacity: 0.85 }}
          />
        )}
        <FitBounds bounds={bounds} />
      </MapContainer>
    </div>
  )
}
