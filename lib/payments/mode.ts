// Single source of truth for picking the payment provider at runtime.
// Default is demo: order is saved with demo_paid / demo provider; no Stripe redirect.
//
// To enable Stripe checkout later, set in .env.local (or Vercel):
//   NEXT_PUBLIC_PAYMENTS_MODE=stripe
//
// placeOrderAction branches on this flag after place_order RPC succeeds.

export type PaymentsMode = "demo" | "stripe"

export function getPaymentsMode(): PaymentsMode {
  const raw = process.env.NEXT_PUBLIC_PAYMENTS_MODE?.trim().toLowerCase()
  // Anything other than an explicit "stripe" stays on demo (safe default).
  return raw === "stripe" ? "stripe" : "demo"
}
