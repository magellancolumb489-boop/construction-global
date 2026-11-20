/**
 * Content rules every listing must follow, per type. One source for the
 * wizard (guidance + blocking) and the server actions (enforcement), so a
 * listing that passes the wizard never fails later, and one that bypasses the
 * UI still cannot be saved.
 */
import { materialProfile, type MaterialCategoryCode } from "@/lib/materials-logistics/catalog"

export type ListingType = "concrete" | "materials" | "equipment" | "services"

export interface ListingCore {
  listing_type: ListingType
  title: string
  description: string | null | undefined
  price: number
  unit: string
  available_qty: number
  min_order_qty?: number | null
  location?: string | null
  equipment_condition?: string | null
  equipment_model?: string | null
  equipment_year?: number | null
  service_area?: string | null
}

export interface RuleIssue {
  path: string
  message: string
}

// Phone (RO and international), email, URL / domain, messaging apps. Deals must
// go through the platform: contact data is exchanged after an order.
const PHONE_RE = /(?:\+?\d[\s.\-()]?){9,}/
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
const URL_RE = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:ro|com|net|eu|org|info)\b/i
const APP_RE = /\b(?:whats\s?app|telegram|viber|signal)\b/i

export function containsContactInfo(text: string | null | undefined): boolean {
  if (!text) return false
  return PHONE_RE.test(text) || EMAIL_RE.test(text) || URL_RE.test(text) || APP_RE.test(text)
}

export const EQUIPMENT_CONDITIONS = ["nou", "ca_nou", "folosit_bun", "folosit_uzat", "pentru_piese"] as const
export const EQUIPMENT_CONDITION_LABELS: Record<(typeof EQUIPMENT_CONDITIONS)[number], string> = {
  nou: "Nou",
  ca_nou: "Ca nou",
  folosit_bun: "Folosit, stare bună",
  folosit_uzat: "Folosit, uzat",
  pentru_piese: "Pentru piese",
}

const CURRENT_YEAR = new Date().getFullYear()

/** Hard limits per type; messages say how to fix, in Romanian. */
export function listingCoreIssues(d: ListingCore): RuleIssue[] {
  const out: RuleIssue[] = []
  const title = d.title?.trim() ?? ""
  const desc = d.description?.trim() ?? ""

  if (title.length < 10) out.push({ path: "title", message: "Titlul trebuie să aibă minim 10 caractere și să spună ce vinzi (ex: „Nisip 0-4 spălat, balastiera Ilfov”)." })
  if (title.length > 120) out.push({ path: "title", message: "Titlul poate avea maxim 120 de caractere." })
  if (title && title === title.toUpperCase() && /[A-Z]{6,}/.test(title)) {
    out.push({ path: "title", message: "Nu scrie titlul numai cu majuscule." })
  }
  if (desc.length < 40) out.push({ path: "description", message: "Descrierea trebuie să aibă minim 40 de caractere: calitate, condiții, program de livrare." })
  if (containsContactInfo(title) || containsContactInfo(desc)) {
    out.push({
      path: "description",
      message: "Fără telefon, email sau site în titlu/descriere. Datele de contact se schimbă după comandă, prin platformă.",
    })
  }
  if (!d.location?.trim() || d.location.trim().length < 3) {
    out.push({ path: "location", message: "Completează localitatea / județul de unde se livrează." })
  }
  if (!(d.price > 0)) out.push({ path: "price", message: "Prețul trebuie să fie mai mare decât zero." })
  if (d.price > 10_000_000) out.push({ path: "price", message: "Preț nerealist; verifică unitatea și cifrele." })
  if (!(d.available_qty > 0)) out.push({ path: "available_qty", message: "Cantitatea disponibilă trebuie să fie mai mare decât zero." })
  if (d.min_order_qty != null && d.min_order_qty > d.available_qty) {
    out.push({ path: "min_order_qty", message: "Comanda minimă nu poate depăși cantitatea disponibilă." })
  }

  if (d.listing_type === "equipment") {
    if (!d.equipment_condition || !(EQUIPMENT_CONDITIONS as readonly string[]).includes(d.equipment_condition)) {
      out.push({ path: "equipment_condition", message: "Alege starea utilajului." })
    }
    if (!d.equipment_model?.trim() || d.equipment_model.trim().length < 2) {
      out.push({ path: "equipment_model", message: "Completează marca și modelul (ex: Caterpillar 320D)." })
    }
    if (d.equipment_year == null || d.equipment_year < 1950 || d.equipment_year > CURRENT_YEAR + 1) {
      out.push({ path: "equipment_year", message: `Anul fabricației trebuie să fie între 1950 și ${CURRENT_YEAR + 1}.` })
    }
  }
  if (d.listing_type === "services" && (!d.service_area?.trim() || d.service_area.trim().length < 3)) {
    out.push({ path: "service_area", message: "Completează zona în care prestezi serviciul (județe / raza în km)." })
  }
  return out
}

