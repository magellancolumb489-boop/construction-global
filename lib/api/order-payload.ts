"use server"

import { createClient } from "@/lib/supabase/server"
import type { PlacedOrder } from "@/app/checkout/actions"

// Reconstructs the PlacedOrder shape (the one the deviz UI / emails consume)
// from real Supabase rows. Used by the order detail / deviz pages to keep the
// view layer 100% identical to the freshly-placed flow at checkout.
export async function getPlacedOrderById(id: string): Promise<PlacedOrder | null> {
  if (!id) return null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      id, order_number, deviz_number, buyer_id, seller_id,
      currency, subtotal_cents, transport_cents, vat_cents, total_cents,
      status, payment_status, payment_provider,
      notes, billing_json, shipping_json, buyer_snapshot, seller_snapshot,
      created_at,
      order_lines (
        id, listing_id, title, unit, qty,
        unit_price_cents, transport_cents, line_total_cents, snapshot_json
      )
      `,
    )
    .eq("id", id)
    .maybeSingle()

  if (error || !data) return null

  // Normalize nullable text columns to non-null strings the way the RPC would.
  return {
    id: data.id,
    order_number: data.order_number ?? "",
    deviz_number: data.deviz_number ?? "",
    buyer_id: data.buyer_id,
    seller_id: data.seller_id,
    currency: data.currency,
    subtotal_cents: Number(data.subtotal_cents ?? 0),
    transport_cents: Number(data.transport_cents ?? 0),
    vat_cents: Number(data.vat_cents ?? 0),
    total_cents: Number(data.total_cents ?? 0),
    status: data.status,
    payment_status: data.payment_status,
    payment_provider: data.payment_provider,
    notes: data.notes ?? null,
    billing_json: (data.billing_json ?? null) as Record<string, unknown> | null,
    shipping_json: (data.shipping_json ?? null) as Record<string, unknown> | null,
    buyer_snapshot: (data.buyer_snapshot ?? null) as Record<string, unknown> | null,
    seller_snapshot: (data.seller_snapshot ?? null) as Record<string, unknown> | null,
    created_at: data.created_at,
    lines: (data.order_lines ?? []).map((l) => ({
      id: Number(l.id),
      listing_id: l.listing_id,
      title: l.title,
      unit: l.unit,
      qty: Number(l.qty),
      unit_price_cents: Number(l.unit_price_cents),
      transport_cents: Number(l.transport_cents),
      line_total_cents: Number(l.line_total_cents),
      snapshot_json: (l.snapshot_json ?? null) as Record<string, unknown> | null,
    })),
  }
}
