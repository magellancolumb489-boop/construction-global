import { createClient } from "@/lib/supabase/server"

export interface SellerDashboard {
  activeListings: number
  totalListings: number
  activeAuctions: number
  liveAuctions: number
  totalBids30d: number
  lifetimeRevenue: number
  avgRating: number
  reviewsCount: number
  pendingPayouts: number
  unreadMessages: number
}

// Aggregate KPIs for the seller dashboard. Everything runs under the caller's
// RLS, so the numbers automatically stay scoped to their own data.
export async function getSellerDashboard(): Promise<SellerDashboard> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return empty()

  const [listingsActive, listingsTotal, reviewsRes, unreadRes] = await Promise.all([
    supabase
      .from("marketplace_listings")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", user.id)
      .eq("is_active", true),
    supabase
      .from("marketplace_listings")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", user.id),
    supabase.from("reviews").select("rating").eq("target_user_id", user.id),
    countUnreadMessagesForUser(user.id),
  ])

  const reviewRows = reviewsRes.data ?? []
  const avg =
    reviewRows.length > 0
      ? reviewRows.reduce((sum, r) => sum + r.rating, 0) / reviewRows.length
      : 0

  return {
    activeListings: listingsActive.count ?? 0,
    totalListings: listingsTotal.count ?? 0,
    activeAuctions: 0,
    liveAuctions: 0,
    totalBids30d: 0,
    lifetimeRevenue: 0,
    avgRating: avg,
    reviewsCount: reviewRows.length,
    pendingPayouts: 0,
    unreadMessages: unreadRes,
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
    activeAuctions: 0,
    liveAuctions: 0,
    totalBids30d: 0,
    lifetimeRevenue: 0,
    avgRating: 0,
    reviewsCount: 0,
    pendingPayouts: 0,
    unreadMessages: 0,
  }
}
