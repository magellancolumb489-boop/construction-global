/**
 * What a user still needs before selling. TS twin of
 * public.seller_missing_requirements (same codes); the DB is authoritative,
 * this only drives the checklist UI.
 */
import { isValidCui, isValidIban, isValidRoPhone } from "@/lib/validation/ro-fiscal"

export type SellerRequirement =
  | "display_name"
  | "phone"
  | "entity_type"
  | "fiscal_address"
  | "iban"
  | "company_name"
  | "tax_id"

export const REQUIREMENT_INFO: Record<SellerRequirement, { label: string; tab: "profile" | "business" }> = {
  display_name: { label: "Nume afișat (minim 2 caractere)", tab: "profile" },
  phone: { label: "Telefon valid (ex: 0722 123 456)", tab: "profile" },
  entity_type: { label: "Forma juridică (PF, PFA, SRL…)", tab: "business" },
  fiscal_address: { label: "Adresa fiscală (stradă și localitate)", tab: "business" },
  iban: { label: "IBAN pentru încasări", tab: "business" },
  company_name: { label: "Denumirea firmei", tab: "business" },
  tax_id: { label: "CUI valid", tab: "business" },
}

export interface ReadinessProfile {
  display_name?: string | null
  phone?: string | null
  entity_type?: string | null
  fiscal_address?: unknown
  iban?: string | null
  company_name?: string | null
  tax_id?: string | null
}

export function sellerMissing(p: ReadinessProfile | null | undefined): SellerRequirement[] {
  if (!p) return ["display_name", "phone", "entity_type", "fiscal_address", "iban"]
  const missing: SellerRequirement[] = []
  if ((p.display_name?.trim().length ?? 0) < 2) missing.push("display_name")
  if (!p.phone || !isValidRoPhone(p.phone)) missing.push("phone")
  if (!p.entity_type) missing.push("entity_type")
  const fa = (p.fiscal_address ?? {}) as Record<string, unknown>
  if (!String(fa.line1 ?? "").trim() || !String(fa.city ?? "").trim()) missing.push("fiscal_address")
  if (!p.iban || !isValidIban(p.iban)) missing.push("iban")
  if (p.entity_type && p.entity_type !== "PF") {
    if ((p.company_name?.trim().length ?? 0) < 2) missing.push("company_name")
    if (!p.tax_id || !isValidCui(p.tax_id)) missing.push("tax_id")
  }
  return missing
}
