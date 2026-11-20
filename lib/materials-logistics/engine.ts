/**
 * Pure matching logic: seller offers + material spec → suggestions and buyer options.
 */
import type { MaterialCategoryCode, VehicleCode } from "./catalog"
import {
  defaultMarketplaceVehiclesForCategory,
  isBulkAggregateCategory,
  isDenseMaterial,
  isLongMaterial,
  isPalletTypical,
  isValidPayload,
  isVolumetricMaterial,
  MATERIAL_CATEGORY_LABELS,
  MATERIAL_LABELS,
  materialProfile,
  PAYLOAD_OPTIONS_BY_VEHICLE,
  requiresTanker,
  SMALL_DIMS_VEHICLE_PRIORITY,
  vehiclesForLongMaterial,
  VEHICLE_LABELS,
} from "./catalog"

export interface MaterialLogisticsSpec {
  categoryCode: MaterialCategoryCode
  materialCode: string
  /** Max piece length (m) when long material; null if unknown / N/A */
  maxPieceLengthM: number | null
  palletSacKg: number | null
  palletPieces: number | null
  palletTotalKg: number | null
  macaraAddon: boolean
  macaraFee: number | null
  allowNonBulkTransport: boolean
}

export interface TransportOfferRow {
  vehicleCode: VehicleCode
  payloadT: number
}

/** Rough volumetric capacity (m3) per haul for trip estimation when volume-led. */
function nominalVolumeCapacityM3(vehicle: VehicleCode): number {
  switch (vehicle) {
    case "DUBA":
      return 10
    case "AUTOUTILITARA":
      return 14
    case "CAMION_BENA":
    case "CAMION_HIAB":
      return 28
    case "TIR":
      return 42
    case "TRAILER":
      return 48
    case "CAMION_PLATFORMA":
      return 34
    case "AUTOBASCULANTA":
      return 18
    default:
      return 20
  }
}

/** Fallback kg per piece when neither seller nor profile knows (legacy listings). */
const FALLBACK_KG_PER_UNIT = 25
/** Fallback bulk density when the material has no profile (legacy listings). */
const FALLBACK_DENSITY_KG_M3 = 1600
/** One "cupa" (loader bucket) is treated as 1 m3. */
const CUP_M3 = 1

function densityFor(spec: MaterialLogisticsSpec): number {
  return materialProfile(spec.categoryCode, spec.materialCode)?.densityKgM3 ?? FALLBACK_DENSITY_KG_M3
}

/** Seller's kg per unit (stored in pallet_sac_kg) wins over the profile default. */
export function kgPerUnitFor(spec: MaterialLogisticsSpec): number {
  if (spec.palletSacKg != null && spec.palletSacKg > 0) return spec.palletSacKg
  return materialProfile(spec.categoryCode, spec.materialCode)?.kgPerUnit ?? FALLBACK_KG_PER_UNIT
}

/**
 * Estimate total mass (kg) from order qty + listing unit + material.
 * Pallet count can only raise the estimate: a buyer-typed pallet count lower
 * than the quantity implies must not shrink the load below the legal trip count.
 * SQL twin: public.materials_estimate_mass_kg_v2 (keep in sync).
 */
export function estimateTotalMassKg(input: {
  qty: number
  unit: string
  spec: MaterialLogisticsSpec
  palletCount?: number | null
}): number {
  const { qty, unit, spec } = input
  const palletCount = input.palletCount ?? null

  let base: number
  switch (unit) {
    case "TON":
      base = qty * 1000
      break
    case "KG":
      base = qty
      break
    case "M3":
      base = qty * densityFor(spec)
      break
    case "CUP":
      base = qty * CUP_M3 * densityFor(spec)
      break
    case "CAMION":
      base = qty * 18000
      break
    case "BUC":
    case "ML":
    default:
      base = qty * kgPerUnitFor(spec)
      break
  }

  if (palletCount != null && palletCount > 0 && spec.palletTotalKg != null && spec.palletTotalKg > 0) {
    return Math.max(base, palletCount * spec.palletTotalKg)
  }
  return base
}

/** Optional volume (m3) for volumetric-led rules. */
export function estimateVolumeM3(input: {
  qty: number
  unit: string
  spec: MaterialLogisticsSpec
  palletCount?: number | null
}): number | null {
  const { qty, unit, spec } = input
  if (unit === "M3") return qty
  if (unit === "CUP") return qty * CUP_M3
  if ((unit === "BUC" || unit === "ML") && isVolumetricMaterial(spec.categoryCode, spec.materialCode)) {
    return (qty * kgPerUnitFor(spec)) / densityFor(spec)
  }
  if (
    input.palletCount != null &&
    input.palletCount > 0 &&
    spec.palletSacKg != null &&
    spec.palletPieces != null &&
    spec.palletTotalKg != null &&
    spec.palletTotalKg > 0
  ) {
    const volPerPallet = spec.palletTotalKg / 400
    return input.palletCount * Math.max(0.5, volPerPallet)
  }
  return null
}

