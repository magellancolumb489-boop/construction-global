/**
 * Romania-only construction materials taxonomy + transport catalog.
 * Codes are stable for DB CHECK constraints and RPC payloads.
 */

export const MATERIAL_CATEGORY_CODES = [
  "ALTE_MATERIALE",
  "AGREGATE_CARIERA",
  "AGREGATE_BALASTIERA",
  "DIMENSIUNI_MEDII",
  "DIMENSIUNI_MICI",
] as const

export type MaterialCategoryCode = (typeof MATERIAL_CATEGORY_CODES)[number]

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategoryCode, string> = {
  ALTE_MATERIALE: "Alte materiale",
  AGREGATE_CARIERA: "Agregate de cariera",
  AGREGATE_BALASTIERA: "Agregate balastiera",
  DIMENSIUNI_MEDII: "Dimensiuni medii",
  DIMENSIUNI_MICI: "Dimensiuni mici",
}

/** Materials per category (composite key category + code). */
export const MATERIALS_BY_CATEGORY: Record<MaterialCategoryCode, readonly string[]> = {
  ALTE_MATERIALE: [
    "ciment",
    "bitum_rutier_50_70",
    "filer",
    "plase_sudate",
    "bare_de_otel",
    "table",
    "etrieri",
    "cherestea",
  ],
  AGREGATE_CARIERA: [
    "criblura_0_4",
    "criblura_4_8",
    "criblura_8_16",
    "criblura_16_31_5",
    "piatra_sparta_0_31",
    "piatra_sparta_0_63",
    "piatra_sparta_40_63",
    "piatra_sparta_90_250",
    "piatra_sparta_100_350",
    "piatra_sparta_0_600",
  ],
  AGREGATE_BALASTIERA: [
    "nisip_0_4",
    "sort_4_8",
    "sort_8_16",
    "sort_16_31_5",
    "piatra_sparta_0_31",
    "balast_0_63",
  ],
  DIMENSIUNI_MEDII: [
    "adezivi",
    "aditivi",
    "ciment",
    "var",
    "ipsos",
    "glet",
    "sapa",
    "tencuiala",
    "caramizi",
    "tigla",
    "bca",
    "hidroizolatie",
    "rigips",
    "vata_minerala_sticla",
    "vata_minerala_bazaltica",
    "vata_ceramica",
  ],
  DIMENSIUNI_MICI: [
    "cuie",
    "sarma_dulgher",
    "suruburi",
    "piulite",
    "saibe",
    "garnituri",
    "scoabe",
    "distantieri",
  ],
}

/** Human labels for wizard / configurare (Romanian). */
export const MATERIAL_LABELS: Record<string, string> = {
  ciment: "Ciment",
  bitum_rutier_50_70: "Bitum rutier 50–70",
  filer: "Filer",
  plase_sudate: "Plase sudate",
  bare_de_otel: "Bare de otel",
  table: "Table",
  etrieri: "Etrieri",
  cherestea: "Cherestea",
  criblura_0_4: "Criblura 0–4",
  criblura_4_8: "Criblura 4–8",
  criblura_8_16: "Criblura 8–16",
  criblura_16_31_5: "Criblura 16–31.5",
  piatra_sparta_0_31: "Piatra sparta 0–31",
  piatra_sparta_0_63: "Piatra sparta 0–63",
  piatra_sparta_40_63: "Piatra sparta 40–63",
  piatra_sparta_90_250: "Piatra sparta 90–250",
  piatra_sparta_100_350: "Piatra sparta 100–350",
  piatra_sparta_0_600: "Piatra sparta 0–600",
  nisip_0_4: "Nisip 0–4",
  sort_4_8: "Sort 4–8",
  sort_8_16: "Sort 8–16",
  sort_16_31_5: "Sort 16–31.5",
  balast_0_63: "Balast 0–63",
  adezivi: "Adezivi",
  aditivi: "Aditivi",
  var: "Var",
  ipsos: "Ipsos",
  glet: "Glet",
  sapa: "Sapa",
  tencuiala: "Tencuiala",
  caramizi: "Caramizi",
  tigla: "Tigla",
  bca: "BCA",
  hidroizolatie: "Hidroizolatie",
  rigips: "Rigips",
  vata_minerala_sticla: "Vata minerala de sticla",
  vata_minerala_bazaltica: "Vata minerala bazaltica",
  vata_ceramica: "Vata ceramica",
  cuie: "Cuie",
  sarma_dulgher: "Sarma dulgher",
  suruburi: "Suruburi",
  piulite: "Piulite",
  saibe: "Saibe",
  garnituri: "Garnituri",
  scoabe: "Scoabe",
  distantieri: "Distantieri",
}

