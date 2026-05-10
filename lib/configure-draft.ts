import type { ProductDetail } from "@/types/domain"

/** Session draft: product page → /cart/configurare */
export const CONFIGURE_DRAFT_STORAGE_KEY = "constructionhub_configure_draft"

export interface ConfigureDraftV1 {
  v: 1
  product: ProductDetail
  qty: number
  startedAt: string
}

export function saveConfigureDraft(product: ProductDetail, qty: number) {
  if (typeof window === "undefined") return
  const draft: ConfigureDraftV1 = {
    v: 1,
    product,
    qty,
    startedAt: new Date().toISOString(),
  }
  try {
    sessionStorage.setItem(CONFIGURE_DRAFT_STORAGE_KEY, JSON.stringify(draft))
  } catch {
    // ignore quota / private mode
  }
}

export function readConfigureDraft(): ConfigureDraftV1 | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(CONFIGURE_DRAFT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ConfigureDraftV1
    if (parsed?.v !== 1 || !parsed.product?.id) return null
    // Backfill fields added after older drafts were saved in sessionStorage
    const p = parsed.product
    // Normalize optional seller fields for drafts saved before these existed.
    parsed.product = {
      ...p,
      sellerDisplayName: p.sellerDisplayName ?? null,
      sellerCompanyName: p.sellerCompanyName ?? null,
      sellerEntityType: p.sellerEntityType ?? null,
      sellerPhone: p.sellerPhone ?? null,
      // Ciorne vechi fără join beton — array gol; server reîmprospătează la nevoie.
      concreteClasses: p.concreteClasses ?? [],
      materialLogistics: p.materialLogistics ?? null,
    }
    return parsed
  } catch {
    return null
  }
}

export function clearConfigureDraft() {
  if (typeof window === "undefined") return
  try {
    sessionStorage.removeItem(CONFIGURE_DRAFT_STORAGE_KEY)
  } catch {
    // ignore
  }
}