function minTripsForOffer(
  massKg: number,
  volumeM3: number | null,
  vehicle: VehicleCode,
  payloadT: number,
  spec: MaterialLogisticsSpec,
): number {
  const capKg = payloadT * 1000
  const tripsMass = Math.max(1, Math.ceil(massKg / capKg))

  let tripsVol = 1
  if (volumeM3 != null && volumeM3 > 0) {
    const nom = nominalVolumeCapacityM3(vehicle)
    tripsVol = Math.max(1, Math.ceil(volumeM3 / nom))
  }

  const volumetricLed = isVolumetricMaterial(spec.categoryCode, spec.materialCode)
  const denseLed = isDenseMaterial(spec.categoryCode, spec.materialCode)

  if (volumetricLed && !denseLed && volumeM3 != null && volumeM3 > 0) {
    return Math.max(tripsMass, tripsVol)
  }
  if (denseLed) {
    return tripsMass
  }
  return Math.max(tripsMass, tripsVol)
}

/** Unknown piece length on a long material: assume the longest band (safe side). */
const UNKNOWN_LONG_PIECE_M = 12

/**
 * Rule 8 + length + payload validity: filter seller (or marketplace) offers.
 * Applies equally to seller-declared offers and platform defaults.
 * SQL twin: public.materials_offer_allowed.
 */
export function eligibleSellerOffers(
  spec: MaterialLogisticsSpec,
  offers: TransportOfferRow[],
  unit?: string,
): TransportOfferRow[] {
  if (unit && requiresTanker(spec.categoryCode, spec.materialCode, unit)) return []

  const out: TransportOfferRow[] = []
  for (const o of offers) {
    if (!isValidPayload(o.vehicleCode, o.payloadT)) continue

    if (isBulkAggregateCategory(spec.categoryCode)) {
      if (o.vehicleCode !== "AUTOBASCULANTA" && !spec.allowNonBulkTransport) continue
    } else if (o.vehicleCode === "AUTOBASCULANTA") {
      continue
    }

    if (isLongMaterial(spec.categoryCode, spec.materialCode)) {
      const len = spec.maxPieceLengthM ?? UNKNOWN_LONG_PIECE_M
      const allowed = new Set(vehiclesForLongMaterial(len))
      if (!allowed.has(o.vehicleCode)) continue
    }

    out.push(o)
  }
  return out
}

/** Ordered suggestions for UI helper text (seller wizard). */
export function suggestedVehiclesForListing(
  spec: MaterialLogisticsSpec,
  offers: TransportOfferRow[],
  unit?: string,
): string[] {
  if (unit && requiresTanker(spec.categoryCode, spec.materialCode, unit)) {
    return ["Cisterna / siloz (ofertă manuală — nu este în lista de vehicule)"]
  }
  const eligible = eligibleSellerOffers(spec, offers, unit)
  const labels: string[] = []

  const append = (rows: TransportOfferRow[]) => {
    for (const r of rows) {
      const label = `${VEHICLE_LABELS[r.vehicleCode]} ${r.payloadT}t`
      if (!labels.includes(label)) labels.push(label)
    }
  }

  if (eligible.length > 0) {
    const sorted = [...eligible].sort((a, b) => {
      if (a.vehicleCode !== b.vehicleCode) return a.vehicleCode.localeCompare(b.vehicleCode)
      return a.payloadT - b.payloadT
    })
    append(sorted)
    return labels
  }

  const defaults = defaultMarketplaceVehiclesForCategory(spec.categoryCode)
  append(
    eligibleSellerOffers(
      spec,
      defaults.map((d) => ({ vehicleCode: d.vehicle, payloadT: d.payloadT })),
      unit,
    ),
  )

  if (spec.categoryCode === "DIMENSIUNI_MICI") {
    for (const v of SMALL_DIMS_VEHICLE_PRIORITY) {
      const payloads = PAYLOAD_OPTIONS_BY_VEHICLE[v]
      const p = payloads[payloads.length - 1]
      const label = `${VEHICLE_LABELS[v]} ${p}t`
      if (!labels.includes(label)) labels.push(label)
    }
  }

  return labels
}

export interface BuyerTransportOption {
  id: "A" | "B"
  label: string
  vehicleCode: VehicleCode
  payloadT: number
  trips: number
  description: string
}

export interface BuyerTransportPlan {
  options: BuyerTransportOption[]
  /** When true, choices come from marketplace defaults (seller had no offers). */
  marketplaceAssigned: boolean
  /** Set when no vehicle can be proposed automatically; the operator quotes transport. */
  manualReason?: "tanker" | "no_eligible_vehicle"
}

/**
 * Rule 2: multi-trip on smaller vs single run on larger vehicle when both exist.
 */
