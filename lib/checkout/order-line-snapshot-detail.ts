/**
 * Human-readable sublines for order line rows (deviz, PDF, emails).
 * Reads `snapshot_json` produced by `public.place_order` (concrete picks + materials logistics).
 */

import {
  MATERIAL_CATEGORY_LABELS,
  MATERIAL_LABELS,
  VEHICLE_LABELS,
  type MaterialCategoryCode,
  type VehicleCode,
} from "@/lib/materials-logistics/catalog"

/** Parses JSON numeric fields that may arrive as string from some clients. */
function asFiniteNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/**
 * Second line under product title: concrete class/consistency, or materials transport plan
 * (+ taxonomy when snapshot includes category/material codes).
 */
export function orderLineSnapshotSubline(
  snap: Record<string, unknown> | null | undefined,
): string | null {
  if (!snap || typeof snap !== "object") return null

  const vehicleRaw =
    typeof snap["materials_vehicle_code"] === "string"
      ? snap["materials_vehicle_code"].trim().toUpperCase()
      : ""

  if (vehicleRaw) {
    const vehicleLabel =
      vehicleRaw in VEHICLE_LABELS
        ? VEHICLE_LABELS[vehicleRaw as VehicleCode]
        : vehicleRaw
    const payload = asFiniteNumber(snap["materials_payload_t"])
    const trips = asFiniteNumber(snap["materials_trips"])
    const mac = snap["materials_macara_addon"] === true

    const parts: string[] = [`Livrare: ${vehicleLabel}`]
    if (payload != null) parts.push(`${payload}t`)
    if (trips != null && trips >= 1) {
      const n = Math.round(trips)
      parts.push(`${n} ${n === 1 ? "cursă" : "curse"}`)
    }
    if (mac) parts.push("+macara")

    const catCode =
      typeof snap["materials_category_code"] === "string"
        ? snap["materials_category_code"].trim()
        : ""
    const matCode =
      typeof snap["materials_material_code"] === "string"
        ? snap["materials_material_code"].trim()
        : ""
    if (catCode && matCode) {
      const catLabel =
        catCode in MATERIAL_CATEGORY_LABELS
          ? MATERIAL_CATEGORY_LABELS[catCode as MaterialCategoryCode]
          : catCode
      const matLabel =
        matCode in MATERIAL_LABELS ? MATERIAL_LABELS[matCode] : matCode.replace(/_/g, " ")
      parts.push(`${catLabel} — ${matLabel}`)
    }

    return parts.join(" · ")
  }

  const klass =
    typeof snap["concrete_class_code"] === "string" ? snap["concrete_class_code"] : ""
  const cons =
    typeof snap["concrete_consistency"] === "string" ? snap["concrete_consistency"] : ""
  if (klass || cons) return [klass, cons].filter(Boolean).join(" · ")

  return null
}
