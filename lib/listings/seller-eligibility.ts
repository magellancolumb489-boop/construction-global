/**
 * What a seller may list depending on their legal form. Persoane fizice (PF)
 * can sell, but products that need a company (CE declarations of performance,
 * fiscal invoices, production stations) stay reserved for PFA/II/IF/SRL/SA.
 * Twin of public.listing_requires_company (DB trigger is authoritative).
 */
import type { ListingType } from "@/lib/listings/rules"

/** Listing types a PF cannot publish. */
export const COMPANY_ONLY_LISTING_TYPES: readonly ListingType[] = ["concrete"]

/** Material codes a PF cannot publish (any category). */
export const COMPANY_ONLY_MATERIALS: readonly string[] = ["ciment", "bitum_rutier_50_70", "filer"]

/** Human list for notices. */
export const COMPANY_ONLY_SUMMARY = "beton, ciment, bitum, filer"

export const COMPANY_ONLY_MESSAGE =
  "Acest produs poate fi vândut doar de firme (PFA, II, IF, SRL, SA). Schimbă forma juridică din „Date firmă” pentru a-l publica."

export function isCompanyEntity(entityType: string | null | undefined): boolean {
  return !!entityType && entityType !== "PF"
}

export function listingTypeAllowed(entityType: string | null | undefined, type: ListingType): boolean {
  return isCompanyEntity(entityType) || !COMPANY_ONLY_LISTING_TYPES.includes(type)
}

export function materialAllowed(entityType: string | null | undefined, materialCode: string | null | undefined): boolean {
  return isCompanyEntity(entityType) || !materialCode || !COMPANY_ONLY_MATERIALS.includes(materialCode)
}
