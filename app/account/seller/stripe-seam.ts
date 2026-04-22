// Typed stub for Stripe Connect surface. Every Stripe-dependent tab (payouts,
// payment methods, tax docs, fees) calls these helpers instead of the Stripe
// SDK. Phase 2 swaps this file for a real implementation; callers stay
// untouched.

export type StripeSeamStatus =
  | { status: "disabled"; reason: "stripe_not_configured" }
  | { status: "pending"; reason: "kyc_required" }
  | { status: "active" }

export interface StripeConnectAccount {
  id: string | null
  status: StripeSeamStatus
  capabilities: {
    card_payments: "inactive" | "pending" | "active"
    transfers: "inactive" | "pending" | "active"
  }
  payout_schedule: {
    interval: "daily" | "weekly" | "monthly"
    anchor: string | null
  } | null
}

export async function getStripeConnectStatus(): Promise<StripeConnectAccount> {
  return {
    id: null,
    status: { status: "disabled", reason: "stripe_not_configured" },
    capabilities: { card_payments: "inactive", transfers: "inactive" },
    payout_schedule: null,
  }
}

export interface StripePaymentMethodStub {
  id: string
  brand: string
  last4: string
  exp_month: number
  exp_year: number
}

export async function listPaymentMethods(): Promise<StripePaymentMethodStub[]> {
  return []
}

export interface StripePayoutStub {
  id: string
  amount: number
  currency: "RON" | "EUR"
  arrival_date: string
  status: "pending" | "in_transit" | "paid" | "failed"
}

export async function listRecentPayouts(): Promise<StripePayoutStub[]> {
  return []
}
