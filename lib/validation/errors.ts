import { z, type ZodError, type ZodErrorMap } from "zod"

/**
 * Romanian messages for Zod's built-in checks, so users never see
 * "String must contain at least 6 character(s)". Schema-specific messages
 * (refine / regex with a message) still win. Imported by every schema module.
 */
const roErrorMap: ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === "undefined" || issue.received === "null") return { message: "Câmp obligatoriu" }
      if (issue.expected === "number") return { message: "Introduceți un număr" }
      return { message: "Valoare invalidă" }
    case z.ZodIssueCode.too_small:
      if (issue.type === "string") {
        return { message: Number(issue.minimum) <= 1 ? "Câmp obligatoriu" : `Minim ${issue.minimum} caractere` }
      }
      if (issue.type === "number") return { message: `Valoarea minimă este ${issue.minimum}` }
      if (issue.type === "array") return { message: `Alegeți cel puțin ${issue.minimum}` }
      return { message: "Valoare prea mică" }
    case z.ZodIssueCode.too_big:
      if (issue.type === "string") return { message: `Maxim ${issue.maximum} caractere` }
      if (issue.type === "number") return { message: `Valoarea maximă este ${issue.maximum}` }
      return { message: "Valoare prea mare" }
    case z.ZodIssueCode.invalid_string:
      if (issue.validation === "email") return { message: "Adresă de email invalidă" }
      if (issue.validation === "url") return { message: "Adresă web invalidă (începe cu https://)" }
      if (issue.validation === "uuid") return { message: "Identificator invalid" }
      return { message: "Format invalid" }
    case z.ZodIssueCode.invalid_enum_value:
      return { message: "Alegeți o opțiune din listă" }
    default:
      return { message: ctx.defaultError }
  }
}

z.setErrorMap(roErrorMap)

export type FieldErrors = Record<string, string>

/** First message per field path ("fiscal_address.city" etc.), for inline form errors. */
export function toFieldErrors(error: ZodError): FieldErrors {
  const out: FieldErrors = {}
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form"
    if (!out[key]) out[key] = issue.message
  }
  return out
}

const LABELS: Record<string, string> = {
  display_name: "Nume afișat",
  phone: "Telefon",
  entity_type: "Formă juridică",
  company_name: "Denumire firmă",
  tax_id: "CUI",
  reg_com: "Nr. Reg. Com.",
  vat_id: "Cod TVA",
  iban: "IBAN",
  bank_name: "Banca",
  website_url: "Website",
  fiscal_address: "Adresă fiscală",
  "fiscal_address.line1": "Stradă",
  "fiscal_address.city": "Localitate",
  "fiscal_address.postal_code": "Cod poștal",
  line1: "Stradă",
  city: "Localitate",
  county: "Județ",
  postal_code: "Cod poștal",
  recipient: "Destinatar",
}

/** Summary line for the form banner: "CUI: cifra de control nu se potrivește". */
export function firstIssueRo(error: ZodError): string {
  const issue = error.issues[0]
  if (!issue) return "Date invalide"
  const label = LABELS[issue.path.join(".")] ?? LABELS[String(issue.path[0] ?? "")]
  return label ? `${label}: ${issue.message}` : issue.message
}
