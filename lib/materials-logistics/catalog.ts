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
  CAMION_HIAB: "Camion cu macara (HIAB)",
  TIR: "Tir",
  TRAILER: "Trailer",
  AUTOBASCULANTA: "Autobasculanta",
}

/** Allowed payload (tonnes) per vehicle — seller selectable exactly these values. */
export const PAYLOAD_OPTIONS_BY_VEHICLE: Record<VehicleCode, readonly number[]> = {
  DUBA: [1, 1.5, 2, 3.5],
  AUTOUTILITARA: [1, 1.5, 2, 3.5],
  CAMION_BENA: [7.5, 12, 18],
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
  if (maxPieceLengthM < 4) return ["AUTOUTILITARA", "CAMION_BENA"]
  if (maxPieceLengthM <= 8) return ["CAMION_BENA", "CAMION_HIAB"]
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
    { vehicle: "DUBA", payloadT: 3.5 },
    { vehicle: "AUTOUTILITARA", payloadT: 3.5 },
    { vehicle: "CAMION_BENA", payloadT: 12 },
  ]
}
