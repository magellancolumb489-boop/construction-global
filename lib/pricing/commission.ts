/**
 * Buyer-facing pricing. The platform (middleman) adds its commission on top
 * of the seller's net price: a 10,000 RON listing with a 10% rate is shown to
 * buyers as 11,000 RON (+ VAT). Server twin: place_order v4
 * (commission = round(goods_cents * commission_rate)). Display only; the
 * charge is always recomputed by place_order from platform_settings.
 */

export interface PlatformPricing {
  commissionRate: number
  commissionOnTransport: boolean
  vatRate: number
}

/** Mirrors the platform_settings column defaults; used only if the read fails. */
export const DEFAULT_PRICING: PlatformPricing = {
  commissionRate: 0.1,
  commissionOnTransport: false,
  vatRate: 0.19,
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Seller net unit price -> price shown to buyers (net of VAT). */
export function buyerPrice(sellerNet: number, rate: number): number {
  if (!Number.isFinite(sellerNet)) return sellerNet
  return round2(sellerNet * (1 + rate))
}

/** Commission in minor units, same rounding as place_order. */
export function commissionCents(goodsCents: number, rate: number): number {
  return Math.round(goodsCents * rate)
}

export interface OrderAmounts {
  goodsCents: number
  sellerTransportCents: number
  commissionCents: number
  sellerVatCents: number
  platformVatCents: number
  totalCents: number
}

/** Client mirror of place_order v4 totals (tests keep the two in step). */
export function orderAmounts(
  goodsCents: number,
  sellerTransportCents: number,
  pricing: PlatformPricing,
): OrderAmounts {
  const base = goodsCents + (pricing.commissionOnTransport ? sellerTransportCents : 0)
  const commission = commissionCents(base, pricing.commissionRate)
  const sellerVat = Math.round((goodsCents + sellerTransportCents) * pricing.vatRate)
  const platformVat = Math.round(commission * pricing.vatRate)
  return {
    goodsCents,
    sellerTransportCents,
    commissionCents: commission,
    sellerVatCents: sellerVat,
    platformVatCents: platformVat,
    totalCents: goodsCents + sellerTransportCents + commission + sellerVat + platformVat,
  }
}