// ---------------------------------------------------------------------------
// Price plausibility (net RON). Catches unit mistakes like "criblură 20 RON/kg".
// Inside [min, max]: ok. Outside: warning in the wizard. Beyond 5x: blocked.
// ---------------------------------------------------------------------------
type Range = { min: number; max: number }

const AGG_RANGES: Partial<Record<string, Range>> = {
  TON: { min: 15, max: 300 },
  M3: { min: 25, max: 500 },
  CUP: { min: 25, max: 500 },
  CAMION: { min: 300, max: 15000 },
}

export function priceRange(
  type: ListingType,
  unit: string,
  category?: string | null,
  material?: string | null,
): Range | null {
  if (type === "concrete") return unit === "M3" ? { min: 150, max: 1500 } : { min: 60, max: 700 }
  if (type !== "materials" || !category) return null
  if (category === "AGREGATE_CARIERA" || category === "AGREGATE_BALASTIERA") return AGG_RANGES[unit] ?? null
  // Bags of binders (ciment, adezivi, var, ...): price per bag.
  const prof = material ? materialProfile(category as MaterialCategoryCode, material) : null
  if (unit === "BUC" && prof?.kgPerUnit) return { min: 5, max: 250 }
  if (unit === "TON" && (material === "ciment" || material === "filer")) return { min: 300, max: 1500 }
  return null
}

export type PriceCheck = { status: "ok" | "warn" | "block"; range: Range | null }

export function checkPrice(price: number, range: Range | null): PriceCheck {
  if (!range || !(price > 0)) return { status: "ok", range }
  if (price < range.min / 5 || price > range.max * 5) return { status: "block", range }
  if (price < range.min || price > range.max) return { status: "warn", range }
  return { status: "ok", range }
}

export function priceMessage(check: PriceCheck, unit: string): string | null {
  if (check.status === "ok" || !check.range) return null
  const r = `${check.range.min}–${check.range.max} RON/${unit}`
  return check.status === "block"
    ? `Prețul pare greșit pentru această unitate (uzual ${r}). Verifică unitatea (tonă vs kg) și cifrele.`
    : `Preț neobișnuit (uzual ${r}). Verifică înainte de publicare.`
}

/** Short rules shown at the top of each wizard step, so sellers know before they type. */
export const LISTING_GUIDE: Record<ListingType, string[]> = {
  concrete: [
    "Unitate M3 (recomandat) sau tonă; prețuri fără TVA pe fiecare clasă și consistență.",
    "Adresa stației de betoane este obligatorie (de aici se calculează distanța).",
    "Alege CIFA și/sau POMPA și comanda minimă.",
  ],
  materials: [
    "Alege categoria și materialul exact; unitățile permise se ajustează automat.",
    "Pentru bucăți / saci completează greutatea per bucată; pentru bare / plase, lungimea maximă.",
    "Bifează transportul doar dacă îl asiguri tu; altfel îl organizează platforma.",
  ],
  equipment: [
    "Marca, modelul, anul și starea sunt obligatorii.",
    "Pune cel puțin 3 fotografii clare (față, lateral, cabină / plăcuța).",
    "Prețul este pe bucată (BUC), fără TVA.",
  ],
  services: [
    "Descrie exact ce faci, ce include tariful și zona deservită.",
    "Tariful este pe bucată / prestație (BUC), fără TVA.",
  ],
}

/** Minimum photos per type (wizard step 3). */
export const MIN_IMAGES: Record<ListingType, number> = { concrete: 1, materials: 1, equipment: 3, services: 1 }