export const VEHICLE_CODES = [
  "DUBA",
  "AUTOUTILITARA",
  "CAMION_BENA",
  "CAMION_PLATFORMA",
  "CAMION_HIAB",
  "TIR",
  "TRAILER",
  "AUTOBASCULANTA",
] as const

export type VehicleCode = (typeof VEHICLE_CODES)[number]

export const VEHICLE_LABELS: Record<VehicleCode, string> = {
  DUBA: "Duba",
  AUTOUTILITARA: "Autoutilitara",
  CAMION_BENA: "Camion cu bena",
  CAMION_PLATFORMA: "Camion cu platforma",
  CAMION_HIAB: "Camion cu macara (HIAB)",
  TIR: "Tir",
  TRAILER: "Trailer",
  AUTOBASCULANTA: "Autobasculanta",
}

/**
 * Allowed payload (tonnes) per vehicle — seller selectable exactly these values.
 * Payload = legal load, not gross vehicle weight. A van (duba, max 3.5 t MAM)
 * carries at most ~1.5 t; 2 t and 3.5 t were MAM values and allowed illegal
 * loads ("nu putem cara 2 tone de nisip cu o duba").
 * SQL twin: public.materials_vehicle_payload_valid.
 */
export const PAYLOAD_OPTIONS_BY_VEHICLE: Record<VehicleCode, readonly number[]> = {
  DUBA: [0.5, 1, 1.5],
  AUTOUTILITARA: [1, 1.5, 2, 3.5],
  CAMION_BENA: [7.5, 12, 18],
  CAMION_PLATFORMA: [7.5, 12, 18],
  CAMION_HIAB: [7.5, 12, 18],
  TIR: [22, 23, 24],
  TRAILER: [24, 26, 28, 30],
  AUTOBASCULANTA: [8, 12, 18, 24],
}

/** Vehicle ordering priority for small-items category (Rule 7). */
export const SMALL_DIMS_VEHICLE_PRIORITY: VehicleCode[] = [
  "DUBA",
  "AUTOUTILITARA",
  "CAMION_BENA",
]

const BULK_CATEGORIES: ReadonlySet<MaterialCategoryCode> = new Set([
  "AGREGATE_CARIERA",
  "AGREGATE_BALASTIERA",
])

export function isBulkAggregateCategory(cat: MaterialCategoryCode): boolean {
  return BULK_CATEGORIES.has(cat)
}

const LONG_MATERIAL_CODES = new Set<string>([
  "bare_de_otel",
  "cherestea",
  "table",
  "plase_sudate",
])

export function isLongMaterial(category: MaterialCategoryCode, materialCode: string): boolean {
  return LONG_MATERIAL_CODES.has(materialCode)
}

const DENSE_CODES = new Set<string>([
  "ciment",
  "filer",
  "bitum_rutier_50_70",
  "bare_de_otel",
  "table",
  "etrieri",
])

export function isDenseMaterial(_category: MaterialCategoryCode, materialCode: string): boolean {
  return DENSE_CODES.has(materialCode)
}

