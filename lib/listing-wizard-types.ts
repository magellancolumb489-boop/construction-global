/** User-facing listing kinds — matches DB marketplace_listings.listing_type check constraint. */
export type ListingWizardType = "concrete" | "materials" | "equipment" | "services"

/**
 * Transport modes stored on marketplace_listings.transport_modes (text[]).
 * VRAC remains valid for materials / supplier settings; concrete listings use only CIFA | POMPA.
 */
export type TransportModeCode = "CIFA" | "POMPA" | "VRAC"

/** Subset allowed for concrete listing wizard + DB rows where listing_type = concrete. */
export type ConcreteTransportModeCode = "CIFA" | "POMPA"

/** Standard concrete strength classes (EN 206) — keys match DB marketplace_listing_concrete_classes.class_code. */
export type ConcreteClassCode =
  | "C8/10"
  | "C12/15"
  | "C16/20"
  | "C20/25"
  | "C25/30"
  | "C30/37"
  | "C35/45"

/** Consistency options stored lowercase in DB text[] for RLS / CHECK simplicity. */
export type ConcreteConsistency = "vartos" | "semivartos" | "pompabil" | "moale"

/** Romanian labels for UI (DB keys stay ASCII). */
export const CONSISTENCY_LABELS: Record<ConcreteConsistency, string> = {
  vartos: "Vârtos",
  semivartos: "Semivârtos",
  pompabil: "Pompabil",
  moale: "Moale",
}

/** One selected row in the seller wizard before save (per-consistency price strings). */
export interface ConcreteClassSelection {
  classCode: ConcreteClassCode
  consistencies: ConcreteConsistency[]
  /** Keys only for bifate consistencies; each must parse to a positive number before save. */
  consistencyPrices: Partial<Record<ConcreteConsistency, string>>
}

/** Frozen catalogue: label + optional B mark + allowed consistencies per class. */
export const CONCRETE_CLASS_CATALOG: Readonly<
  Record<
    ConcreteClassCode,
    { label: string; bMark: string | null; consistencies: readonly ConcreteConsistency[] }
  >
> = {
  "C8/10": {
    label: "C8/10",
    bMark: "B150",
    consistencies: ["vartos", "semivartos"],
  },
  "C12/15": {
    label: "C12/15",
    bMark: "B200",
    consistencies: ["vartos", "semivartos"],
  },
  "C16/20": {
    label: "C16/20",
    bMark: "B250",
    consistencies: ["semivartos", "pompabil"],
  },
  "C20/25": {
    label: "C20/25",
    bMark: "B350",
    consistencies: ["semivartos", "pompabil", "moale"],
  },
  "C25/30": {
    label: "C25/30",
    bMark: "B400",
    consistencies: ["pompabil", "moale"],
  },
  "C30/37": {
    label: "C30/37",
    bMark: null,
    consistencies: ["pompabil", "moale"],
  },
  "C35/45": {
    label: "C35/45",
    bMark: "B450",
    consistencies: ["pompabil", "moale"],
  },
} as const

/** Stable iteration order for UI rows. */
export const CONCRETE_CLASS_ORDER: readonly ConcreteClassCode[] = [
  "C8/10",
  "C12/15",
  "C16/20",
  "C20/25",
  "C25/30",
  "C30/37",
  "C35/45",
] as const
