// Provider-agnostic payment contracts. The DB (payment_intents + RPCs) owns
// amounts and state; a provider only creates a hosted checkout and turns its
// webhook into a normalized event. Adding a provider = one file implementing
// PaymentProvider + one line in registry.ts. No other code changes.

export const PAYMENT_PROVIDER_IDS = ["demo", "stripe", "netopia", "euplatesc", "revolut", "other"] as const
export type PaymentProviderId = (typeof PAYMENT_PROVIDER_IDS)[number]

export type PaymentPurpose = "order" | "transport" | "subscription" | "listing_fee"

/** Mirrors public.payment_intents (amount is set by the DB, never by the client). */
export interface PaymentIntent {
  id: string
  purpose: PaymentPurpose
  order_id: string | null
  subscription_id: string | null
  listing_id: number | null
  payer_id: string
  amount_cents: number
  currency: "RON" | "EUR"
  provider: PaymentProviderId
  provider_ref: string | null
  checkout_url: string | null
  status: "created" | "pending" | "succeeded" | "failed" | "cancelled" | "refunded"
}

export interface CheckoutUrls {
  successUrl: string
  cancelUrl: string
  webhookUrl: string
}

export interface CheckoutSession {
  /** Provider's id for the session/payment (stored as payment_intents.provider_ref). */
  providerRef: string
  /** Hosted payment page the buyer is redirected to. */
  checkoutUrl: string
}

/** Normalized webhook event handed to public.record_payment_event. */
export interface ProviderEvent {
  /** Provider's unique event id (idempotency key). */
  eventId: string
  /** Our intent id when the provider echoes metadata back; else null. */
  intentId: string | null
  /** Provider session/payment id; used when intentId is absent. */
  providerRef: string | null
  status: "pending" | "succeeded" | "failed" | "cancelled" | "refunded"
  amountCents: number
  currency: string
  /** Minimal provider payload for audit; never card data. */
  raw: Record<string, unknown>
}

export interface PaymentProvider {
  id: PaymentProviderId
  /** False until credentials are set; the UI then hides real-payment buttons. */
  isConfigured(): boolean
  createCheckout(intent: PaymentIntent, urls: CheckoutUrls): Promise<CheckoutSession>
  /**
   * Verify the signature and parse the body. Return null for events we ignore.
   * Throw on an invalid signature (route answers 400).
   */
  parseWebhook(rawBody: string, headers: Headers): Promise<ProviderEvent | null>
}

export class PaymentProviderNotConfiguredError extends Error {
  constructor(id: PaymentProviderId) {
    super(`Payment provider "${id}" is not configured. Add its credentials and implementation in lib/payments/providers/${id}.ts.`)
    this.name = "PaymentProviderNotConfiguredError"
  }
}
