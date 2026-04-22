import { z } from "zod"

export const entityTypeSchema = z.enum(["PF", "PFA", "SRL", "SA", "II", "IF"])

// CUI/CIF: optional `RO` prefix plus 2-10 digits.
const cuiSchema = z
  .string()
  .trim()
  .regex(/^RO?\d{2,10}$/i, "CIF invalid. Format: RO12345678")

// Registry number for legal entities: Jxx/yyyyy/zzzz
const regComSchema = z
  .string()
  .trim()
  .regex(/^J\d{1,2}\/\d{1,6}\/\d{4}$/, "Format invalid. Exemplu: J12/3456/2020")

const vatIdSchema = z
  .string()
  .trim()
  .max(20)

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
