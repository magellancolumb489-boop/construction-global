import type { Listing } from "@/lib/api/listings-client"
import type {
  ConcreteClassesRpcPayload,
  MaterialLogisticsRpcPayload,
} from "@/lib/validation/listing.schema"
import { materialLogisticsRpcPayloadSchema } from "@/lib/validation/listing.schema"
import type { VehicleCode } from "@/lib/materials-logistics/catalog"
import type {
  ConcreteClassCode,
  ConcreteClassSelection,
  ConcreteConsistency,
  ListingWizardType,
} from "@/lib/listing-wizard-types"
import { CONCRETE_CLASS_ORDER } from "@/lib/listing-wizard-types"

/** Row shape from Supabase join `marketplace_listing_concrete_classes` (edit / hydrate). */
export interface ListingConcreteClassRow {
  class_code: string
  consistencies: string[] | null
  consistency_prices?: Record<string, unknown> | null
}

/** DB row shape for `marketplace_listing_material_spec` (hydrate edit mode). */
export interface ListingMaterialSpecRow {
  category_code: string
  material_code: string
  pallet_sac_kg: number | null
  pallet_pieces: number | null
  pallet_total_kg: number | null
  max_piece_length_m: number | null
  macara_addon: boolean
  macara_fee: number | null
  allow_non_bulk_transport: boolean
}

/** DB row shape for `marketplace_listing_material_transport`. */
export interface ListingMaterialTransportRow {
  vehicle_code: string
  payload_t: number
}

/** One seller-declared vehicle capacity row in the wizard. */
export interface MaterialTransportRowForm {
  vehicleCode: string
  payloadT: number | ""
}

/** Full client state for the multi-step listing wizard (maps to marketplace_listings columns). */
export interface WizardFormState {
  listingType: ListingWizardType | null
  title: string
  categoryId: string
  description: string
  currency: string
  location: string
  /** Listing-level display price; for concrete = min(per-class), derived on save. */
  price: string
  unit: string
  availableQty: string
  isActive: boolean
  /** Concrete: loading address for geocode */
  pickupAddress: string
  pickupLat: number | null
  pickupLng: number | null
  transportCifa: boolean
  transportPompa: boolean
  /**
   * Once true, auto-toggle of POMPA from "pompabil" selection is disabled so we never
   * override the seller's manual choice.
   */
  transportPompaUserTouched: boolean
  /** Concrete: selected classes with consistencies + per-class price (persisted to child table). */
  concreteClasses: ConcreteClassSelection[]
  minOrderQty: string
  /** Materials / optional equipment: fixed transport add-on */
  transportFee: string
  equipmentCondition: string
  equipmentModel: string
  equipmentYear: string
  serviceArea: string
  /** Seller assumes (insures) delivery. Drives future payout split (see migration comment). */
  sellerAssumesTransport: boolean
  /** Materials logistics — categorie material (cod stabil RO). */
  materialCategoryCode: string
  /** Cod material în cadrul categoriei. */
  materialCode: string
  materialPalletSacKg: string
  materialPalletPieces: string
  materialPalletTotalKg: string
  materialMaxPieceLengthM: string
  materialMacaraAddon: boolean
  materialMacaraFee: string
  /** Rule 8: agregate pot permite și alte vehicule decât autobasculanta. */
  materialAllowNonBulkTransport: boolean
  /** Capacități transport oferite de vânzător (poate fi gol → platforma propune). */
  materialTransportRows: MaterialTransportRowForm[]
}

function isConcreteClassCode(s: string): s is ConcreteClassCode {
  return (CONCRETE_CLASS_ORDER as readonly string[]).includes(s)
}

function parseConsistencies(arr: string[] | null | undefined): ConcreteConsistency[] {
  const allowed = new Set<ConcreteConsistency>(["vartos", "semivartos", "pompabil", "moale"])
  return (arr ?? []).filter((x): x is ConcreteConsistency => allowed.has(x as ConcreteConsistency))
}

