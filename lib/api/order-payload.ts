"use server"

import { createClient } from "@/lib/supabase/server"
import type { OrderTransport, PlacedOrder } from "@/app/checkout/actions"
import type { TransportEvent } from "@/components/orders/transport-panel"

export type PlacedOrderWithEvents = PlacedOrder & { transport_events: TransportEvent[] }

// Reconstructs the PlacedOrder shape (the one the proforma UI / emails consume)
// from real Supabase rows, RLS-scoped to buyer / seller / admin.
export async function getPlacedOrderById(id: string): Promise<PlacedOrderWithEvents | null> {
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
      id, order_number, deviz_number, platform_doc_number, buyer_id, seller_id,
      currency, subtotal_cents, transport_cents, vat_cents, total_cents,
      commission_rate, commission_cents, seller_vat_cents, platform_vat_cents, vat_rate,
      payment_due_at, status, payment_status, payment_provider,
      notes, billing_json, shipping_json, buyer_snapshot, seller_snapshot, platform_snapshot,
      created_at,
      order_lines (
        id, listing_id, title, unit, qty,
        unit_price_cents, transport_cents, line_total_cents, commission_cents, snapshot_json
      ),
      order_transport (*),
      order_transport_events (id, from_status, to_status, action, actor_role, note, created_at)
      `,
    )
    .eq("id", id)
    .maybeSingle()

  if (error || !data) return null

  const transportRaw = data.order_transport as unknown
  const transport = (Array.isArray(transportRaw) ? transportRaw[0] : transportRaw) as OrderTransport | null

  return {
    id: data.id,
    order_number: data.order_number ?? "",
    deviz_number: data.deviz_number ?? "",
    platform_doc_number: data.platform_doc_number ?? null,
    buyer_id: data.buyer_id,
    seller_id: data.seller_id,
    currency: data.currency,
    subtotal_cents: Number(data.subtotal_cents ?? 0),
    transport_cents: Number(data.transport_cents ?? 0),
    vat_cents: Number(data.vat_cents ?? 0),
    total_cents: Number(data.total_cents ?? 0),
    commission_rate: Number(data.commission_rate ?? 0),
    commission_cents: Number(data.commission_cents ?? 0),
    seller_vat_cents: Number(data.seller_vat_cents ?? 0),
    platform_vat_cents: Number(data.platform_vat_cents ?? 0),
    vat_rate: data.vat_rate == null ? null : Number(data.vat_rate),
    payment_due_at: data.payment_due_at ?? null,
    status: data.status,
    payment_status: data.payment_status,
    payment_provider: data.payment_provider,
    notes: data.notes ?? null,
    billing_json: (data.billing_json ?? null) as Record<string, unknown> | null,
    shipping_json: (data.shipping_json ?? null) as Record<string, unknown> | null,
    buyer_snapshot: (data.buyer_snapshot ?? null) as Record<string, unknown> | null,
    seller_snapshot: (data.seller_snapshot ?? null) as Record<string, unknown> | null,
    platform_snapshot: (data.platform_snapshot ?? null) as Record<string, unknown> | null,
    created_at: data.created_at,
    transport: transport ?? null,
    transport_events: ((data.order_transport_events ?? []) as TransportEvent[]).sort(
      (a, b) => a.created_at.localeCompare(b.created_at),
    ),
    lines: (data.order_lines ?? []).map((l) => ({
      id: Number(l.id),
      listing_id: l.listing_id,
      title: l.title,
      unit: l.unit,
      qty: Number(l.qty),
      unit_price_cents: Number(l.unit_price_cents),
      transport_cents: Number(l.transport_cents),
      line_total_cents: Number(l.line_total_cents),
      commission_cents: Number(l.commission_cents ?? 0),
      snapshot_json: (l.snapshot_json ?? null) as Record<string, unknown> | null,
    })),
  }
}
