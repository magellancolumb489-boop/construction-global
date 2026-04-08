import type { Listing } from "@/lib/api/listings-client"
import type { ListingWizardType } from "@/lib/listing-wizard-types"

/** Full client state for the multi-step listing wizard (maps to marketplace_listings columns). */
export interface WizardFormState {
  listingType: ListingWizardType | null
  title: string
  categoryId: string
  description: string
  currency: string
  location: string
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
  transportVrac: boolean
  minOrderQty: string
  /** Materials / optional equipment: fixed transport add-on */
  transportFee: string
  equipmentCondition: string
  equipmentModel: string
  equipmentYear: string
  serviceArea: string
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
    transportVrac: false,
    minOrderQty: "",
    transportFee: "",
    equipmentCondition: "",
    equipmentModel: "",
    equipmentYear: "",
    serviceArea: "",
  }
}

/** Hydrate wizard from an existing DB row (edit mode). */
export function wizardStateFromListing(listing: Listing): WizardFormState {
  const modes = listing.transport_modes ?? []
  const lt = (listing.listing_type as ListingWizardType) || "materials"
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
    transportVrac: modes.includes("VRAC"),
    minOrderQty:
      listing.min_order_qty != null ? String(listing.min_order_qty) : "",
    transportFee:
      listing.transport_fee != null ? String(listing.transport_fee) : "",
    equipmentCondition: listing.equipment_condition ?? "",
    equipmentModel: listing.equipment_model ?? "",
    equipmentYear:
      listing.equipment_year != null ? String(listing.equipment_year) : "",
    serviceArea: listing.service_area ?? "",
  }
}

/** Build transport_modes array for Supabase from checkbox flags. */
export function transportModesFromFlags(
  cifa: boolean,
  pompa: boolean,
  vrac: boolean,
): string[] {
  const m: string[] = []
  if (cifa) m.push("CIFA")
  if (pompa) m.push("POMPA")
  if (vrac) m.push("VRAC")
  return m
}