const VOLUMETRIC_CODES = new Set<string>([
  "rigips",
  "vata_minerala_sticla",
  "vata_minerala_bazaltica",
  "vata_ceramica",
  "hidroizolatie",
])

export function isVolumetricMaterial(
  _category: MaterialCategoryCode,
  materialCode: string,
): boolean {
  return VOLUMETRIC_CODES.has(materialCode)
}

const PALLET_TYPICAL_CODES = new Set<string>([
  "ciment",
  "adezivi",
  "caramizi",
  "bca",
  "tigla",
])

export function isPalletTypical(_category: MaterialCategoryCode, materialCode: string): boolean {
  return PALLET_TYPICAL_CODES.has(materialCode)
}

/** Length bands (m) → vehicles allowed before weight filtering (Rule 4). */
export function vehiclesForLongMaterial(maxPieceLengthM: number): VehicleCode[] {
  if (maxPieceLengthM < 2) return ["DUBA", "AUTOUTILITARA"]
  if (maxPieceLengthM < 4) return ["AUTOUTILITARA", "CAMION_BENA", "CAMION_PLATFORMA"]
  if (maxPieceLengthM <= 8) return ["CAMION_BENA", "CAMION_PLATFORMA", "CAMION_HIAB"]
  return ["TRAILER", "TIR"]
}

export function isValidMaterialPair(category: MaterialCategoryCode, materialCode: string): boolean {
  const list = MATERIALS_BY_CATEGORY[category]
  return list.includes(materialCode)
}

export function isValidPayload(vehicle: VehicleCode, payloadT: number): boolean {
  return PAYLOAD_OPTIONS_BY_VEHICLE[vehicle].includes(payloadT)
}

/** Default marketplace vehicles when seller lists none (orientation — full matching in engine). */
export function defaultMarketplaceVehiclesForCategory(
  category: MaterialCategoryCode,
): { vehicle: VehicleCode; payloadT: number }[] {
  if (isBulkAggregateCategory(category)) {
    return [
      { vehicle: "AUTOBASCULANTA", payloadT: 18 },
      { vehicle: "AUTOBASCULANTA", payloadT: 24 },
    ]
  }
  return [
    { vehicle: "DUBA", payloadT: 1.5 },
    { vehicle: "AUTOUTILITARA", payloadT: 3.5 },
    { vehicle: "CAMION_PLATFORMA", payloadT: 12 },
    { vehicle: "TIR", payloadT: 24 },
  ]
}

// ---------------------------------------------------------------------------
// Material profiles: which units make sense, how heavy one unit is, and how
// the material must travel. Mass drives the legal-load trip count, so a wrong
// guess here produces an illegal (overloaded) or overpriced plan.
// SQL twin: public.materials_estimate_mass_kg_v2 / public.materials_requires_tanker.
// Values are orientation defaults; the seller's own kg/unit always wins.
// ---------------------------------------------------------------------------

export type ListingUnitCode = "TON" | "KG" | "M3" | "BUC" | "ML" | "CUP" | "CAMION"

export interface MaterialProfile {
  /** Units a seller may list this material in. */
  units: readonly ListingUnitCode[]
  /** Bulk density (kg/m3) for M3 / CUP listings. */
  densityKgM3: number
  /** Default kg per BUC / ML when the seller gives none. null = seller must give it. */
  kgPerUnit: number | null
}

const AGG: MaterialProfile = { units: ["TON", "M3", "CUP", "CAMION"], densityKgM3: 1600, kgPerUnit: null }

