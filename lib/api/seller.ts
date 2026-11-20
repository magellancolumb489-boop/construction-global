import { createClient } from "@/lib/supabase/server"

export interface SellerDashboard {
  activeListings: number
  totalListings: number
  /** Orders received in the last 30 days (not cancelled). */
  orders30d: number
  /** Orders waiting for the seller (transport to schedule / failed delivery). */
  ordersToHandle: number
  /** Seller share (goods + seller transport + seller VAT) of non-cancelled orders, all time. */
  lifetimeRevenue: number
  /** Seller share of paid orders not yet delivered + delivered orders (to be settled by the platform). */
  pendingPayouts: number
  avgRating: number
  reviewsCount: number
  unreadMessages: number
  currency: string
}

// Aggregate KPIs for the seller dashboard. Everything runs under the caller's
// RLS, so the numbers automatically stay scoped to their own data.
export async function getSellerDashboard(): Promise<SellerDashboard> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return empty()

  const [listingsActive, listingsTotal, reviewsRes, unreadRes, ordersRes] = await Promise.all([
    supabase
      .from("marketplace_listings")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", user.id)
      .is("deleted_at", null)
      .eq("is_active", true),
    supabase
      .from("marketplace_listings")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", user.id)
      .is("deleted_at", null),
    supabase.from("reviews").select("rating").eq("target_user_id", user.id),
    countUnreadMessagesForUser(user.id),
    // Bounded: KPIs over the latest 1000 sales (max_rows); enough until volume needs an RPC.
    supabase
      .from("orders")
      .select("created_at, status, payment_status, currency, subtotal_cents, transport_cents, seller_vat_cents, vat_cents, order_transport(status)")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1000),
  ])

  const reviewRows = reviewsRes.data ?? []
  const avg =
    reviewRows.length > 0
      ? reviewRows.reduce((sum, r) => sum + r.rating, 0) / reviewRows.length
      : 0

  const since = Date.now() - 30 * 24 * 60 * 60 * 1000
  let orders30d = 0
  let toHandle = 0
  let revenueCents = 0
  let payoutCents = 0
  let currency = "RON"
  for (const o of ordersRes.data ?? []) {
    if (o.status === "cancelled" || o.status === "refunded") continue
    currency = o.currency
    const share = Number(o.subtotal_cents) + Number(o.transport_cents) + Number(o.seller_vat_cents || o.vat_cents)
    revenueCents += share
    if (new Date(o.created_at).getTime() >= since) orders30d++
    const tRaw = o.order_transport as unknown
    const t = (Array.isArray(tRaw) ? tRaw[0] : tRaw) as { status: string } | null
    if (t && (t.status === "included" || t.status === "failed")) toHandle++
    if (o.payment_status === "paid" || o.payment_status === "demo_paid") payoutCents += share
  }

  return {
    activeListings: listingsActive.count ?? 0,
    totalListings: listingsTotal.count ?? 0,
    orders30d,
    ordersToHandle: toHandle,
    lifetimeRevenue: revenueCents / 100,
    pendingPayouts: payoutCents / 100,
    avgRating: avg,
    reviewsCount: reviewRows.length,
    unreadMessages: unreadRes,
    currency,
  }
}

async function countUnreadMessagesForUser(userId: string): Promise<number> {
  const supabase = await createClient()
  const { data: threads } = await supabase
    .from("message_threads")
    .select("id")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
  const ids = (threads ?? []).map((t) => t.id)
  if (ids.length === 0) return 0
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("thread_id", ids)
    .is("read_at", null)
    .neq("sender_id", userId)
  return count ?? 0
}

function empty(): SellerDashboard {
  return {
    activeListings: 0,
    totalListings: 0,
    orders30d: 0,
    ordersToHandle: 0,
    lifetimeRevenue: 0,
    pendingPayouts: 0,
    avgRating: 0,
    reviewsCount: 0,
    unreadMessages: 0,
    currency: "RON",
  }
}
