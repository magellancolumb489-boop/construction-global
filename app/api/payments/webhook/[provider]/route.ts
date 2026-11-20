import { NextRequest, NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import { getProvider, isProviderId } from "@/lib/payments/registry"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Payment webhooks: POST /api/payments/webhook/<provider>
 *
 * 1. The provider adapter verifies the signature and normalizes the event.
 * 2. public.record_payment_event applies it (idempotent on the provider event
 *    id, checks amount + currency against the intent, then marks the order /
 *    transport / subscription / listing as paid).
 *
 * No service-role key: the RPC is gated by PAYMENTS_WEBHOOK_DB_SECRET, whose
 * SHA-256 lives in private.app_secrets (set once in the SQL editor).
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider: providerParam } = await ctx.params
  if (!isProviderId(providerParam) || providerParam === "demo") {
    return NextResponse.json({ error: "unknown provider" }, { status: 404 })
  }
  const secret = process.env.PAYMENTS_WEBHOOK_DB_SECRET
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!secret || !url || !key) {
    console.error("[payments-webhook] missing PAYMENTS_WEBHOOK_DB_SECRET or Supabase env")
    return NextResponse.json({ error: "not configured" }, { status: 503 })
  }

  const provider = getProvider(providerParam)
  const rawBody = await req.text()

  let event
  try {
    event = await provider.parseWebhook(rawBody, req.headers)
  } catch (err) {
    // Bad signature or unimplemented provider: never touch the DB.
    console.warn(`[payments-webhook] ${providerParam} rejected:`, err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "invalid webhook" }, { status: 400 })
  }
  if (!event) return NextResponse.json({ received: true, ignored: true })

  // Session-less client: the webhook has no user; the DB secret is the gate.
  const supabase = createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase.rpc("record_payment_event", {
    p_secret: secret,
    p_provider: providerParam,
    p_event_id: event.eventId,
    p_intent_id: event.intentId,
    p_provider_ref: event.providerRef,
    p_status: event.status,
    p_amount_cents: event.amountCents,
    p_currency: event.currency,
    p_raw: event.raw as Database["public"]["Functions"]["record_payment_event"]["Args"]["p_raw"],
  })
  if (error) {
    // 500 makes the provider retry; the RPC is idempotent so retries are safe.
    console.error(`[payments-webhook] record_payment_event failed:`, error.message)
    return NextResponse.json({ error: "processing failed" }, { status: 500 })
  }
  return NextResponse.json({ received: true, result: data })
}