/** Map DB child rows to wizard selections (edit mode). */
export function concreteSelectionsFromRows(
  rows: ListingConcreteClassRow[] | undefined | null,
): ConcreteClassSelection[] {
  if (!rows?.length) return []
  const out: ConcreteClassSelection[] = []
  for (const r of rows) {
    if (!isConcreteClassCode(r.class_code)) continue
    const consistencies = parseConsistencies(r.consistencies ?? undefined)
    if (consistencies.length === 0) continue
    const consistencyPrices: Partial<Record<ConcreteConsistency, string>> = {}
    const rawMap = r.consistency_prices
    if (rawMap && typeof rawMap === "object" && !Array.isArray(rawMap)) {
      for (const c of consistencies) {
        const v = (rawMap as Record<string, unknown>)[c]
        if (v == null) continue
        const num = typeof v === "number" ? v : Number(v)
        if (Number.isFinite(num)) consistencyPrices[c] = String(num)
      }
    }
    out.push({ classCode: r.class_code, consistencies, consistencyPrices })
  }
  return out
}

export function emptyWizardState(): WizardFormState {
  return {
    listingType: null,
    title: "",
    categoryId: "",
    description: "",
    currency: "RON",
    location: "",
    price: "",
    unit: "TON",
    availableQty: "0",
    isActive: true,
    pickupAddress: "",
    pickupLat: null,
    pickupLng: null,
    transportCifa: false,
    transportPompa: false,
    transportPompaUserTouched: false,
    concreteClasses: [],
    minOrderQty: "",
    transportFee: "",
    equipmentCondition: "",
    equipmentModel: "",
    equipmentYear: "",
    serviceArea: "",
    sellerAssumesTransport: true,
    materialCategoryCode: "",
    materialCode: "",
    materialPalletSacKg: "",
    materialPalletPieces: "",
    materialPalletTotalKg: "",
    materialMaxPieceLengthM: "",
    materialMacaraAddon: false,
    materialMacaraFee: "",
    materialAllowNonBulkTransport: false,
    materialTransportRows: [],
  }
}

/** Hydrate wizard from an existing DB row (edit mode). Child rows optional until migration applied. */
export function wizardStateFromListing(
  listing: Listing,
  concreteClassRows?: ListingConcreteClassRow[] | null,
  materialSpec?: ListingMaterialSpecRow | null,
  materialTransportRows?: ListingMaterialTransportRow[] | null,
): WizardFormState {
  const modes = listing.transport_modes ?? []
  const lt = (listing.listing_type as ListingWizardType) || "materials"
  const concreteClasses = concreteSelectionsFromRows(concreteClassRows ?? null)
  const mtRows: MaterialTransportRowForm[] = (materialTransportRows ?? []).map((r) => ({
    vehicleCode: r.vehicle_code,
    payloadT: r.payload_t,
  }))
  const spec = materialSpec ?? null
  return {
    listingType: lt,
    title: listing.title ?? "",
    categoryId: listing.category_id != null ? String(listing.category_id) : "",
    description: listing.description ?? "",
    currency: listing.currency ?? "RON",
    location: listing.location ?? "",
    price: listing.price != null ? String(listing.price) : "",
    unit: listing.unit ?? "TON",
    availableQty:
      listing.available_qty != null ? String(listing.available_qty) : "0",
    isActive: listing.is_active ?? true,
    pickupAddress: listing.pickup_address ?? "",
    pickupLat: listing.pickup_lat ?? null,
    pickupLng: listing.pickup_lng ?? null,
    transportCifa: modes.includes("CIFA"),
    transportPompa: modes.includes("POMPA"),
    // Edit: never auto-fight saved transport flags
    transportPompaUserTouched: lt === "concrete",
    concreteClasses,
    minOrderQty:
      listing.min_order_qty != null ? String(listing.min_order_qty) : "",
    transportFee:
      listing.transport_fee != null ? String(listing.transport_fee) : "",
    equipmentCondition: listing.equipment_condition ?? "",
    equipmentModel: listing.equipment_model ?? "",
    equipmentYear:
      listing.equipment_year != null ? String(listing.equipment_year) : "",
    serviceArea: listing.service_area ?? "",
    sellerAssumesTransport: listing.seller_assumes_transport ?? true,
    materialCategoryCode: spec?.category_code ?? "",
    materialCode: spec?.material_code ?? "",
    materialPalletSacKg:
      spec?.pallet_sac_kg != null ? String(spec.pallet_sac_kg) : "",
    materialPalletPieces:
      spec?.pallet_pieces != null ? String(spec.pallet_pieces) : "",
    materialPalletTotalKg:
      spec?.pallet_total_kg != null ? String(spec.pallet_total_kg) : "",
    materialMaxPieceLengthM:
      spec?.max_piece_length_m != null ? String(spec.max_piece_length_m) : "",
    materialMacaraAddon: spec?.macara_addon ?? false,
    materialMacaraFee:
      spec?.macara_fee != null ? String(spec.macara_fee) : "",
    materialAllowNonBulkTransport: spec?.allow_non_bulk_transport ?? false,
    materialTransportRows: mtRows,
  }
}

