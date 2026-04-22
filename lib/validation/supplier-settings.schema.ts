import { z } from "zod"

// Transport capacity defaults used by the price calculator when a seller
// has not filled per-listing overrides. Numbers are in m3 (capacity) and
// RON/km (rates).
const capacitySchema = z.object({
  capacity_m3: z.number().nonnegative().max(200).default(0),
  rate_per_km: z.number().nonnegative().max(1000).default(0),
  min_fee: z.number().nonnegative().max(100000).default(0),
  min_order: z.number().nonnegative().max(10000).default(0),
  enabled: z.boolean().default(false),
})

const pickupAddressSchema = z.object({
  label: z.string().trim().max(80).nullable().optional(),
  line1: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(120),
  county: z.string().trim().max(80).nullable().optional(),
  postal_code: z
    .string()
    .trim()
    .regex(/^\d{6}$/u, "Cod postal invalid")
    .nullable()
    .optional(),
  lat: z.number().finite().min(-90).max(90).nullable().optional(),
  lng: z.number().finite().min(-180).max(180).nullable().optional(),
})

export const supplierSettingsSchema = z.object({
  pickup_addresses: z.array(pickupAddressSchema).max(10).default([]),
  defaults: z
    .object({
      CIFA: capacitySchema,
      POMPA: capacitySchema,
      VRAC: capacitySchema,
    })
    .default({
      CIFA: { capacity_m3: 0, rate_per_km: 0, min_fee: 0, min_order: 0, enabled: false },
      POMPA: { capacity_m3: 0, rate_per_km: 0, min_fee: 0, min_order: 0, enabled: false },
      VRAC: { capacity_m3: 0, rate_per_km: 0, min_fee: 0, min_order: 0, enabled: false },
    }),
  delivery_zones: z.array(z.string().trim().min(1).max(120)).max(100).default([]),
})

export type SupplierSettingsInput = z.infer<typeof supplierSettingsSchema>