/** Keyed `${category}:${material}` — ciment and piatra_sparta_0_31 exist in two categories. */
export const MATERIAL_PROFILES: Record<string, MaterialProfile> = {
  // Alte materiale — bulk powders/binders travel in tankers; steel/timber are long.
  "ALTE_MATERIALE:ciment": { units: ["TON", "KG", "BUC"], densityKgM3: 1400, kgPerUnit: 40 },
  "ALTE_MATERIALE:bitum_rutier_50_70": { units: ["TON", "KG"], densityKgM3: 1030, kgPerUnit: null },
  "ALTE_MATERIALE:filer": { units: ["TON", "KG", "BUC"], densityKgM3: 1300, kgPerUnit: 40 },
  "ALTE_MATERIALE:plase_sudate": { units: ["BUC", "KG", "TON"], densityKgM3: 7850, kgPerUnit: null },
  "ALTE_MATERIALE:bare_de_otel": { units: ["TON", "KG", "BUC", "ML"], densityKgM3: 7850, kgPerUnit: null },
  "ALTE_MATERIALE:table": { units: ["BUC", "KG", "TON"], densityKgM3: 7850, kgPerUnit: null },
  "ALTE_MATERIALE:etrieri": { units: ["BUC", "KG", "TON"], densityKgM3: 7850, kgPerUnit: null },
  "ALTE_MATERIALE:cherestea": { units: ["M3", "ML", "BUC"], densityKgM3: 550, kgPerUnit: null },
  // Agregate — always weight or volume, never pieces.
  "AGREGATE_CARIERA:criblura_0_4": AGG,
  "AGREGATE_CARIERA:criblura_4_8": AGG,
  "AGREGATE_CARIERA:criblura_8_16": AGG,
  "AGREGATE_CARIERA:criblura_16_31_5": AGG,
  "AGREGATE_CARIERA:piatra_sparta_0_31": AGG,
  "AGREGATE_CARIERA:piatra_sparta_0_63": AGG,
  "AGREGATE_CARIERA:piatra_sparta_40_63": AGG,
  "AGREGATE_CARIERA:piatra_sparta_90_250": AGG,
  "AGREGATE_CARIERA:piatra_sparta_100_350": AGG,
  "AGREGATE_CARIERA:piatra_sparta_0_600": AGG,
  "AGREGATE_BALASTIERA:nisip_0_4": AGG,
  "AGREGATE_BALASTIERA:sort_4_8": AGG,
  "AGREGATE_BALASTIERA:sort_8_16": AGG,
  "AGREGATE_BALASTIERA:sort_16_31_5": AGG,
  "AGREGATE_BALASTIERA:piatra_sparta_0_31": AGG,
  "AGREGATE_BALASTIERA:balast_0_63": { ...AGG, densityKgM3: 1900 },
  // Dimensiuni medii — bags/pieces on pallets; kg/unit is the bag or piece.
  "DIMENSIUNI_MEDII:adezivi": { units: ["BUC", "KG", "TON"], densityKgM3: 1400, kgPerUnit: 25 },
  "DIMENSIUNI_MEDII:aditivi": { units: ["BUC", "KG"], densityKgM3: 1100, kgPerUnit: 25 },
  "DIMENSIUNI_MEDII:ciment": { units: ["BUC", "KG", "TON"], densityKgM3: 1400, kgPerUnit: 40 },
  "DIMENSIUNI_MEDII:var": { units: ["BUC", "KG", "TON"], densityKgM3: 600, kgPerUnit: 20 },
  "DIMENSIUNI_MEDII:ipsos": { units: ["BUC", "KG", "TON"], densityKgM3: 1000, kgPerUnit: 25 },
  "DIMENSIUNI_MEDII:glet": { units: ["BUC", "KG", "TON"], densityKgM3: 1000, kgPerUnit: 20 },
  "DIMENSIUNI_MEDII:sapa": { units: ["BUC", "KG", "TON"], densityKgM3: 1500, kgPerUnit: 40 },
  "DIMENSIUNI_MEDII:tencuiala": { units: ["BUC", "KG", "TON"], densityKgM3: 1400, kgPerUnit: 40 },
  "DIMENSIUNI_MEDII:caramizi": { units: ["BUC", "M3"], densityKgM3: 1000, kgPerUnit: null },
  "DIMENSIUNI_MEDII:tigla": { units: ["BUC", "M3"], densityKgM3: 1000, kgPerUnit: null },
  "DIMENSIUNI_MEDII:bca": { units: ["BUC", "M3"], densityKgM3: 550, kgPerUnit: null },
  "DIMENSIUNI_MEDII:hidroizolatie": { units: ["BUC", "KG"], densityKgM3: 1000, kgPerUnit: null },
  "DIMENSIUNI_MEDII:rigips": { units: ["BUC"], densityKgM3: 800, kgPerUnit: null },
  "DIMENSIUNI_MEDII:vata_minerala_sticla": { units: ["BUC", "M3"], densityKgM3: 20, kgPerUnit: null },
  "DIMENSIUNI_MEDII:vata_minerala_bazaltica": { units: ["BUC", "M3"], densityKgM3: 100, kgPerUnit: null },
  "DIMENSIUNI_MEDII:vata_ceramica": { units: ["BUC", "M3"], densityKgM3: 130, kgPerUnit: null },
  // Dimensiuni mici — hardware sold by weight or piece.
  "DIMENSIUNI_MICI:cuie": { units: ["KG", "BUC"], densityKgM3: 4000, kgPerUnit: null },
  "DIMENSIUNI_MICI:sarma_dulgher": { units: ["KG", "BUC"], densityKgM3: 4000, kgPerUnit: null },
  "DIMENSIUNI_MICI:suruburi": { units: ["KG", "BUC"], densityKgM3: 4000, kgPerUnit: null },
  "DIMENSIUNI_MICI:piulite": { units: ["KG", "BUC"], densityKgM3: 4000, kgPerUnit: null },
  "DIMENSIUNI_MICI:saibe": { units: ["KG", "BUC"], densityKgM3: 4000, kgPerUnit: null },
  "DIMENSIUNI_MICI:garnituri": { units: ["KG", "BUC"], densityKgM3: 1000, kgPerUnit: null },
  "DIMENSIUNI_MICI:scoabe": { units: ["KG", "BUC"], densityKgM3: 4000, kgPerUnit: null },
  "DIMENSIUNI_MICI:distantieri": { units: ["KG", "BUC"], densityKgM3: 1000, kgPerUnit: null },
}

