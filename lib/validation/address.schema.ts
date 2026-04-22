import { z } from "zod"

// Romanian postal format is 6 digits; allow empty string too so non-RO
// addresses (label only) still pass basic validation.
const romanianPostalSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Codul postal trebuie sa aiba 6 cifre")

const phoneSchema = z
  .string()
  .trim()
  .min(6)
  .max(32)
  .regex(/^[+0-9\s().-]+$/, "Numar de telefon invalid")

// Upsert schema: used by createAddressAction + updateAddressAction. `id` is
// injected by the server action; default flags flip atomically via RPC.
export const addressUpsertSchema = z.object({
  label: z.string().trim().max(80).nullable().optional(),
  recipient: z.string().trim().max(120).nullable().optional(),
  line1: z.string().trim().min(1, "Strada este obligatorie").max(200),
  line2: z.string().trim().max(200).nullable().optional(),
  city: z.string().trim().min(1, "Orasul este obligatoriu").max(120),
  county: z.string().trim().max(80).nullable().optional(),
  postal_code: romanianPostalSchema.nullable().optional(),
  country: z.string().trim().length(2).default("RO"),
  phone: phoneSchema.nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  is_default_billing: z.boolean().default(false),
  is_default_shipping: z.boolean().default(false),
  pickup_lat: z.number().finite().min(-90).max(90).nullable().optional(),
  pickup_lng: z.number().finite().min(-180).max(180).nullable().optional(),
})

export const addressIdSchema = z.object({
  id: z.number().int().positive(),
})

export const addressSetDefaultSchema = z.object({
  id: z.number().int().positive(),
  kind: z.enum(["billing", "shipping"]),
})

export type AddressUpsertInput = z.infer<typeof addressUpsertSchema>
export type AddressIdInput = z.infer<typeof addressIdSchema>
export type AddressSetDefaultInput = z.infer<typeof addressSetDefaultSchema>
