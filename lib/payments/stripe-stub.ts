// Stripe seam — intentionally throws today so calling it is a loud bug.
// When Phase 2 lands, replace this file with a real implementation that:
//   1. Builds a checkout.sessions.create payload from the order/lines.
//   2. Sets `client_reference_id = order.id` so the webhook can find it.
//   3. Returns the session id + redirect url.
//
// Keep the function signature stable; placeOrderAction relies on it.

import "server-only"

export interface StripeSessionResult {
  id: string
  url: string
}

// Type-only shape of the order payload we hand off — keeps the seam loose.
export interface OrderPayloadForStripe {
  id: string
  order_number: string | null
  total_cents: number
  currency: string
  buyer_id: string
  seller_id: string
}

export async function createStripeCheckoutSession(
  _order: OrderPayloadForStripe,
): Promise<StripeSessionResult> {
  // Phase-2 hardening point: wire up @stripe/stripe-node, env keys, success_url,
  // cancel_url, line items, and tax behaviour. Until then, fail loudly so a
  // misconfigured PAYMENTS_MODE flag never silently lands in production.
  throw new Error(
    "[stripe-stub] Stripe is not wired yet. Implement createStripeCheckoutSession (Phase 2) before flipping NEXT_PUBLIC_PAYMENTS_MODE=stripe.",
  )
}
