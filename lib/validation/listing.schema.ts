import { z } from "zod"
import { CONCRETE_CLASS_CATALOG } from "@/lib/listing-wizard-types"

// Units / currency accepted by marketplace_listings (must match DB CHECKs)
export const listingUnitSchema = z.enum(["TON", "KG", "M3", "BUC", "ML"])
export const currencySchema = z.enum(["RON", "EUR"])
export const listingTypeSchema = z.enum(["concrete", "materials", "equipment", "services"])
export const transportModeSchema = z.enum(["CIFA", "POMPA", "VRAC"])

/** DB + RPC payload for marketplace_listing_concrete_classes rows. */
export const concreteClassCodeSchema = z.enum([
  "C8/10",
  "C12/15",
  "C16/20",
  "C20/25",
  "C25/30",
  "C30/37",
  "C35/45",
])
export const concreteConsistencySchema = z.enum([
  "vartos",
  "semivartos",
  "pompabil",
  "moale",
])

export const concreteClassRowInputSchema = z
  .object({
    class_code: concreteClassCodeSchema,
    consistencies: z
      .array(concreteConsistencySchema)
      .min(1, "Selectati cel putin o consistenta."),
    consistency_prices: z.record(z.string(), z.number().finite().positive()),
  })
  .superRefine((row, ctx) => {
    const cat = CONCRETE_CLASS_CATALOG[row.class_code]
    const keys = Object.keys(row.consistency_prices).sort()
    const consSorted = [...row.consistencies].sort()
    if (keys.length !== consSorted.length || keys.some((k, i) => k !== consSorted[i])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Fiecare consistenta bifata trebuie sa aiba pret in consistency_prices.",
        path: ["consistency_prices"],
      })
    }
    for (const c of row.consistencies) {
      if (!cat.consistencies.includes(c)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Consistenta nepermisa pentru aceasta clasa.",
          path: ["consistencies"],
        })
      }
    }
  })

export const concreteClassesRpcPayloadSchema = z
  .array(concreteClassRowInputSchema)
  .min(1, "Selectati cel putin o clasa de beton.")

export type ConcreteClassesRpcPayload = z.infer<typeof concreteClassesRpcPayloadSchema>

// Slug: URL-safe, 1-80 chars, lowercase, numbers, hyphens
export const slugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalid")

// Shared base fields across all listing types. `seller_id` is NOT in the
// schema: server actions inject it from auth.uid() to prevent spoofing.
const baseListingFields = {
  listing_type: listingTypeSchema,
  title: z.string().trim().min(3).max(200),
  slug: slugSchema,
  description: z.string().trim().max(5000).nullable().optional(),
  category_id: z.number().int().positive().nullable().optional(),
  currency: currencySchema.default("RON"),
  price: z.number().positive("Pretul trebuie sa fie pozitiv"),
  unit: listingUnitSchema,
  available_qty: z.number().nonnegative().default(0),
  is_active: z.boolean().default(true),
  location: z.string().trim().max(500).nullable().optional(),
  pickup_address: z.string().trim().max(500).nullable().optional(),
  pickup_lat: z.number().finite().min(-90).max(90).nullable().optional(),
  pickup_lng: z.number().finite().min(-180).max(180).nullable().optional(),
  transport_modes: z.array(transportModeSchema).nullable().optional(),
  min_order_qty: z.number().positive().nullable().optional(),
  transport_fee: z.number().nonnegative().nullable().optional(),
  service_area: z.string().trim().max(500).nullable().optional(),
  equipment_condition: z.string().trim().max(200).nullable().optional(),
  equipment_model: z.string().trim().max(200).nullable().optional(),
  equipment_year: z.number().int().min(1900).max(2100).nullable().optional(),
  // Drives future settlement split. true = seller delivers (10% platform fee);
  // false = platform organizes transport (10% fee + full transport amount).
  seller_assumes_transport: z.boolean().default(true),
}

// Discriminated refinements per listing_type so the DB only ever gets valid
// combinations (e.g. "concrete" requires pickup coords + transport_modes).
export const listingCreateSchema = z
  .object(baseListingFields)
  .superRefine((val, ctx) => {
    if (val.listing_type === "concrete") {
      if (val.pickup_lat == null || val.pickup_lng == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pickup_lat"],
          message: "Coordonatele de plecare sunt obligatorii pentru beton.",
        })
      }
      if (!val.pickup_address?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pickup_address"],
          message: "Adresa de incarcare este obligatorie pentru beton.",
        })
      }
      if (!val.transport_modes || val.transport_modes.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["transport_modes"],
          message: "Selectati cel putin un mod de transport.",
        })
      }
      if (val.transport_modes?.includes("VRAC")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["transport_modes"],
          message: "VRAC nu este disponibil pentru anunturi de beton.",
        })
      }
      if (!val.min_order_qty || val.min_order_qty <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["min_order_qty"],
          message: "Comanda minima este obligatorie pentru beton.",
        })
      }
      if (val.unit !== "M3" && val.unit !== "TON") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["unit"],
          message: "Pentru beton, unitatea trebuie sa fie M3 sau TON.",
        })
      }
    }
    if (val.listing_type === "equipment" || val.listing_type === "services") {
      if (val.unit !== "BUC") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["unit"],
          message: "Echipamentul sau serviciul trebuie sa aiba unitatea BUC.",
        })
      }
    }
  })

// Update schema: same fields but every field is optional. seller_id / id are
// never accepted from the client (server strips them).
export const listingUpdateSchema = z
  .object(baseListingFields)
  .partial()
  .superRefine((val, ctx) => {
    if (val.listing_type === "concrete") {
      if (
        (val.pickup_lat != null || val.pickup_lng != null) &&
        (val.pickup_lat == null || val.pickup_lng == null)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pickup_lat"],
          message: "Ambele coordonate (lat/lng) trebuie furnizate.",
        })
      }
      if (val.transport_modes?.includes("VRAC")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["transport_modes"],
          message: "VRAC nu este disponibil pentru anunturi de beton.",
        })
      }
    }
  })

export type ListingCreateInput = z.infer<typeof listingCreateSchema>
export type ListingUpdateInput = z.infer<typeof listingUpdateSchema>
