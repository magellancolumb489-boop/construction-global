"use server"

import { createClient } from "@/lib/supabase/server"
import { getPaymentsMode } from "@/lib/payments/mode"
import {
  createStripeCheckoutSession,
  type OrderPayloadForStripe,
} from "@/lib/payments/stripe-stub"
import type { Json } from "@/types/supabase"
import { getPlacedOrderById } from "@/lib/api/order-payload"
import { sendOrderEmails } from "@/lib/email/send-order-emails"

// Form data captured at /checkout (Date de contact + Adresa de livrare).
export interface CheckoutFormInput {
  name: string
  email: string
  phone: string
  isCompany: boolean
  companyName?: string
  vatNumber?: string
  addressLine1?: string
  city?: string
  county?: string
  country?: string
  notes?: string
}

// Cart line we accept from the client. Only listing_id + qty are trusted; the
// rest is recomputed inside place_order. Concrete picks (class/consistency) are
// passed through so the RPC can validate the unit price against the published
// per-consistency prices on marketplace_listing_concrete_classes.
export interface CheckoutCartItem {
  listing_id: number
  qty: number
  concrete_class_code?: string
  concrete_consistency?: string
  // unit_price_cents is ONLY honored as a fallback inside the RPC for concrete
  // when no published row exists; non-concrete listings always use DB price.
  unit_price_cents?: number
  configure_delivery?: Record<string, unknown>
  configure_billing?: Record<string, unknown>
  quote_summary?: Record<string, unknown>
  /** Materiale cu logistics — validate în place_order când există spec în DB. */
  materials_vehicle_code?: string
  materials_payload_t?: number
  materials_trips?: number
  materials_macara_addon?: boolean
  materials_pallet_count?: number | null
}

// Snapshot the deviz preview / emails consume directly. Mirrors the JSON
// returned by public.place_order so the client never has to refetch.
export interface PlacedOrderLine {
  id: number
  listing_id: number | null
  title: string
  unit: string
  qty: number
  unit_price_cents: number
  transport_cents: number
  line_total_cents: number
  snapshot_json: Record<string, unknown> | null
}

export interface PlacedOrder {
  id: string
  order_number: string
  deviz_number: string
  buyer_id: string
  seller_id: string
  currency: string
  subtotal_cents: number
  transport_cents: number
  vat_cents: number
  total_cents: number
  status: string
  payment_status: string
  payment_provider: string
  notes: string | null
  billing_json: Record<string, unknown> | null
  shipping_json: Record<string, unknown> | null
  buyer_snapshot: Record<string, unknown> | null
  seller_snapshot: Record<string, unknown> | null
  created_at: string
  lines: PlacedOrderLine[]
}

export type PlaceOrderResult =
  | { success: true; order: PlacedOrder; redirectTo?: string }
  | { success: false; error: string }

