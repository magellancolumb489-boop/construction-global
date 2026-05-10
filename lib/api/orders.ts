"use server"

import { createClient } from "@/lib/supabase/server"
import type {
  Currency,
  OrderDetail,
  OrderStatus,
  OrderSummary,
  PaymentStatus,
  CartItem,
} from "@/types/domain"

// Server actions exposed to client tabs. createCheckout was removed —
// new code must use placeOrderAction in app/checkout/actions.ts.

// DB stores statuses lowercase ('pending', 'paid', ...). The shared
// StatusBadge / OrderStatus enum uses uppercase ('PENDING', 'PAID'). Map
// once here so the rest of the UI keeps the existing typings.
function mapOrderStatus(raw: string): OrderStatus {
  switch (raw) {
    case "paid":
    case "fulfilled":
      return "FULFILLED"
    case "cancelled":
    case "refunded":
      return "CANCELLED"
    default:
      return "PENDING"
  }
}

function mapPaymentStatus(raw: string): PaymentStatus {
  switch (raw) {
    case "paid":
    case "demo_paid":
      return "PAID"
    case "failed":
      return "FAILED"
    case "refunded":
      return "REFUNDED"
    default:
      return "PENDING"
  }
}

function centsToUnits(c: number | null | undefined): number {
  return (c ?? 0) / 100
}

export async function getOrders(): Promise<OrderSummary[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  // RLS guarantees we only see orders where auth.uid() in (buyer_id, seller_id).
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, created_at, status, payment_status, currency, total_cents, order_lines(id)",
    )
    .order("created_at", { ascending: false })

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    status: mapOrderStatus(row.status),
    paymentStatus: mapPaymentStatus(row.payment_status),
    total: centsToUnits(row.total_cents),
    currency: (row.currency as Currency) ?? "RON",
    itemCount: Array.isArray(row.order_lines) ? row.order_lines.length : 0,
  }))
}

interface ShippingJsonShape {
  recipient?: string | null
  phone?: string | null
  address_line1?: string | null
  city?: string | null
  county?: string | null
  country?: string | null
}

export async function getOrderDetail(id: string): Promise<OrderDetail | null> {
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
      id, order_number, deviz_number, created_at, status, payment_status,
      currency, subtotal_cents, transport_cents, vat_cents, total_cents,
      notes, shipping_json,
      order_lines (
        id, listing_id, title, unit, qty,
        unit_price_cents, transport_cents, line_total_cents, snapshot_json
      )
      `,
    )
    .eq("id", id)
    .maybeSingle()

  if (error || !data) return null

  const ship = (data.shipping_json ?? null) as ShippingJsonShape | null

  // Map order_lines back into the cart-shaped CartItem so the existing detail UI
  // can render without needing a new template. Everything is approximate (we no
  // longer have thumbnailUrl / availableQty), so we synthesize neutral values.
  const items: CartItem[] = (data.order_lines ?? []).map((line) => {
    const snap = (line.snapshot_json ?? {}) as Record<string, unknown>
    const currency = ((snap["currency"] as string | undefined) ?? data.currency ?? "RON") as Currency
    return {
      productId: line.listing_id != null ? String(line.listing_id) : `line-${line.id}`,
      name: line.title,
      price: centsToUnits(line.unit_price_cents),
      unit: line.unit as CartItem["unit"],
      currency,
      qty: Number(line.qty ?? 0),
      availableQty: Number(line.qty ?? 0),
      thumbnailUrl: "",
      transportFee: centsToUnits(line.transport_cents),
    }
  })

  return {
    id: data.id,
    createdAt: data.created_at,
    status: mapOrderStatus(data.status),
    paymentStatus: mapPaymentStatus(data.payment_status),
    total: centsToUnits(data.total_cents),
    currency: (data.currency as Currency) ?? "RON",
    itemCount: items.length,
    items,
    shippingAddress: ship?.address_line1
      ? {
          line1: ship.address_line1 ?? "",
          city: ship.city ?? "",
          county: ship.county ?? "",
          country: ship.country ?? "",
        }
      : undefined,
    notes: data.notes ?? undefined,
  }
}