export function materialProfile(category: MaterialCategoryCode, materialCode: string): MaterialProfile | null {
  return MATERIAL_PROFILES[`${category}:${materialCode}`] ?? null
}

export function isUnitAllowedForMaterial(
  category: MaterialCategoryCode,
  materialCode: string,
  unit: string,
): boolean {
  const p = materialProfile(category, materialCode)
  return !!p && (p.units as readonly string[]).includes(unit)
}

/** Seller must state kg per unit when the unit is a piece/length and no safe default exists. */
export function requiresKgPerUnit(category: MaterialCategoryCode, materialCode: string, unit: string): boolean {
  if (unit !== "BUC" && unit !== "ML") return false
  return materialProfile(category, materialCode)?.kgPerUnit == null
}

const TANKER_MATERIALS = new Set<string>([
  "ALTE_MATERIALE:ciment",
  "ALTE_MATERIALE:filer",
  "ALTE_MATERIALE:bitum_rutier_50_70",
])

/**
 * Loose powders and hot bitumen travel only in tankers (cisterna / siloz),
 * which are not in the platform's vehicle list. Bagged product (unit BUC)
 * travels palletised. Tanker loads become a manual transport offer.
 */
export function requiresTanker(category: MaterialCategoryCode, materialCode: string, unit: string): boolean {
  if (!TANKER_MATERIALS.has(`${category}:${materialCode}`)) return false
  if (materialCode === "bitum_rutier_50_70") return true
  return unit !== "BUC"
}

/** Crane unloading makes no sense for tipped bulk or tanker loads. */
export function macaraAllowedFor(category: MaterialCategoryCode, materialCode: string, unit: string): boolean {
  return !isBulkAggregateCategory(category) && !requiresTanker(category, materialCode, unit)
}
