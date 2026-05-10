"use server"

import { getProductDetailFromListing } from "@/lib/api/listings"
import type { ProductDetail } from "@/types/domain"

/** Re-fetch listing as ProductDetail so configurare can repair stale session drafts. */
export async function refreshProductDetailForConfigureAction(
  slug: string,
): Promise<
  { ok: true; product: ProductDetail } | { ok: false; error: string }
> {
  const product = await getProductDetailFromListing(slug)
  if (!product) {
    return { ok: false, error: "Produs indisponibil." }
  }
  return { ok: true, product }
}