export function buyerTransportOptions(input: {
  spec: MaterialLogisticsSpec
  sellerOffers: TransportOfferRow[]
  qty: number
  unit: string
  palletCount?: number | null
}): BuyerTransportPlan {
  const { spec, qty, unit } = input
  const massKg = estimateTotalMassKg(input)
  const volumeM3 = estimateVolumeM3(input)

  if (requiresTanker(spec.categoryCode, spec.materialCode, unit)) {
    return { options: [], marketplaceAssigned: true, manualReason: "tanker" }
  }

  let pool = eligibleSellerOffers(spec, input.sellerOffers, unit)
  let marketplaceAssigned = false

  if (pool.length === 0) {
    marketplaceAssigned = true
    pool = eligibleSellerOffers(
      spec,
      defaultMarketplaceVehiclesForCategory(spec.categoryCode).map((d) => ({
        vehicleCode: d.vehicle,
        payloadT: d.payloadT,
      })),
      unit,
    )
  }

  if (pool.length === 0) {
    return { options: [], marketplaceAssigned, manualReason: "no_eligible_vehicle" }
  }

  const scored = pool.map((o) => ({
    ...o,
    trips: minTripsForOffer(massKg, volumeM3, o.vehicleCode, o.payloadT, spec),
  }))

  const singleTrip = scored
    .filter((s) => s.trips === 1)
    .sort((a, b) => a.payloadT - b.payloadT)

  const multiTrip = scored
    .filter((s) => s.trips > 1)
    .sort((a, b) => {
      if (a.trips !== b.trips) return a.trips - b.trips
      return a.payloadT - b.payloadT
    })

  const options: BuyerTransportOption[] = []

  /** Rule 2: prefer „mai multe curse cu vehicul mic” vs „o cursă cu vehicul mare” when both exist. */
  const bestMulti = multiTrip[0]
  const bestSingle = singleTrip[0]

  if (bestMulti && bestSingle) {
    const descA = `${bestMulti.trips} cursa/e cu ${VEHICLE_LABELS[bestMulti.vehicleCode]} (${bestMulti.payloadT}t)`
    options.push({
      id: "A",
      label: `Varianta A: ${bestMulti.trips}x cursa`,
      vehicleCode: bestMulti.vehicleCode,
      payloadT: bestMulti.payloadT,
      trips: bestMulti.trips,
      description: descA,
    })
    options.push({
      id: "B",
      label: `Varianta B: vehicul mai mare`,
      vehicleCode: bestSingle.vehicleCode,
      payloadT: bestSingle.payloadT,
      trips: 1,
      description: `O cursa cu ${VEHICLE_LABELS[bestSingle.vehicleCode]} (${bestSingle.payloadT}t)`,
    })
  } else if (bestMulti) {
    const descA = `${bestMulti.trips} cursa/e cu ${VEHICLE_LABELS[bestMulti.vehicleCode]} (${bestMulti.payloadT}t)`
    options.push({
      id: "A",
      label: `Varianta A: ${bestMulti.trips}x cursa`,
      vehicleCode: bestMulti.vehicleCode,
      payloadT: bestMulti.payloadT,
      trips: bestMulti.trips,
      description: descA,
    })
  } else if (bestSingle) {
    options.push({
      id: "A",
      label: `Varianta A: o cursa`,
      vehicleCode: bestSingle.vehicleCode,
      payloadT: bestSingle.payloadT,
      trips: 1,
      description: `O cursa cu ${VEHICLE_LABELS[bestSingle.vehicleCode]} (${bestSingle.payloadT}t)`,
    })
  }

  return { options, marketplaceAssigned }
}

/**
 * Platform-organised transport (seller does not deliver): orientation tariff
 * from the client brief (06-aprilie): 12 RON/km one way, minimum 200 RON per
 * trip (covers < ~17 km). Open client questions: per-vehicle rate, net vs
 * gross. Shown as an estimate only; the operator confirms the real price, so
 * place_order charges 0 transport for these lines.
 */
export const PLATFORM_TRANSPORT_DEFAULTS = {
  ratePerKm: 12,
  minPerTrip: 200,
} as const

export function estimatePlatformTransport(distanceOneWayKm: number | null, trips: number): number | null {
  if (distanceOneWayKm == null || !Number.isFinite(distanceOneWayKm) || distanceOneWayKm < 0) return null
  const perTrip = Math.max(
    PLATFORM_TRANSPORT_DEFAULTS.minPerTrip,
    distanceOneWayKm * PLATFORM_TRANSPORT_DEFAULTS.ratePerKm,
  )
  return Math.round(perTrip * Math.max(1, trips) * 100) / 100
}

export function materialSpecSummary(spec: MaterialLogisticsSpec): string {
  const cat = MATERIAL_CATEGORY_LABELS[spec.categoryCode]
  const mat = MATERIAL_LABELS[spec.materialCode] ?? spec.materialCode
  return `${cat} — ${mat}`
}

export function requiresPalletSection(spec: MaterialLogisticsSpec): boolean {
  return isPalletTypical(spec.categoryCode, spec.materialCode)
}

export function requiresLengthSection(spec: MaterialLogisticsSpec): boolean {
  return isLongMaterial(spec.categoryCode, spec.materialCode)
}
