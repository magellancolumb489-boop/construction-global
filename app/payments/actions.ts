"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { appBaseUrl, getConfiguredProviderId, getProvider } from "@/lib/payments/registry"
import type { PaymentIntent, PaymentPurpose } from "@/lib/payments/types"

export type StartPaymentResult =
  | { ok: true; kind: "redirect"; url: string; intentId: string }
  | { ok: true; kind: "demo"; intentId: string; amountCents: number; currency: string }
  | { ok: false; error: string }

const PURPOSES: readonly PaymentPurpose[] = ["order", "transport", "subscription", "listing_fee"]

function returnPath(purpose: PaymentPurpose, ref: string): string {
  if (purpose === "order" || purpose === "transport") return `/account/orders/${ref}`
  if (purpose === "listing_fee") return "/account?tab=listings"
  return "/account?tab=subscription"
}

function humanize(msg: string): string {
  if (/not authenticated/i.test(msg)) return "Nu ești autentificat."
  if (/provider not configured/i.test(msg)) return "Plata online nu este configurată încă."
  if (/not payable|already|closed/i.test(msg)) return "Această plată nu mai este disponibilă."
  if (/not found/i.test(msg)) return "Elementul de plată nu a fost găsit."
  if (/disabled/i.test(msg)) return "Această opțiune de plată este dezactivată."
  if (/seller account required/i.test(msg)) return "Activează contul de vânzător mai întâi."
  return "Plata nu a putut fi inițiată."
}

/**
 * Starts a payment for something the user owes. The DB computes the amount
 * (create_payment_intent); this action only picks the provider and opens its
 * checkout. Same entry point for orders, transport quotes, subscriptions and
 * listing fees.
 */
export async function startPaymentAction(purpose: PaymentPurpose, ref: string): Promise<StartPaymentResult> {
  if (!PURPOSES.includes(purpose) || !ref || ref.length > 64) {
    return { ok: false, error: "Cerere de plată invalidă." }
  }
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { ok: false, error: "Nu ești autentificat." }

  const providerId = getConfiguredProviderId()
  const { data, error } = await supabase.rpc("create_payment_intent", {
    p_purpose: purpose,
    p_ref: ref,
    p_provider: providerId,
  })
  if (error || !data) return { ok: false, error: humanize(error?.message ?? "") }
  const intent = data as unknown as PaymentIntent

  // The DB forces 'demo' while payments_mode = demo, whatever the env says.
  if (intent.provider === "demo") {
    return { ok: true, kind: "demo", intentId: intent.id, amountCents: intent.amount_cents, currency: intent.currency }
  }

  if (intent.checkout_url && intent.status === "pending") {
    return { ok: true, kind: "redirect", url: intent.checkout_url, intentId: intent.id }
  }

  const provider = getProvider(intent.provider)
  const base = appBaseUrl()
  const back = returnPath(purpose, ref)
  try {
    const session = await provider.createCheckout(intent, {
      successUrl: `${base}${back}${back.includes("?") ? "&" : "?"}payment=success`,
      cancelUrl: `${base}${back}${back.includes("?") ? "&" : "?"}payment=cancelled`,
      webhookUrl: `${base}/api/payments/webhook/${intent.provider}`,
    })
    const { error: attachErr } = await supabase.rpc("attach_payment_session", {
      p_intent_id: intent.id,
      p_provider_ref: session.providerRef,
      p_checkout_url: session.checkoutUrl,
    })
    if (attachErr) return { ok: false, error: humanize(attachErr.message) }
    return { ok: true, kind: "redirect", url: session.checkoutUrl, intentId: intent.id }
  } catch (err) {
    console.error("[payments] createCheckout failed:", err instanceof Error ? err.message : err)
    return { ok: false, error: "Procesatorul de plăți nu este disponibil. Încearcă mai târziu." }
  }
}

/** Demo only: the payer confirms their own intent. Refused by the DB in live mode. */
export async function completeDemoPaymentAction(
  intentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("demo_complete_payment", { p_intent_id: intentId })
  if (error || !data) return { ok: false, error: humanize(error?.message ?? "") }
  const intent = data as unknown as PaymentIntent
  revalidatePath(returnPath(intent.purpose, intent.order_id ?? String(intent.listing_id ?? "")))
  revalidatePath("/account")
  return { ok: true }
}