function generateIdempotencyKey(): string {
  // crypto.randomUUID is available in the Edge / Node 18+ runtime Next.js uses.
  return globalThis.crypto?.randomUUID?.() ?? `ck-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function buildBillingJson(input: CheckoutFormInput): Json {
  return {
    name: input.name,
    email: input.email,
    phone: input.phone,
    is_company: input.isCompany,
    company_name: input.isCompany ? input.companyName ?? null : null,
    vat_number: input.isCompany ? input.vatNumber ?? null : null,
    address_line1: input.addressLine1 ?? null,
    city: input.city ?? null,
    county: input.county ?? null,
    country: input.country ?? null,
  }
}

function buildShippingJson(input: CheckoutFormInput): Json {
  return {
    recipient: input.name,
    phone: input.phone,
    address_line1: input.addressLine1 ?? null,
    city: input.city ?? null,
    county: input.county ?? null,
    country: input.country ?? null,
  }
}

/** Non-blocking Resend send after checkout — failures never fail the order. */
function scheduleOrderConfirmationEmails(order: PlacedOrder): void {
  if (!process.env.RESEND_API_KEY?.trim()) return
  void sendOrderEmails(order).catch((err) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[checkout] order confirmation emails failed:", err)
    }
  })
}

function normalizeCart(items: CheckoutCartItem[]): Json {
  // Strip everything except the fields the RPC understands. Defensive: rejects
  // any obvious junk shapes early so we get a clean Romanian error in the UI.
  return items.map((item) => ({
    listing_id: Number(item.listing_id),
    qty: Number(item.qty),
    concrete_class_code: item.concrete_class_code ?? null,
    concrete_consistency: item.concrete_consistency ?? null,
    unit_price_cents:
      typeof item.unit_price_cents === "number" && Number.isFinite(item.unit_price_cents)
        ? Math.round(item.unit_price_cents)
        : null,
    configure_delivery: item.configure_delivery ?? null,
    configure_billing: item.configure_billing ?? null,
    quote_summary: item.quote_summary ?? null,
    materials_vehicle_code: item.materials_vehicle_code ?? null,
    materials_payload_t:
      typeof item.materials_payload_t === "number" && Number.isFinite(item.materials_payload_t)
        ? item.materials_payload_t
        : null,
    materials_trips:
      typeof item.materials_trips === "number" && Number.isFinite(item.materials_trips)
        ? Math.round(item.materials_trips)
        : null,
    materials_macara_addon: item.materials_macara_addon ?? false,
    materials_pallet_count:
      item.materials_pallet_count != null && Number.isFinite(Number(item.materials_pallet_count))
        ? Number(item.materials_pallet_count)
        : null,
  })) as Json
}

export async function placeOrderAction(
  form: CheckoutFormInput,
  cart: CheckoutCartItem[],
): Promise<PlaceOrderResult> {
  if (!cart || cart.length === 0) {
    return { success: false, error: "Coșul este gol." }
  }
  if (!form.name?.trim() || !form.email?.trim() || !form.phone?.trim()) {
    return { success: false, error: "Completează numele, emailul și telefonul." }
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) {
    return { success: false, error: "Nu ești autentificat. Reconectează-te și încearcă din nou." }
  }

  const idempotencyKey = generateIdempotencyKey()

  const { data, error } = await supabase.rpc("place_order", {
    p_cart: normalizeCart(cart),
    p_billing: buildBillingJson(form),
    p_shipping: buildShippingJson(form),
    p_notes: form.notes ?? null,
    p_idempotency_key: idempotencyKey,
  })

  if (error) {
    return { success: false, error: humanizeRpcError(error.message) }
  }
  if (!data) {
    return { success: false, error: "Răspuns invalid de la server." }
  }

  const order = data as unknown as PlacedOrder

  // Phase 2: branch on the payment provider. Stripe path stays unreachable in
  // demo mode (the stub throws if invoked) but the seam is in place so the
  // future switch is one env var.
  if (getPaymentsMode() === "stripe") {
    try {
      const session = await createStripeCheckoutSession(order as unknown as OrderPayloadForStripe)
      await supabase
        .from("orders")
        .update({
          stripe_session_id: session.id,
          payment_status: "pending",
          payment_provider: "stripe",
        })
        .eq("id", order.id)
      scheduleOrderConfirmationEmails(order)
      return { success: true, order, redirectTo: session.url }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Eroare la inițializarea Stripe."
      return { success: false, error: msg }
    }
  }

  scheduleOrderConfirmationEmails(order)
  return { success: true, order }
}

export type SendOrderEmailsActionResult =
  | {
      ok: true
      buyerSent: boolean
      sellerSent: boolean
      messages?: string[]
    }
  | { ok: false; error: string }

/** Re-send order emails (buyer + seller when possible). Buyer, seller, or admin only. */
export async function sendOrderEmailsAction(
  orderId: string,
): Promise<SendOrderEmailsActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: "Nu ești autentificat." }
  }

  const order = await getPlacedOrderById(orderId)
  if (!order) {
    return { ok: false, error: "Comanda nu a fost găsită." }
  }

  const { data: isAdmin } = await supabase.rpc("is_admin")
  const allowed =
    user.id === order.buyer_id || user.id === order.seller_id || isAdmin === true
  if (!allowed) {
    return {
      ok: false,
      error: "Nu ai permisiunea să retrimiți emailurile pentru această comandă.",
    }
  }

  if (!process.env.RESEND_API_KEY?.trim()) {
    return {
      ok: false,
      error:
        "Configurează RESEND_API_KEY în .env.local (înlocuiește re_xxxxxxxxx cu cheia ta reală Resend).",
    }
  }

  const sendResult = await sendOrderEmails(order)
  if (!sendResult.buyerSent && !sendResult.sellerSent) {
    const detail = sendResult.messages.filter(Boolean).join(" ")
    return {
      ok: false,
      error: detail || "Trimiterea emailurilor a eșuat.",
    }
  }

  return {
    ok: true,
    buyerSent: sendResult.buyerSent,
    sellerSent: sendResult.sellerSent,
    messages: sendResult.messages.length ? sendResult.messages : undefined,
  }
}

// Translate a few common Postgres error fragments into Romanian copy that
// matches the rest of the marketplace UI. Anything else gets surfaced verbatim
// so a developer can still debug.
function humanizeRpcError(raw: string | undefined | null): string {
  const msg = raw ?? ""
  if (/not authenticated/i.test(msg)) return "Nu ești autentificat."
  if (/empty cart/i.test(msg)) return "Coșul este gol."
  if (/multiple sellers/i.test(msg)) return "Coșul conține produse de la mai mulți furnizori. Plasează comenzi separate."
  if (/mixed currencies/i.test(msg)) return "Coșul conține produse cu monede diferite."
  if (/min_order_qty/i.test(msg)) return "Cantitate sub minimul de comandă pentru un produs din coș."
  if (/available_qty/i.test(msg)) return "Cantitate peste stocul disponibil pentru un produs din coș."
  if (/no longer active/i.test(msg)) return "Un produs din coș nu mai este activ."
  if (/no published price for concrete/i.test(msg)) return "Preț nepublicat pentru clasa/consistența aleasă."
  if (/materials cart line missing vehicle/i.test(msg))
    return "Lipsește vehiculul de transport pentru un material din coș. Reconfigurează comanda."
  if (/materials cart line missing payload/i.test(msg))
    return "Lipsește capacitatea vehiculului (tone) pentru un material din coș. Reconfigurează comanda."
  if (/materials cart line missing trips/i.test(msg))
    return "Lipsește numărul de curse pentru un material din coș. Reconfigurează comanda."
  if (/materials trips invalid/i.test(msg)) return "Număr de curse invalid pentru un material din coș."
  if (/materials trips below minimum/i.test(msg))
    return "Numărul de curse este sub minimul necesar pentru cantitatea aleasă. Reconfigurează comanda."
  if (/invalid vehicle payload for listing/i.test(msg))
    return "Combinația vehicul / tonaj nu este permisă pentru un material din coș."
  if (/vehicle not offered by seller for listing/i.test(msg))
    return "Vehiculul ales nu este oferit de vânzător. Reconfigurează comanda."
  if (/vehicle not allowed for marketplace-assigned listing/i.test(msg))
    return "Vehiculul ales nu este permis pentru acest anunț. Reconfigurează comanda."
  if (/macara not available for listing/i.test(msg))
    return "Opțiunea macara nu este disponibilă pentru un produs din coș."
  if (/listing .* not found/i.test(msg)) return "Un produs din coș nu mai există."
  return msg || "Eroare necunoscută la salvarea comenzii."
}
