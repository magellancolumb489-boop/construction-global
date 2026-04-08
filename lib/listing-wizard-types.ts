/** User-facing listing kinds — matches DB marketplace_listings.listing_type check constraint. */
export type ListingWizardType = "concrete" | "materials" | "equipment" | "services"

/** Transport mode flags for concrete listings (stored as transport_modes text[] in DB). */
export type TransportModeCode = "CIFA" | "POMPA" | "VRAC"
