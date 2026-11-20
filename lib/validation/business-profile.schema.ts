import { z } from "zod"
import "./errors"
import { isValidCui, isValidIban, isValidRegCom, normalizeCui, normalizeIban } from "./ro-fiscal"

export const entityTypeSchema = z.enum(["PF", "PFA", "SRL", "SA", "II", "IF"])

// CUI/CIF: digits only after normalisation, verified by the ANAF check digit.
const cuiSchema = z
  .string()
  .trim()
  .transform(normalizeCui)
  .refine(isValidCui, "CUI invalid (cifra de control nu se potrivește). Exemplu: 18547290")

// Trade register number: J12/3456/2020 or the post-2024 ONRC format.
const regComSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s+/g, "").toUpperCase())
  .refine(isValidRegCom, "Nr. Reg. Com. invalid. Exemplu: J12/3456/2020 sau J2024001234401")

// VAT code = "RO" + a valid CUI (only for VAT payers).
const vatIdSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s+/g, "").toUpperCase())
  .refine((v) => /^RO\d{2,10}$/.test(v) && isValidCui(v), "Cod TVA invalid. Format: RO + CUI valid")

// Bank account for proformas; mod-97 checked, stored without spaces.
const ibanSchema = z
  .string()
  .trim()
  .transform(normalizeIban)
  .refine(isValidIban, "IBAN invalid (verificați caracterele). Exemplu: RO49AAAA1B31007593840000")

const fiscalAddressSchema = z
  .object({
    line1: z.string().trim().max(200).nullable().optional(),
    line2: z.string().trim().max(200).nullable().optional(),
    city: z.string().trim().max(120).nullable().optional(),
    county: z.string().trim().max(80).nullable().optional(),
    postal_code: z
      .string()
      .trim()
      .regex(/^\d{6}$/u, "Cod postal invalid")
      .nullable()
      .optional(),
    country: z.string().trim().length(2).default("RO"),
  })
  .nullable()
  .optional()

// A single top-level schema. Legal entities (PFA/SRL/SA/II/IF) require CIF;
// for Persoana Fizica (PF) everything business-related stays optional.
export const businessProfileSchema = z
  .object({
    entity_type: entityTypeSchema.nullable().optional(),
    company_name: z.string().trim().max(200).nullable().optional(),
    tax_id: cuiSchema.nullable().optional(),
    reg_com: regComSchema.nullable().optional(),
    vat_id: vatIdSchema.nullable().optional(),
    iban: ibanSchema.nullable().optional(),
    bank_name: z.string().trim().min(2).max(120).nullable().optional(),
    fiscal_address: fiscalAddressSchema,
    website_url: z
      .string()
      .trim()
      .url("Adresa web invalida")
      .max(300)
      .nullable()
      .optional()
      .or(z.literal("")),
  })
  .superRefine((val, ctx) => {
    if (val.entity_type && val.entity_type !== "PF") {
      if (!val.tax_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tax_id"],
          message: "CIF obligatoriu pentru entitati juridice.",
        })
      }
      if (!val.fiscal_address?.line1 || !val.fiscal_address?.city) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fiscal_address"],
          message: "Adresa fiscală (stradă și localitate) este obligatorie pentru firme; apare pe proforme.",
        })
      }
      if (!val.company_name || val.company_name.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["company_name"],
          message: "Denumirea firmei este obligatorie.",
        })
      }
    }
  })

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>