/** Build transport_modes text[] for concrete (CIFA / POMPA only — never VRAC). */
export function transportModesFromFlags(cifa: boolean, pompa: boolean): string[] {
  const m: string[] = []
  if (cifa) m.push("CIFA")
  if (pompa) m.push("POMPA")
  return m
}

/** Shape passed to `upsert_listing_concrete_classes` RPC (JSON array). */
export function concreteSelectionsToRpcPayload(
  rows: ConcreteClassSelection[],
): ConcreteClassesRpcPayload {
  return rows.map((r) => {
    const consistency_prices: Record<string, number> = {}
    for (const c of r.consistencies) {
      const raw = r.consistencyPrices[c]
      const n = raw != null && String(raw).trim() !== "" ? Number(raw) : Number.NaN
      if (Number.isFinite(n) && n > 0) consistency_prices[c] = n
    }
    return {
      class_code: r.classCode,
      consistencies: [...r.consistencies],
      consistency_prices,
    }
  }) as ConcreteClassesRpcPayload
}

function optPositiveNumber(raw: string): number | undefined {
  const t = raw.trim()
  if (!t) return undefined
  const n = Number(t)
  if (!Number.isFinite(n) || n <= 0) return undefined
  return n
}

/**
 * Construiește payload-ul pentru `upsert_listing_material_logistics` din starea wizardului.
 */
export function buildMaterialLogisticsRpcPayload(
  form: WizardFormState,
): { ok: true; data: MaterialLogisticsRpcPayload } | { ok: false; error: string } {
  const spec = {
    category_code: form.materialCategoryCode.trim(),
    material_code: form.materialCode.trim(),
    pallet_sac_kg: optPositiveNumber(form.materialPalletSacKg) ?? null,
    pallet_pieces: optPositiveNumber(form.materialPalletPieces) ?? null,
    pallet_total_kg: optPositiveNumber(form.materialPalletTotalKg) ?? null,
    max_piece_length_m: optPositiveNumber(form.materialMaxPieceLengthM) ?? null,
    macara_addon: form.materialMacaraAddon,
    macara_fee:
      form.materialMacaraFee.trim() === ""
        ? 0
        : Math.max(0, Number(form.materialMacaraFee) || 0),
    allow_non_bulk_transport: form.materialAllowNonBulkTransport,
  }

  const offers = form.materialTransportRows
    .filter(
      (r) =>
        r.vehicleCode.trim() !== "" &&
        r.payloadT !== "" &&
        Number.isFinite(Number(r.payloadT)),
    )
    .map((r) => ({
      vehicle_code: r.vehicleCode.trim().toUpperCase() as VehicleCode,
      payload_t: Number(r.payloadT),
    }))

  const parsed = materialLogisticsRpcPayloadSchema.safeParse({ spec, offers })
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Date materiale invalide."
    return { ok: false, error: msg }
  }
  return { ok: true, data: parsed.data }
}
