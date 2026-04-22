import { createClient } from "@/lib/supabase/server"
import type { Tables } from "@/types/supabase"

export type Review = Tables<"reviews">

export interface ReviewWithContext extends Review {
  reviewer_display_name: string | null
  target_display_name: string | null
  listing_title: string | null
  auction_title: string | null
}

export interface RatingSummary {
  average: number
  count: number
  distribution: Record<1 | 2 | 3 | 4 | 5, number>
}

// Reviews authored by the current user (toward other sellers).
export async function getReviewsGiven(limit = 50): Promise<ReviewWithContext[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("reviewer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("getReviewsGiven error:", error.message)
    return []
  }
  return hydrateReviews(data ?? [])
}

// Reviews written about a specific seller (or the caller if userId omitted).
export async function getReviewsReceived(
  userId?: string,
  limit = 50,
): Promise<ReviewWithContext[]> {
  const supabase = await createClient()
  let targetId = userId
  if (!targetId) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return []
    targetId = user.id
  }

  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("target_user_id", targetId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("getReviewsReceived error:", error.message)
    return []
  }
  return hydrateReviews(data ?? [])
}

// Aggregate rating summary for a seller. Public-readable by RLS.
export async function getSellerRatingSummary(userId: string): Promise<RatingSummary> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("reviews")
    .select("rating")
    .eq("target_user_id", userId)

  if (error) {
    console.error("getSellerRatingSummary error:", error.message)
    return { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }
  }

  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let total = 0
  for (const row of data ?? []) {
    const r = Math.max(1, Math.min(5, Math.round(row.rating))) as 1 | 2 | 3 | 4 | 5
    distribution[r] += 1
    total += r
  }
  const count = (data ?? []).length
  return {
    average: count > 0 ? total / count : 0,
    count,
    distribution,
  }
}

// Resolves display names + context titles in bulk (at most 4 small queries).
async function hydrateReviews(rows: Review[]): Promise<ReviewWithContext[]> {
  if (rows.length === 0) return []
  const supabase = await createClient()

  const profileIds = Array.from(
    new Set(
      rows.flatMap((r) => [r.reviewer_id, r.target_user_id]).filter((v): v is string => !!v),
    ),
  )
  const listingIds = Array.from(
    new Set(rows.map((r) => r.listing_id).filter((v): v is number => v != null)),
  )
  const auctionIds = Array.from(
    new Set(rows.map((r) => r.auction_id).filter((v): v is number => v != null)),
  )

  const [profilesRes, listingsRes, auctionsRes] = await Promise.all([
    profileIds.length > 0
      ? supabase.from("profiles").select("id, display_name").in("id", profileIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string | null }[] }),
    listingIds.length > 0
      ? supabase.from("marketplace_listings").select("id, title").in("id", listingIds)
      : Promise.resolve({ data: [] as { id: number; title: string }[] }),
    auctionIds.length > 0
      ? supabase.from("auction_lots").select("id, title").in("id", auctionIds)
      : Promise.resolve({ data: [] as { id: number; title: string }[] }),
  ])

  const profileMap = new Map<string, string | null>()
  for (const p of profilesRes.data ?? []) profileMap.set(p.id, p.display_name)
  const listingMap = new Map<number, string>()
  for (const l of listingsRes.data ?? []) listingMap.set(l.id, l.title)
  const auctionMap = new Map<number, string>()
  for (const a of auctionsRes.data ?? []) auctionMap.set(a.id, a.title)

  return rows.map((row) => ({
    ...row,
    reviewer_display_name: profileMap.get(row.reviewer_id) ?? null,
    target_display_name: profileMap.get(row.target_user_id) ?? null,
    listing_title: row.listing_id != null ? listingMap.get(row.listing_id) ?? null : null,
    auction_title: row.auction_id != null ? auctionMap.get(row.auction_id) ?? null : null,
  }))
}
