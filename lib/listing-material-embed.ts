import type { Tables } from "@/types/supabase"

/** Normalise Supabase embed shape (object vs single-element array) — safe for client bundles. */
export function embedMaterialSpec(
  raw:
    | Tables<"marketplace_listing_material_spec">
    | Tables<"marketplace_listing_material_spec">[]
    | null
    | undefined,
): Tables<"marketplace_listing_material_spec"> | null {
  if (raw == null) return null
  return Array.isArray(raw) ? raw[0] ?? null : raw
}

export function embedMaterialTransport(
  raw:
    | Tables<"marketplace_listing_material_transport">[]
    | Tables<"marketplace_listing_material_transport">
    | null
    | undefined,
): Tables<"marketplace_listing_material_transport">[] {
  if (raw == null) return []
  return Array.isArray(raw) ? raw : [raw]
}
